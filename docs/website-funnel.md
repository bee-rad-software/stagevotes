# Website acquisition funnel
Code is dormant until a GA4 measurement ID is configured. Use the SAME web stream for the website and app.

## Activate
1. Google Analytics: create/select the StageVotes GA4 property; create a Web data stream for https://www.stagevotes.com.
2. Copy the Measurement ID (G-...). Set NEXT_PUBLIC_GA_MEASUREMENT_ID in Production for BOTH Vercel projects (stagevotes-website and stagevotes). Redeploy both because NEXT_PUBLIC values are embedded at build time.
3. In that web stream create a Measurement Protocol API secret. Set GA_API_SECRET in Production ONLY on the app project. Keep it server-only; do not use a NEXT_PUBLIC prefix or paste it in chat.
4. Turn OFF Enhanced Measurement for this stream. StageVotes explicitly sends sanitized page views and video events. Automatic history, form, outbound-link, and download collection would duplicate events or collect private URLs. Do not add a second Google tag, GTM tag, or Vercel custom-event implementation for this funnel.
5. Set data retention to the shortest useful period, and add stripe.com/checkout.stripe.com to the unwanted referrals list. Keep advertising features / Google signals off.
6. Mark trial_started and purchase as key events. Optionally register platform, placement, step, and payment_kind as event-scoped custom dimensions.

## Reports
Explore > Funnel exploration: page_view (website host), download_click, onboarding_started, sign_up, begin_checkout, trial_started, purchase (payment_kind=first_subscription_payment).
Use an OPEN funnel as not every visitor watches the demo or downloads: some hosts sign in, resume setup, or start directly in the app. Put video_start in a separate segment/comparison, not a required funnel step.
Break down download_click by platform (mac/windows) and placement. purchase records ONLY the first positive paid subscription invoice, not the free trial invoice or renewals. Stripe is the authoritative subscriber/revenue report.
Events also include onboarding_step, checkout_complete, download_started, video_complete, and demo_external_click. A YouTube link click is distinct from an actual embedded video start.

## Verify
Use GA Realtime with analytics allowed. Open website, play demo, click each download button, start onboarding.
Declining analytics should load no Google Analytics script and send no funnel events. The choice is shared across the stagevotes.com domain and can be changed using Analytics preferences.
Successful signup emits sign_up. Trial activation emits only after authenticated checkout verification, once per checkout per browser session. Retries / refreshes in that session are suppressed.
Actual purchases use signed LIVE Stripe invoice.paid webhooks, an opted-in browser ID saved at checkout, and invoice ID as transaction_id (Google purchase deduplication). Test-mode Stripe webhooks do not populate production purchase reports.
Do NOT perform an actual purchase just to test telemetry. Use Stripe sandbox/unit fixtures. After real trial conversions, compare first payments to Stripe.

## Limits
Only opted-in, unblocked browsers are counted. Signup completion and verified trials are browser events, so someone who never returns from Stripe may be missing. A free trial is not a paid customer.
Billing updates succeed independently of analytics; failed analytics delivery is best effort and not retried by this code. Google ingestion may reject events even with a successful HTTP response; use Realtime and the Measurement Protocol validation tool during setup.
Cross-device sessions and lost cookies are not merged. No names, emails, phone numbers, song entries, judge notes, card details, account IDs, or full query strings are sent as event fields.
Public website and app onboarding/download routes are tracked; host/singer/judge dashboards are excluded. Consent withdrawal stops browser analytics. A previously opted-in Stripe subscription identifier requires removal via support to stop future first-payment attribution; privacy page discloses this.
Existing open Stripe checkouts without matching analytics attribution are expired and recreated, preserving billing/subscription checks and platform selection.
