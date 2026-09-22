import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

type StageVotesAccount = {
  id: string;
  name: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

let cachedSupabaseAdmin: SupabaseClient<any> | null = null;

export function getSupabaseAdmin() {
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return cachedSupabaseAdmin;
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export async function requireStageVotesAccount(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!accessToken) {
    throw new AuthError('Sign in is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    throw new AuthError('Your session is invalid or expired.');
  }

  const { data: accountUser, error: membershipError } =
    await supabaseAdmin
      .from('account_users')
      .select('account_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

  if (membershipError || !accountUser?.account_id) {
    throw new AuthError('No StageVotes account was found.', 403);
  }

  const { data: account, error: accountError } =
    await supabaseAdmin
      .from('accounts')
      .select(
        'id, name, subscription_status, stripe_customer_id, stripe_subscription_id'
      )
      .eq('id', accountUser.account_id)
      .maybeSingle();

  if (accountError || !account) {
    throw new AuthError('Unable to verify your StageVotes account.', 403);
  }

  return {
    user,
    account: account as StageVotesAccount,
    role: accountUser.role,
  };
}
