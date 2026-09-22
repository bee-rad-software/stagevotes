import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  AuthError,
  requireStageVotesAccount,
} from '@/lib/server/stageVotesAuth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  try {
    const { account } = await requireStageVotesAccount(req);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing Stripe session ID.' },
        { status: 400 }
      );
    }

    const session =
      await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.account_id !== account.id) {
      return NextResponse.json(
        { error: 'This checkout does not belong to your StageVotes account.' },
        { status: 403 }
      );
    }

    if (session.status !== 'complete' || !session.subscription) {
      return NextResponse.json(
        { error: 'Stripe has not completed this checkout yet.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail:
        session.customer_details?.email ??
        session.customer_email ??
        null,
      accountId:
        session.metadata?.account_id ?? null,
      subscriptionId:
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null,
    });
  } catch (error) {
    console.error(
      'Stripe checkout session retrieval failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to verify checkout session.',
      },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
