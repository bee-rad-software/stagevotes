import Stripe from 'stripe';

export function firstPaymentEligible(invoice: Stripe.Invoice, subscription: Stripe.Subscription) {
  return invoice.status === 'paid' && invoice.amount_paid > 0 &&
    ['subscription_create', 'subscription_cycle'].includes(invoice.billing_reason || '') &&
    /^\d+\.\d+$/.test(subscription.metadata.ga_client_id || '') &&
    /^\d+$/.test(subscription.metadata.ga_session_id || '');
}

// Analytics must never interrupt subscription synchronization.
export async function trackFirstSubscriptionPayment(stripe: Stripe, invoice: Stripe.Invoice, subscription: Stripe.Subscription) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  const secret = process.env.GA_API_SECRET;
  if (!/^G-[A-Z0-9]+$/.test(measurementId) || !secret || !firstPaymentEligible(invoice, subscription)) return;
  try {
    // A renewal is not another new subscriber. Iterate all older paid invoices.
    for await (const previous of stripe.invoices.list({
      subscription: subscription.id, status: 'paid', created: { lt: invoice.created }, limit: 100,
    }, { timeout: 3000, maxNetworkRetries: 0 })) {
      if (previous.amount_paid > 0) return;
    }
    const response = await fetch('https://www.google-analytics.com/mp/collect?' + new URLSearchParams({ measurement_id: measurementId, api_secret: secret }), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        client_id: subscription.metadata.ga_client_id,
        consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
        events: [{ name: 'purchase', params: {
          transaction_id: invoice.id,
          currency: invoice.currency.toUpperCase(), value: invoice.amount_paid / 100,
          session_id: Number(subscription.metadata.ga_session_id), engagement_time_msec: 1,
          payment_kind: 'first_subscription_payment',
          items: [{ item_id: 'stagevotes_host', item_name: 'StageVotes Host', quantity: 1, price: invoice.amount_paid / 100 }],
        } }],
      }),
    });
    if (!response.ok) console.warn('Subscription analytics delivery failed.');
  } catch { console.warn('Subscription analytics delivery unavailable. Billing synchronization succeeded independently.'); }
}
