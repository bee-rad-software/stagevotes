import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { email, accountId } = await req.json();

    if (!email || !accountId) {
      return NextResponse.json(
        {
          error:
            'An email address and StageVotes account are required.',
        },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL is not configured.'
      );
    }

    const session =
      await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,

        metadata: {
          account_id: accountId,
        },

        subscription_data: {
          metadata: {
            account_id: accountId,
          },
          trial_period_days: 7,
        },

        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID!,
            quantity: 1,
          },
        ],

        success_url: `${siteUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/onboarding?checkout=cancelled`,
      });

    if (!session.url) {
      throw new Error(
        'Stripe did not return a checkout URL.'
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      'Stripe checkout session error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to create checkout session.',
      },
      { status: 500 }
    );
  }
}