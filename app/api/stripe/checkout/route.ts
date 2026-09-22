import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  AuthError,
  getSupabaseAdmin,
  requireStageVotesAccount,
} from '@/lib/server/stageVotesAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { user, account } = await requireStageVotesAccount(req);

    if (
      account.subscription_status === 'active' ||
      account.subscription_status === 'trialing'
    ) {
      return NextResponse.json(
        { error: 'This StageVotes account already has an active subscription.' },
        { status: 409 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL is not configured.'
      );
    }

    let customerId = account.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: account.name || undefined,
        metadata: {
          account_id: account.id,
        },
      });

      customerId = customer.id;

      const { error: customerUpdateError } = await supabaseAdmin
        .from('accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account.id);

      if (customerUpdateError) {
        throw customerUpdateError;
      }
    }

    const existingSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: 'open',
      limit: 1,
    });

    const existingSession = existingSessions.data[0];

    if (existingSession?.url) {
      return NextResponse.json({ url: existingSession.url });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    const existingSubscription = subscriptions.data.find((subscription) =>
      [
        'active',
        'trialing',
        'past_due',
        'unpaid',
        'incomplete',
        'paused',
      ].includes(subscription.status)
    );

    if (existingSubscription) {
      return NextResponse.json(
        {
          error:
            'A subscription already exists for this account. Use Manage Subscription to update its billing information.',
        },
        { status: 409 }
      );
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,

        metadata: {
          account_id: account.id,
        },

        subscription_data: {
          metadata: {
            account_id: account.id,
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
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
