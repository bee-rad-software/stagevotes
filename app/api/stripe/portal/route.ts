import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  AuthError,
  requireStageVotesAccount,
} from '@/lib/server/stageVotesAuth';

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function POST(req: Request) {
  try {
    const { account } = await requireStageVotesAccount(req);

    if (!account?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found.' },
        { status: 400 }
      );
    }

    const session =
      await stripe.billingPortal.sessions.create({
        customer: account.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
      });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      'Stripe billing portal error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to open billing portal',
      },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
