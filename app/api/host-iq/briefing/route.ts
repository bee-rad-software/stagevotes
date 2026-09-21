import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  AIHostBriefing,
  AIHostBriefingRequest,
} from '@/lib/aiHostIQ';

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

const briefingSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    nextAction: { type: 'string' },
    announcement: { type: 'string' },
    urgency: {
      type: 'string',
      enum: ['normal', 'watch', 'urgent'],
    },
  },
  required: [
    'headline',
    'summary',
    'nextAction',
    'announcement',
    'urgency',
  ],
} as const;

function isFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidRequest(value: unknown): value is AIHostBriefingRequest {
  if (!value || typeof value !== 'object') return false;

  const input = value as Partial<AIHostBriefingRequest>;

  return Boolean(
    typeof input.eventId === 'string' &&
      input.eventId.length > 0 &&
      typeof input.targetEndTime === 'string' &&
      typeof input.projectedEndTime === 'string' &&
      isFiniteNumber(input.bufferMinutes) &&
      isFiniteNumber(input.averageMinutes) &&
      isFiniteNumber(input.sampleSize) &&
      isFiniteNumber(input.queueMinutes) &&
      isFiniteNumber(input.remainingSongs) &&
      isFiniteNumber(input.remainingSingers) &&
      typeof input.isLiveEstimate === 'boolean' &&
      typeof input.signupsOpen === 'boolean' &&
      typeof input.additionalSongsOpen === 'boolean' &&
      typeof input.showStarted === 'boolean' &&
      typeof input.votingOpen === 'boolean' &&
      typeof input.karaFunConnected === 'boolean' &&
      input.recommendation &&
      typeof input.recommendation.title === 'string' &&
      typeof input.recommendation.message === 'string' &&
      typeof input.recommendation.status === 'string' &&
      isFiniteNumber(input.recommendation.capacitySongs)
  );
}

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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI Host Briefing is not configured yet.' },
        { status: 503 }
      );
    }

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

    const body: unknown = await request.json();

    if (!isValidRequest(body)) {
      return NextResponse.json(
        { error: 'The Host IQ data is incomplete.' },
        { status: 400 }
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

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', body.eventId)
      .eq('account_id', accountUser.account_id)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'That event was not found.' },
        { status: 404 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

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
          model: process.env.OPENAI_HOST_IQ_MODEL || 'gpt-5.6-luna',
          instructions:
            'You are Host IQ, a concise live karaoke show advisor. Use only the supplied aggregate facts. Never invent singer details, never suggest changing singer order, and never claim an action was taken. Respect the deterministic StageVotes recommendation as the safety baseline. Give one practical next action and a friendly announcement the host can read aloud. Keep every field brief and use plain language.',
          input: JSON.stringify({
            currentTime: new Date().toISOString(),
            ...body,
            eventId: undefined,
          }),
          max_output_tokens: 450,
          text: {
            format: {
              type: 'json_schema',
              name: 'host_iq_briefing',
              strict: true,
              schema: briefingSchema,
            },
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI Host IQ error:', aiResponse.status, errorText);

      return NextResponse.json(
        { error: 'The AI briefing is temporarily unavailable.' },
        { status: 502 }
      );
    }

    const responseData: unknown = await aiResponse.json();
    const outputText = extractOutputText(responseData);

    if (!outputText) {
      throw new Error('The AI response did not include briefing text.');
    }

    const briefing = JSON.parse(outputText) as AIHostBriefing;

    return NextResponse.json(
      { briefing },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('AI Host Briefing error:', error);

    return NextResponse.json(
      { error: 'Unable to generate an AI briefing right now.' },
      { status: 500 }
    );
  }
}
