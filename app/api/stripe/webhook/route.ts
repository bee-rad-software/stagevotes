import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/server/stageVotesAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function subscriptionEnd(subscription: Stripe.Subscription) {
  const value = (subscription as any).current_period_end;
  return value ? new Date(value * 1000).toISOString() : null;
}

async function updateAccountFromSubscription(
  subscription: Stripe.Subscription,
  fallbackAccountId?: string | null
) {
  const supabaseAdmin = getSupabaseAdmin();
  const accountId =
    subscription.metadata?.account_id || fallbackAccountId || null;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const values = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_ends_at: subscriptionEnd(subscription),
  };

  const query = supabaseAdmin.from('accounts').update(values);
  const { data, error } = accountId
    ? await query.eq('id', accountId).select('id')
    : await query.eq('stripe_subscription_id', subscription.id).select('id');

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error(
      `No StageVotes account matched Stripe subscription ${subscription.id}.`
    );
  }
}

async function subscriptionFromInvoice(invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  const subscriptionReference =
    invoiceData.subscription ??
    invoiceData.parent?.subscription_details?.subscription;

  const subscriptionId =
    typeof subscriptionReference === 'string'
      ? subscriptionReference
      : subscriptionReference?.id;

  return subscriptionId
    ? stripe.subscriptions.retrieve(subscriptionId)
    : null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature.' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Invalid Stripe signature.',
      },
      { status: 400 }
    );
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

      if (!subscriptionId) {
        throw new Error(`Checkout ${session.id} has no subscription.`);
      }

      const subscription =
        await stripe.subscriptions.retrieve(subscriptionId);

      await updateAccountFromSubscription(
        subscription,
        session.metadata?.account_id
      );
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await updateAccountFromSubscription(
        event.data.object as Stripe.Subscription
      );
    }

    if (
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      const subscription = await subscriptionFromInvoice(
        event.data.object as Stripe.Invoice
      );

      if (subscription) {
        await updateAccountFromSubscription(subscription);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed:`, error);

    return NextResponse.json(
      { error: 'Unable to synchronize the subscription.' },
      { status: 500 }
    );
  }
}
