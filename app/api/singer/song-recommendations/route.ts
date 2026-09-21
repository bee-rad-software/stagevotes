import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  AISongRecommendation,
  AISongRecommendationsResponse,
} from '@/lib/aiSongRecommendations';

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

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    recommendations: {
      type: 'array',
      minItems: 10,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          artist: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['title', 'artist', 'reason'],
      },
    },
  },
  required: ['recommendations'],
} as const;

type Candidate = Pick<AISongRecommendation, 'title' | 'artist' | 'reason'>;

function extractOutputText(response: unknown) {
  if (!response || typeof response !== 'object') return null;
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (
        part &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'output_text' &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        return (part as { text: string }).text;
      }
    }
  }

  return null;
}

function normalize(value: string | null | undefined) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isCandidate(value: unknown): value is Candidate {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Candidate>;
  return Boolean(
    candidate.title?.trim() &&
      candidate.artist?.trim() &&
      candidate.reason?.trim()
  );
}

async function findKaraFunSong(channel: string, candidate: Candidate) {
  const query = `${candidate.title} ${candidate.artist}`;
  const response = await fetch(
    `https://www.karafun.com/${encodeURIComponent(channel)}/` +
      `?type=search&q=${encodeURIComponent(query)}&types=karaoke`,
    { cache: 'no-store' }
  );

  if (!response.ok) return null;
  const results: unknown = await response.json();
  if (!Array.isArray(results)) return null;

  const wantedTitle = normalize(candidate.title);
  const wantedArtist = normalize(candidate.artist);
  const match = results.find((result) => {
    if (!result || typeof result !== 'object') return false;
    const song = result as { title?: unknown; artist?: unknown };
    const title = normalize(String(song.title || ''));
    const artist = normalize(String(song.artist || ''));
    return (
      title === wantedTitle &&
      (!wantedArtist || artist.includes(wantedArtist) || wantedArtist.includes(artist))
    );
  }) as
    | { title?: string; artist?: string; songId?: string | number }
    | undefined;

  if (!match) return null;

  return {
    title: match.title || candidate.title,
    artist: match.artist || candidate.artist,
    reason: candidate.reason,
    karafunSongId: Number(match.songId) || null,
  } satisfies AISongRecommendation;
}

async function findStageVotesSong(candidate: Candidate) {
  const { data } = await supabaseAdmin
    .from('songs')
    .select('id, title, artist')
    .ilike('title', candidate.title)
    .limit(10);

  const wantedArtist = normalize(candidate.artist);
  const match = (data || []).find((song) => {
    const artist = normalize(song.artist);
    return !wantedArtist || artist.includes(wantedArtist) || wantedArtist.includes(artist);
  });

  if (!match) return null;

  return {
    id: match.id,
    title: match.title,
    artist: match.artist || candidate.artist,
    reason: candidate.reason,
    karafunSongId: null,
  } satisfies AISongRecommendation;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI song recommendations are not configured yet.' },
        { status: 503 }
      );
    }

    const authorization = request.headers.get('authorization');
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Sign in to get recommendations from your song history.' },
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

    const body: unknown = await request.json();
    const eventId =
      body && typeof body === 'object' &&
      typeof (body as { eventId?: unknown }).eventId === 'string'
        ? (body as { eventId: string }).eventId
        : '';

    if (!eventId) {
      return NextResponse.json(
        { error: 'The event is required.' },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('singer_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Create your singer profile to unlock personal recommendations.' },
        { status: 403 }
      );
    }

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, account_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !event?.account_id) {
      return NextResponse.json(
        { error: 'That show was not found.' },
        { status: 404 }
      );
    }

    const [{ data: history, error: historyError }, { data: queue }, { data: account }] =
      await Promise.all([
        supabaseAdmin
          .from('performances')
          .select('song_title, artist, completed_at, created_at')
          .eq('singer_profile_id', profile.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false, nullsFirst: false })
          .limit(75),
        supabaseAdmin
          .from('performances')
          .select('song_title, artist')
          .eq('event_id', eventId)
          .neq('status', 'skipped'),
        supabaseAdmin
          .from('accounts')
          .select('karafun_channel')
          .eq('id', event.account_id)
          .maybeSingle(),
      ]);

    if (historyError) {
      throw historyError;
    }

    const uniqueHistory = Array.from(
      new Map(
        (history || []).map((song) => [
          `${normalize(song.song_title)}|${normalize(song.artist)}`,
          { title: song.song_title, artist: song.artist || '' },
        ])
      ).values()
    );

    if (uniqueHistory.length === 0) {
      return NextResponse.json(
        {
          error:
            'Complete your first song with your account, then StageVotes can learn your style.',
        },
        { status: 422 }
      );
    }

    const excluded = [
      ...uniqueHistory,
      ...(queue || []).map((song) => ({
        title: song.song_title,
        artist: song.artist || '',
      })),
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let aiResponse: Response;

    try {
      aiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OPENAI_SINGER_RECOMMENDATIONS_MODEL || 'gpt-5.6-luna',
          instructions:
            'You are a karaoke song recommender. Recommend well-known, commonly available karaoke songs based only on the supplied completed-song history. Infer useful patterns such as genre, era, energy, and vocal style without making claims about identity or vocal range. Never repeat a history or current-queue song. Return exactly 10 distinct songs. Keep each reason friendly, specific, and under 18 words.',
          input: JSON.stringify({
            completedSongHistory: uniqueHistory,
            excludedSongs: excluded,
          }),
          max_output_tokens: 1400,
          text: {
            format: {
              type: 'json_schema',
              name: 'singer_song_recommendations',
              strict: true,
              schema: responseSchema,
            },
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResponse.ok) {
      const details = await aiResponse.text();
      console.error('OpenAI song recommendation error:', aiResponse.status, details);
      return NextResponse.json(
        { error: 'Personal recommendations are temporarily unavailable.' },
        { status: 502 }
      );
    }

    const outputText = extractOutputText(await aiResponse.json());
    if (!outputText) throw new Error('The AI response did not contain output text.');

    const parsed = JSON.parse(outputText) as { recommendations?: unknown };
    const candidates = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter(isCandidate)
      : [];

    const excludedKeys = new Set(
      excluded.map((song) => `${normalize(song.title)}|${normalize(song.artist)}`)
    );
    const excludedTitles = new Set(
      excluded.map((song) => normalize(song.title))
    );
    const distinctCandidates = candidates.filter((candidate, index, all) => {
      const key = `${normalize(candidate.title)}|${normalize(candidate.artist)}`;
      return (
        !excludedKeys.has(key) &&
        !excludedTitles.has(normalize(candidate.title)) &&
        all.findIndex(
          (item) =>
            `${normalize(item.title)}|${normalize(item.artist)}` === key
        ) === index
      );
    });

    const checked = await Promise.all(
      distinctCandidates.map((candidate) =>
        account?.karafun_channel
          ? findKaraFunSong(account.karafun_channel, candidate)
          : findStageVotesSong(candidate)
      )
    );

    const recommendations = checked.flatMap((song) =>
      song ? [song as AISongRecommendation] : []
    ).slice(0, 5);

    if (recommendations.length === 0) {
      return NextResponse.json(
        { error: 'We could not match suggestions to this show’s song catalog. Try again.' },
        { status: 422 }
      );
    }

    const response: AISongRecommendationsResponse = {
      recommendations,
      historyCount: uniqueHistory.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Singer song recommendation error:', error);
    return NextResponse.json(
      { error: 'Personal recommendations are temporarily unavailable.' },
      { status: 500 }
    );
  }
}
