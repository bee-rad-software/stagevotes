import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Sign in is required.' },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Your session is invalid or expired.' },
        { status: 401 }
      );
    }

    const { data: accountUser, error: membershipError } =
      await supabaseAdmin
        .from('account_users')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError || !accountUser?.account_id) {
      return NextResponse.json(
        { error: 'No StageVotes account was found.' },
        { status: 403 }
      );
    }

    const { data: account, error: accountError } =
      await supabaseAdmin
        .from('accounts')
        .select('subscription_status')
        .eq('id', accountUser.account_id)
        .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Unable to verify your subscription.' },
        { status: 403 }
      );
    }

    if (
      account.subscription_status !== 'active' &&
      account.subscription_status !== 'trialing'
    ) {
      return NextResponse.json(
        { error: 'An active StageVotes subscription is required.' },
        { status: 403 }
      );
    }

    const platform = request.nextUrl.searchParams.get('platform');

    if (platform !== 'mac') {
      return NextResponse.json(
        { error: 'That download is not available.' },
        { status: 400 }
      );
    }

    const objectKey = process.env.R2_MAC_OBJECT_KEY;

    if (!objectKey) {
      return NextResponse.json(
        { error: 'The Mac download is not configured.' },
        { status: 500 }
      );
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: objectKey,
      ResponseContentType: 'application/x-apple-diskimage',
      ResponseContentDisposition:
        'attachment; filename="StageVotes-Mac.dmg"',
    });

    const url = await getSignedUrl(r2, command, {
      expiresIn: 60,
    });

    return NextResponse.json(
      { url },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Protected download error:', error);

    return NextResponse.json(
      { error: 'Unable to prepare the download.' },
      { status: 500 }
    );
  }
}