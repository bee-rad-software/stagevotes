# In-app trial reminders

SVTrialReminder appears on Host Home and host account, tournament, analytics, and history screens that use SVShell. It does not appear on singer, voting, display, or live host control routes. It is an inline card, never a blocking dialog.

The card shows the trial end date and days remaining. Messaging changes at seven days, becomes urgent at three days, and shows a Subscribe action after an expired trial. Existing payment details and scheduled cancellation get separate billing copy. Active paying hosts do not receive trial promotions.

The authenticated, no-store /api/stripe/trial-status endpoint reads the account's Stripe subscription, checks customer ownership and account billing role, and checks subscription/customer default payment methods. The browser receives only reminder information. Data refreshes on page load, window focus, and every five minutes while visible. Billing failures cannot block the dashboard.

During a trial the CTA uses the existing billing portal to add payment details or review billing. After trial expiration it opens paid Checkout; the existing one-trial-per-account rule prevents a second free trial. No checkout or billing action occurs without a button click.

Validation: node --test tests/trialReminder.test.cjs covers date thresholds, payment details, cancellation, authorization, billing ownership, cache headers, expired trials, and former paying accounts. Targeted TypeScript and integration syntax/CSS checks also pass. Actual portal, card addition, and expiration should still be checked with a Stripe test account. No database migration, email provider, or Electron rebuild is required. These are in-app reminders; they do not send email or push notifications.
