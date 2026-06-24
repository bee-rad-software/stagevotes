import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();

  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const accountId = session.metadata?.account_id;
    const customerId = session.customer as string;

    if (accountId) {
      await supabase
  .from('accounts')
  .update({
    stripe_customer_id: customerId,
    stripe_subscription_id: session.subscription as string,
    subscription_status: 'active'
  })
  .eq('id', accountId);
    }
  }

if (event.type === 'customer.subscription.updated') {
  const subscription = event.data.object as Stripe.Subscription;

  await supabase
    .from('accounts')
    .update({
      subscription_status: subscription.status,
      subscription_ends_at: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null
    })
    .eq('stripe_subscription_id', subscription.id);
}

if (event.type === 'customer.subscription.deleted') {
  const subscription = event.data.object as Stripe.Subscription;

  await supabase
    .from('accounts')
    .update({
      subscription_status: 'canceled',
      subscription_ends_at: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : null
    })
    .eq('stripe_subscription_id', subscription.id);
}
  
  return NextResponse.json({ received: true });
}
