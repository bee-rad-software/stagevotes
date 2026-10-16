# Fourteen-day trials without a card

New host accounts activate a 14-day trial through the existing Stripe-hosted signup confirmation. Checkout uses payment_method_collection=if_required and trial_settings.end_behavior.missing_payment_method=cancel. No card is collected when the initial amount is zero. Stripe remains authoritative for access; the existing signed webhooks synchronize trialing, active, and canceled states to accounts.

Hosts can add a payment method using Account → Manage Subscription before expiration. Without one, Stripe cancels at trial end without billing. After expiration, Account → Subscribe opens paid Checkout. Stripe customer subscription history (or an existing account subscription ID) prevents a repeat trial.

Existing subscriptions and trial end dates are not modified. Open sessions from the old offer are expired when the host starts checkout again. New checkout policy metadata prevents reuse of a seven-day, card-required session. The Mac/Windows return path and download access gate are retained.

No database migration or Electron installer rebuild is needed. Deploy both app and marketing repositories. Enable trial-ending reminder emails and the Stripe-hosted payment update link in Stripe's Subscriptions and emails settings if desired; this code does not change dashboard email settings.

Validation: node --test tests/stripeTrial.test.cjs covers trial configuration, paid return, old/new open sessions, duplicate subscription rejection, and authentication. Live Stripe checkout, webhook delivery, expiration, and paid conversion still require a sandbox or live account test.

Stripe reference: https://docs.stripe.com/payments/checkout/free-trials?payment-ui=stripe-hosted
