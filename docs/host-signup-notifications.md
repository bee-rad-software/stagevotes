# New host signup email notifications

Recipient is fixed in server code to **brad@stagevotes.com**. No email is sent to the new customer. Signup means creation of a host account and its owner membership, not activation of a Stripe trial. Singer profiles do not trigger emails. Existing accounts are suppressed on rollout, including later additional owners. Trial status is captured at signup (usually incomplete); venue setup may not be finished yet. This does not send a second trial-activation email.

## Activate

1. In Resend, verify a sending domain you control and create a sending API key. Use the DNS records Resend supplies; do not replace existing email/MX records. This feature sends email through Resend, while your existing inbox continues to receive email normally.
2. In the StageVotes **app** Vercel project's Production environment variables, add:
   - `RESEND_API_KEY`: the sending key, server-only.
   - `SIGNUP_NOTIFICATION_FROM`: `StageVotes <support@stagevotes.com>` (must match your verified Resend domain).
   - `SIGNUP_NOTIFICATION_WEBHOOK_SECRET`: a long random secret used only for the Supabase webhook.
   - `CRON_SECRET`: a separate long random secret for Vercel's catch-up job. Reuse the existing cron secret if one is already configured.
   Existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are also required. Do not prefix any new key with NEXT_PUBLIC, paste keys into chat, or commit them.
3. Apply `supabase/migrations/20261023190000_host_signup_notifications.sql` in Supabase SQL Editor. Existing accounts receive suppressed entries; only future host accounts are queued. Rerunning is safe.
4. Redeploy the app after adding environment variables.
5. In Supabase Database Webhooks, create a webhook for **public.host_signup_notifications**, event **INSERT**. Set HTTP POST to `https://app.stagevotes.com/api/notifications/host-signup`. Add the header `Authorization: Bearer YOUR_SIGNUP_NOTIFICATION_WEBHOOK_SECRET` and `Content-Type: application/json`. Set timeout to 15000 milliseconds. The standard Supabase event payload is used.
6. Create a new test **host** through onboarding. Check brad@stagevotes.com and the Resend sending log. Confirm `sent_at` and `provider_id` on the new database notification row. A singer-only signup must not create a row. Suppressed rows from rollout will not send.

## Reliability and troubleshooting

A database outbox is written in the same transaction as the owner membership. Network sending is asynchronous through the webhook, so Resend outages do not make account creation wait on email. The endpoint loads a stored payload by account ID and never accepts a caller-supplied recipient, address, or email body. Both endpoints require secrets; direct client table/RPC access is denied.

Claims use a ten-minute lease and lock token. Failed sends wait fifteen minutes before retry. A Vercel cron checks up to five pending entries daily at 14:00 UTC; immediate notifications use the database webhook. Additional pending entries roll into the next run; for higher volume schedule more frequent batches on a hosting plan that supports them. To retry sooner, call the authenticated GET endpoint from a trusted terminal after next_attempt_at, without exposing CRON_SECRET. Missing email configuration returns 503 and preserves queued rows.

Resend's per-account idempotency key protects retries for 24 hours. The outbox's recorded sent_at prevents later replays. A provider-accepted send whose database acknowledgement is lost can duplicate if retried beyond that provider window; inspect provider logs before manually retrying ambiguous old deliveries. A provider ID means accepted by Resend, not guaranteed inbox delivery; use Resend delivery logs for bounces.

Useful SQL (no secrets):

```sql
select account_id, created_at, suppressed, sent_at, attempts, next_attempt_at, last_error
from public.host_signup_notifications order by created_at desc limit 20;
```

References: https://resend.com/docs/api-reference/emails/send-email ; https://resend.com/docs/dashboard/emails/idempotency-keys ; https://supabase.com/docs/guides/database/webhooks
