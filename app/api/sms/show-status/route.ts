import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getSupabaseAdmin, requireStageVotesAccount } from '@/lib/server/stageVotesAuth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { account } = await requireStageVotesAccount(request);
    const eventId = request.nextUrl.searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Show required.' }, { status: 400 });

    const db = getSupabaseAdmin();
    const { data: event, error: eventError } = await db.from('events')
      .select('id').eq('id', eventId).eq('account_id', account.id).maybeSingle();
    if (eventError || !event) return NextResponse.json({ error: 'Show not found.' }, { status: 404 });

    const { data: performances, error: performanceError } = await db.from('performances')
      .select('id, singer_name, song_title, status, queue_order')
      .eq('event_id', eventId).eq('account_id', account.id)
      .order('queue_order');
    if (performanceError) throw performanceError;
    const ids = (performances || []).map((p) => p.id);
    if (!ids.length) return NextResponse.json({ alerts: [] });

    const [subscriptions, deliveries] = await Promise.all([
      db.from('performance_sms_subscriptions').select('performance_id').in('performance_id', ids),
      db.from('sms_notification_deliveries')
        .select('performance_id, notification_type, status, error_code').eq('event_id', eventId),
    ]);
    if (subscriptions.error) throw subscriptions.error;
    if (deliveries.error) throw deliveries.error;

    const optedIn = new Set((subscriptions.data || []).map((s) => s.performance_id));
    return NextResponse.json({
      alerts: (performances || []).filter((p) => optedIn.has(p.id)).map((p) => ({
        performanceId: p.id,
        singer: p.singer_name,
        song: p.song_title,
        performanceStatus: p.status,
        delivery: Object.fromEntries((deliveries.data || [])
          .filter((d) => d.performance_id === p.id)
          .map((d) => [d.notification_type, { status: d.status, errorCode: d.error_code }])),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Unable to load SMS show status:', error);
    return NextResponse.json({ error: 'Unable to load SMS status.' }, { status: 500 });
  }
}
