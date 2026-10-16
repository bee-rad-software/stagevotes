import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { AuthError, requireStageVotesAccount } from '@/lib/server/stageVotesAuth';
import type { TrialReminderInfo } from '@/lib/trialReminder';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: Request) {
  try {
    const { account, role } = await requireStageVotesAccount(req);
    if (!['owner', 'admin'].includes(role) || !account.stripe_subscription_id || account.subscription_status === 'active') {
      return NextResponse.json({ reminder: null }, { headers });
    }
    const subscription = await stripe.subscriptions.retrieve(account.stripe_subscription_id);
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    if (customerId !== account.stripe_customer_id) {
      return NextResponse.json({ error: 'Unable to verify billing ownership.' }, { status: 403, headers });
    }
    const end = subscription.trial_end;
    if (!end) return NextResponse.json({ reminder: null }, { headers });
    const trialing = subscription.status === 'trialing';
    // Do not label a former paying subscriber's later cancellation as an expired trial.
    const expiredTrial = subscription.status === 'canceled' && end * 1000 <= Date.now() &&
      Boolean(subscription.ended_at && subscription.ended_at <= end + 3600);
    if (!trialing && !expiredTrial) return NextResponse.json({ reminder: null }, { headers });

    let hasPaymentMethod = Boolean(subscription.default_payment_method || subscription.default_source);
    if (trialing && !hasPaymentMethod) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        hasPaymentMethod = Boolean(customer.invoice_settings.default_payment_method || customer.default_source);
      }
    }
    const reminder: TrialReminderInfo = {
      state: trialing ? 'trialing' : 'expired',
      trialEndsAt: new Date(end * 1000).toISOString(),
      hasPaymentMethod,
      cancelScheduled: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    };
    return NextResponse.json({ reminder }, { headers });
  } catch (error) {
    console.error('Unable to load trial reminder:', error);
    return NextResponse.json({ error: 'Unable to load trial status.' }, {
      status: error instanceof AuthError ? error.status : 500, headers,
    });
  }
}
