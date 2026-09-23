import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return NextResponse.json({ error: 'Invalid show' }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('venue_id')
    .eq('id', eventId)
    .eq('is_show_ended', true)
    .maybeSingle();

  if (eventError) return NextResponse.json({ error: 'Could not load show' }, { status: 500 });
  if (!event?.venue_id) return NextResponse.json({ error: 'Show not found' }, { status: 404 });

  const { data: venue, error: venueError } = await supabaseAdmin
    .from('venues')
    .select('id')
    .eq('id', event.venue_id)
    .eq('is_public', true)
    .eq('is_active', true)
    .maybeSingle();

  if (venueError) return NextResponse.json({ error: 'Could not load venue' }, { status: 500 });
  if (!venue) return NextResponse.json({ error: 'Show not found' }, { status: 404 });

  const badges: { performanceId: string; title: string; icon: string }[] = [];
  const pageSize = 500;

  for (let start = 0; ; start += pageSize) {
    const { data: rows, error } = await supabaseAdmin
      .from('singer_achievements')
      .select(`
        triggering_performance_id,
        singer_profile_id,
        achievement_definitions(title, icon),
        performances!inner(event_id, status, singer_profile_id)
      `)
      .eq('performances.event_id', eventId)
      .eq('performances.status', 'completed')
      .not('triggering_performance_id', 'is', null)
      .order('earned_at', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) return NextResponse.json({ error: 'Could not load badges' }, { status: 500 });

    for (const row of rows || []) {
      const performance = Array.isArray(row.performances) ? row.performances[0] : row.performances;
      const definition = Array.isArray(row.achievement_definitions)
        ? row.achievement_definitions[0] : row.achievement_definitions;

      if (row.triggering_performance_id &&
          performance?.singer_profile_id === row.singer_profile_id &&
          definition?.title) {
        badges.push({
          performanceId: row.triggering_performance_id,
          title: definition.title,
          icon: definition.icon || '🏅',
        });
      }
    }

    if (!rows || rows.length < pageSize) break;
  }

  return NextResponse.json({ badges }, { headers: { 'Cache-Control': 'no-store' } });
}
