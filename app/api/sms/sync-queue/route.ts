import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  getSupabaseAdmin,
  requireStageVotesAccount,
} from '@/lib/server/stageVotesAuth';

export const runtime = 'nodejs';

type AlertType = 'on_deck' | 'you_are_up';

type AlertCandidate = {
  performanceId: string | null;
  type: AlertType;
};

function twilioIsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_API_KEY &&
      process.env.TWILIO_API_KEY_SECRET &&
      process.env.TWILIO_MESSAGING_SERVICE_SID
  );
}

async function sendTwilioMessage(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const apiKey = process.env.TWILIO_API_KEY!;
  const apiSecret = process.env.TWILIO_API_KEY_SECRET!;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID!;
  const form = new URLSearchParams({
    To: to,
    MessagingServiceSid: messagingServiceSid,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      cache: 'no-store',
    }
  );

  const payload = (await response.json()) as {
    sid?: string;
    message?: string;
  };

  if (!response.ok || !payload.sid) {
    throw new Error(payload.message || 'Twilio rejected the message.');
  }

  return payload.sid;
}

function messageFor(
  type: AlertType,
  performance: {
    singer_name: string;
    song_title: string;
  },
  venueName: string
) {
  if (type === 'you_are_up') {
    return `StageVotes: You're up, ${performance.singer_name}! Please head to the stage now for "${performance.song_title}" at ${venueName}. Reply STOP to opt out or HELP for help.`;
  }

  return `StageVotes: Hi ${performance.singer_name}, you're on deck to sing "${performance.song_title}" at ${venueName}. Please get ready and stay near the stage. Reply STOP to opt out or HELP for help.`;
}

export async function POST(request: NextRequest) {
  try {
    const { account } = await requireStageVotesAccount(request);

    const body = (await request.json()) as {
      eventId?: string;
      onDeckPerformanceId?: string | null;
    };

    if (!body.eventId) {
      return NextResponse.json({ error: 'eventId is required.' }, { status: 400 });
    }

    if (!twilioIsConfigured()) {
      return NextResponse.json({ configured: false, sent: 0 });
    }

    const supabase = getSupabaseAdmin();
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, account_id, venue, current_performance_id, is_show_ended')
      .eq('id', body.eventId)
      .eq('account_id', account.id)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Show not found.' }, { status: 404 });
    }

    if (event.is_show_ended || !event.current_performance_id) {
      return NextResponse.json({ configured: true, sent: 0 });
    }

    // Never trust the browser to nominate a different current performance.
    const currentId = event.current_performance_id as string;
    const candidates: AlertCandidate[] = [
      { performanceId: currentId, type: 'you_are_up' },
      {
        performanceId:
          body.onDeckPerformanceId && body.onDeckPerformanceId !== currentId
            ? body.onDeckPerformanceId
            : null,
        type: 'on_deck',
      },
    ];

    let sent = 0;

    for (const candidate of candidates) {
      if (!candidate.performanceId) continue;

      const { data: performance } = await supabase
        .from('performances')
        .select('id, event_id, account_id, singer_name, song_title, status')
        .eq('id', candidate.performanceId)
        .eq('event_id', event.id)
        .eq('account_id', account.id)
        .maybeSingle();

      if (!performance || ['completed', 'skipped'].includes(performance.status)) {
        continue;
      }

      const { data: subscription } = await supabase
        .from('performance_sms_subscriptions')
        .select('phone_e164')
        .eq('performance_id', performance.id)
        .maybeSingle();

      if (!subscription?.phone_e164) continue;

      const { data: claim, error: claimError } = await supabase
        .from('sms_notification_deliveries')
        .insert({
          performance_id: performance.id,
          event_id: event.id,
          notification_type: candidate.type,
          status: 'sending',
        })
        .select('id')
        .maybeSingle();

      // A uniqueness conflict means this exact alert was already claimed/sent.
      if (claimError || !claim) continue;

      try {
        const sid = await sendTwilioMessage(
          subscription.phone_e164,
          messageFor(candidate.type, performance, event.venue || 'your karaoke venue')
        );

        await supabase
          .from('sms_notification_deliveries')
          .update({
            status: 'sent',
            twilio_message_sid: sid,
            sent_at: new Date().toISOString(),
          })
          .eq('id', claim.id);

        sent += 1;
      } catch (error) {
        // Permit a later queue sync to retry a message Twilio definitively rejected.
        await supabase.from('sms_notification_deliveries').delete().eq('id', claim.id);
        console.error('Unable to send singer SMS alert:', error);
      }
    }

    return NextResponse.json({ configured: true, sent });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Unable to synchronize singer SMS alerts:', error);
    return NextResponse.json({ error: 'Unable to synchronize SMS alerts.' }, { status: 500 });
  }
}
