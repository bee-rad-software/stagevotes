import { timingSafeEqual } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/server/stageVotesAuth';
import { sendHostSignupNotification } from '@/lib/server/hostSignupNotification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request, secret: string | undefined) {
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from('Bearer ' + secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function dispatch(accountId: string | null, limit: number) {
  if (!process.env.RESEND_API_KEY || !process.env.SIGNUP_NOTIFICATION_FROM) {
    return Response.json({ error: 'Email notifications are not configured.' }, { status: 503 });
  }
  const admin = getSupabaseAdmin();
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { data, error } = await admin.rpc('claim_host_signup_notification', { p_account_id: accountId });
    if (error) throw new Error('Unable to claim signup notification.');
    const row = data?.[0];
    if (!row) break;
    try {
      const providerId = await sendHostSignupNotification(row.account_id, row.payload);
      const { data: recorded, error: saveError } = await admin.from('host_signup_notifications').update({
        sent_at: new Date().toISOString(), provider_id: providerId,
        locked_until: null, lock_token: null, last_error: null,
      }).eq('account_id', row.account_id).eq('lock_token', row.lock_token).select('account_id');
      if (saveError || !recorded?.length) throw new Error('Unable to record email delivery.');
      sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Notification failed.';
      await admin.from('host_signup_notifications').update({
        locked_until: null, lock_token: null, last_error: message,
        next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      }).eq('account_id', row.account_id).eq('lock_token', row.lock_token);
      // Do not log email contents, customer details, or provider response bodies.
      console.error('Host signup notification failed:', message);
      return Response.json({ error: 'Notification queued for retry.' }, { status: 502 });
    }
    if (i + 1 < limit) await new Promise(resolve => setTimeout(resolve, 600));
  }
  return Response.json({ sent });
}

// Supabase Database Webhook: INSERT on host_signup_notifications.
export async function POST(request: Request) {
  if (!authorized(request, process.env.SIGNUP_NOTIFICATION_WEBHOOK_SECRET)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (body?.type !== 'INSERT' || body?.schema !== 'public' || body?.table !== 'host_signup_notifications'
    || typeof body?.record?.account_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.record.account_id)) {
    return Response.json({ error: 'Invalid signup notification event.' }, { status: 400 });
  }
  try { return await dispatch(body.record.account_id, 1); }
  catch { return Response.json({ error: 'Unable to process notification.' }, { status: 500 }); }
}

// Daily catch-up for failed/missed webhook deliveries. Also safe to invoke manually.
export async function GET(request: Request) {
  if (!authorized(request, process.env.CRON_SECRET)) return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  try { return await dispatch(null, 5); }
  catch { return Response.json({ error: 'Unable to process notifications.' }, { status: 500 }); }
}
