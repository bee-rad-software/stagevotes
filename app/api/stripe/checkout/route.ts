import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
   const { email, accountId } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      metadata: {
  account_id: accountId
},
subscription_data: {
  metadata: {
    account_id: accountId
  },
  trial_period_days: 7
},
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?success=true&checkout=complete`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Unable to create checkout session' },
      { status: 500 }
    );
  }
}
