import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return NextResponse.json({ error: 'Invalid show' }, { status: 400 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: event, error: eventError } = await admin.from('events').select('id')
    .eq('id', eventId).eq('is_show_ended', false).maybeSingle();
  if (eventError) return NextResponse.json({ error: 'Could not load show' }, { status: 500 });
  if (!event) return NextResponse.json({ badges: [] }, { headers: { 'Cache-Control': 'no-store' } });

  const { data, error } = await admin.from('singer_achievements').select(`
    id, singer_profile_id, triggering_performance_id, earned_at,
    achievement_definitions(title, icon),
    performances!inner(event_id, status, singer_profile_id, singer_name),
    singer_profiles!inner(profile_visibility)
  `).eq('performances.event_id', eventId).eq('performances.status', 'completed')
    .eq('singer_profiles.profile_visibility', 'public')
    .not('triggering_performance_id', 'is', null)
    .order('earned_at', { ascending: false }).order('id', { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: 'Could not load badges' }, { status: 500 });
  const badges = (data || []).flatMap(row => {
    const performance = Array.isArray(row.performances) ? row.performances[0] : row.performances;
    const definition = Array.isArray(row.achievement_definitions) ? row.achievement_definitions[0] : row.achievement_definitions;
    if (!performance || performance.singer_profile_id !== row.singer_profile_id || !definition?.title) return [];
    return [{ id: row.id, singer: performance.singer_name, title: definition.title, icon: definition.icon || '🏅' }];
  });
  return NextResponse.json({ badges }, { headers: { 'Cache-Control': 'no-store' } });
}
