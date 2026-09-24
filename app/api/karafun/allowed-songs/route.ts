import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isKaraFunSongAllowed } from '@/lib/karafunContent';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { eventId, songIds } = await request.json();
    if (typeof eventId !== 'string' || !Array.isArray(songIds) || songIds.length > 100) {
      return NextResponse.json({ error: 'Invalid song request.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Song content settings unavailable.' }, { status: 503 });
    }

    return NextResponse.json({
      allowedIds: songIds
        .filter((id): id is number | string =>
          typeof id === 'number' || typeof id === 'string'
        )
        .filter((id) => !event.exclude_explicit_songs || isKaraFunSongAllowed(id))
        .map(String),
    });
  } catch {
    return NextResponse.json({ error: 'Unable to check song ratings.' }, { status: 503 });
  }
}
