import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing StageVotes account ID.' },
        { status: 400 }
      );
    }

    const { data: account, error } =
      await supabase
        .from('accounts')
        .select('stripe_customer_id')
        .eq('id', accountId)
        .single();

    if (error) {
      console.error(
        'Account lookup failed:',
        error
      );

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

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
      { status: 500 }
    );
  }
}