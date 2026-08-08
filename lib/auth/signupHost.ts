import { supabase } from '@/lib/supabase';

type SignupHostInput = {
  accountName: string;
  email: string;
  password: string;
};

type SignupHostResult = {
  userId: string;
  accountId: string;
  emailConfirmationRequired: boolean;
};

export async function signupHost({
  accountName,
  email,
  password,
}: SignupHostInput): Promise<SignupHostResult> {
  const cleanAccountName = accountName.trim();
  const cleanEmail = email.trim();

  if (!cleanAccountName || !cleanEmail || !password) {
    throw new Error(
      'Enter your account name, email address, and password.'
    );
  }

  if (password.length < 6) {
    throw new Error(
      'Your password must be at least 6 characters.'
    );
  }

  const {
    data: authData,
    error: authError,
  } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (authError) {
    throw authError;
  }

  const user = authData.user;

  if (!user) {
    return {
      userId: '',
      accountId: '',
      emailConfirmationRequired: true,
    };
  }

  const accountId = crypto.randomUUID();

  const { error: accountError } = await supabase
    .from('accounts')
    .insert({
      id: accountId,
      name: cleanAccountName || 'My StageVotes Account',
    });

  if (accountError) {
    throw accountError;
  }

  const { error: accountUserError } = await supabase
    .from('account_users')
    .insert({
      account_id: accountId,
      user_id: user.id,
      role: 'owner',
    });

  if (accountUserError) {
    throw accountUserError;
  }

  return {
    userId: user.id,
    accountId,
    emailConfirmationRequired: false,
  };
}