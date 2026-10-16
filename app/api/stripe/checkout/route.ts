import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { desktopPlatform } from '@/lib/desktopDownloadIntent';
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
    const body = await req.json().catch(() => ({}));
    const requestedPlatform = desktopPlatform(body?.downloadPlatform);
    const optedIn = req.headers.get('cookie')?.split('; ').includes('sv_analytics=accepted');
    const analyticsMetadata: Record<string, string> = optedIn && typeof body?.analytics?.clientId === 'string' && typeof body?.analytics?.sessionId === 'string' && /^\d+\.\d+$/.test(body?.analytics?.clientId || '') && /^\d+$/.test(body?.analytics?.sessionId || '')
      ? { ga_client_id: body.analytics.clientId.slice(0, 80), ga_session_id: body.analytics.sessionId.slice(0, 30) } : {};

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

    // A returning customer can subscribe, but cannot repeatedly restart the trial.
    const eligibleForTrial = subscriptions.data.length === 0 &&
      !account.stripe_subscription_id;
    const checkoutPolicy = eligibleForTrial ? 'trial-14-no-card-v1' : 'paid-v1';

    const existingSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      status: 'open',
      limit: 1,
    });

    const existingSession = existingSessions.data[0];

    if (existingSession?.url) {
      const existingPlatform = desktopPlatform(
        existingSession.success_url
          ? new URL(existingSession.success_url).searchParams.get('download')
          : null
      );
      if (existingPlatform === requestedPlatform && existingSession.metadata?.ga_client_id === analyticsMetadata.ga_client_id && existingSession.metadata?.checkout_policy === checkoutPolicy) {
        return NextResponse.json({ url: existingSession.url });
      }
      await stripe.checkout.sessions.expire(existingSession.id);
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        payment_method_collection: eligibleForTrial ? 'if_required' : 'always',

        metadata: {
          account_id: account.id,
          download_platform: requestedPlatform || 'web',
          checkout_policy: checkoutPolicy,
        },

        subscription_data: {
          metadata: {
            account_id: account.id,
            ...analyticsMetadata,
          },
          ...(eligibleForTrial ? {
            trial_period_days: 14,
            trial_settings: {
              end_behavior: { missing_payment_method: 'cancel' as const },
            },
          } : {}),
        },

        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID!,
            quantity: 1,
          },
        ],

        success_url: `${siteUrl}/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}${requestedPlatform ? `&download=${requestedPlatform}` : ''}`,
        cancel_url: `${siteUrl}/onboarding?checkout=cancelled${requestedPlatform ? `&download=${requestedPlatform}` : ''}`,
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
