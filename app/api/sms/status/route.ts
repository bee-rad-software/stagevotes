import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/stageVotesAuth';

export const runtime = 'nodejs';

const statuses = new Set(['queued', 'sent', 'delivered', 'undelivered', 'failed']);

export async function POST(request: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new NextResponse(null, { status: 503 });

  const signature = request.headers.get('x-twilio-signature') || '';
  const body = new URLSearchParams(await request.text());
  const url = `${process.env.TWILIO_STATUS_CALLBACK_BASE_URL || 'https://app.stagevotes.com'}/api/sms/status`;
  const input = url + [...body.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => key + value)
    .join('');
  const expected = createHmac('sha1', token).update(input).digest('base64');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return new NextResponse(null, { status: 403 });
  }

  const sid = body.get('MessageSid');
  const status = body.get('MessageStatus');
  if (!sid || !status || !statuses.has(status)) {
    return new NextResponse(null, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('sms_notification_deliveries')
    .update({
      status,
      status_updated_at: new Date().toISOString(),
      error_code: body.get('ErrorCode') || null,
    })
    .eq('twilio_message_sid', sid)
    .not('status', 'in', '(delivered,undelivered,failed)');

  if (error) return new NextResponse(null, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
