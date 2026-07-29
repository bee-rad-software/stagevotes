'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clipboard,
  Download,
  ExternalLink,
  UserPlus,
  Vote,
  Trophy,
  MapPin,
} from 'lucide-react';

import SVShell from '@/components/ui/SVShell';
import AppQRCode from '@/components/AppQRCode';
import { supabase, EventRow } from '@/lib/supabase';

type QrField =
  | 'show_signup_qr'
  | 'show_voting_qr'
  | 'show_peoples_choice_qr'
  | 'show_checkin_qr';

export default function AudiencePage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [accountId, setAccountId] = useState('');

  const [staticSignupQr, setStaticSignupQr] = useState(false);
  const [staticJudgeQr, setStaticJudgeQr] = useState(false);
  const [staticPeopleQr, setStaticPeopleQr] = useState(false);

  const [copiedLink, setCopiedLink] = useState('');
  const [loading, setLoading] = useState(true);

  const signupUrl =
    typeof window !== 'undefined'
      ? staticSignupQr && accountId
        ? `${window.location.origin}/go/${accountId}/signup`
        : `${window.location.origin}/signup/${eventId}`
      : '';

  const voteUrl =
    typeof window !== 'undefined'
      ? staticJudgeQr && accountId
        ? `${window.location.origin}/go/${accountId}/vote`
        : `${window.location.origin}/vote/${eventId}`
      : '';

  const peoplesChoiceUrl =
    typeof window !== 'undefined'
      ? staticPeopleQr && accountId
        ? `${window.location.origin}/go/${accountId}/people`
        : `${window.location.origin}/peopleschoice/${eventId}`
      : '';

  const checkinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/checkin/${eventId}`
      : '';

  useEffect(() => {
    loadAudiencePage();
  }, [eventId]);

  async function loadAudiencePage() {
    setLoading(true);

    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      router.push('/login');
      return;
    }

    const { data: accountUser, error: accountUserError } =
      await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', userData.user.id)
        .single();

    if (accountUserError || !accountUser) {
      console.error(accountUserError);
      alert('No StageVotes account was found.');
      router.push('/');
      return;
    }

    setAccountId(accountUser.account_id);

    const [accountResult, eventResult] = await Promise.all([
      supabase
        .from('accounts')
        .select(
          'id, static_signup_qr, static_judge_qr, static_people_qr'
        )
        .eq('id', accountUser.account_id)
        .single(),

      supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('account_id', accountUser.account_id)
        .single(),
    ]);

    if (accountResult.data) {
      setStaticSignupQr(
        accountResult.data.static_signup_qr || false
      );

      setStaticJudgeQr(
        accountResult.data.static_judge_qr || false
      );

      setStaticPeopleQr(
        accountResult.data.static_people_qr || false
      );
    }

    if (eventResult.error || !eventResult.data) {
      console.error(eventResult.error);
      alert('You do not have access to this event.');
      router.push('/');
      return;
    }

    setEvent(eventResult.data);
    setLoading(false);
  }

  function copyLink(label: string, url: string) {
    navigator.clipboard.writeText(url);

    setCopiedLink(label);

    setTimeout(() => {
      setCopiedLink('');
    }, 2000);
  }

  function openLink(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function downloadQR(
    url: string,
    filename: string
  ) {
    const canvas = document.createElement('canvas');

    const size = 1200;
    const margin = 80;

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      ctx.drawImage(
        img,
        margin,
        margin,
        size - margin * 2,
        size - margin * 2
      );

      const link = document.createElement('a');

      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src =
      'https://api.qrserver.com/v1/create-qr-code/' +
      `?size=1000x1000&format=png&data=${encodeURIComponent(url)}`;
  }

  async function toggleQrSetting(
    field: QrField,
    value: boolean
  ) {
    const { error } = await supabase
      .from('events')
      .update({
        [field]: value,
      })
      .eq('id', eventId)
      .eq('account_id', accountId);

    if (error) {
      alert(error.message);
      return;
    }

    setEvent((currentEvent) =>
      currentEvent
        ? {
            ...currentEvent,
            [field]: value,
          }
        : currentEvent
    );
  }

  if (loading) {
    return (
      <SVShell
        title="Audience"
        subtitle="Loading audience access..."
      >
        <div className="sv-card">
          Loading...
        </div>
      </SVShell>
    );
  }

  const qrCards = [
    {
      key: 'signup',
      title: 'Singer Signup',
      description:
        'Let singers join the queue and submit their song.',
      icon: UserPlus,
      url: signupUrl,
      filename: 'stagevotes-signup-qr.png',
      badge: staticSignupQr
        ? 'Static QR'
        : 'Event QR',
      field: 'show_signup_qr' as QrField,
      visible: !!event?.show_signup_qr,
    },
    {
      key: 'voting',
      title: 'Judge Voting',
      description:
        'Open the scoring ballot for your judges.',
      icon: Vote,
      url: voteUrl,
      filename: 'stagevotes-judge-voting-qr.png',
      badge: staticJudgeQr
        ? 'Static QR'
        : 'Event QR',
      field: 'show_voting_qr' as QrField,
      visible: !!event?.show_voting_qr,
    },
    {
      key: 'peoplesChoice',
      title: "People's Choice",
      description:
        'Let the audience vote for their favorite singer.',
      icon: Trophy,
      url: peoplesChoiceUrl,
      filename: 'stagevotes-peoples-choice-qr.png',
      badge: staticPeopleQr
        ? 'Static QR'
        : 'Event QR',
      field: 'show_peoples_choice_qr' as QrField,
      visible:
        !!event?.show_peoples_choice_qr,
    },
    {
      key: 'checkin',
      title: 'Venue Check-In',
      description:
        'Allow guests to verify that they are at the venue.',
      icon: MapPin,
      url: checkinUrl,
      filename: 'stagevotes-checkin-qr.png',
      badge: 'Event QR',
      field: 'show_checkin_qr' as QrField,
      visible: !!event?.show_checkin_qr,
    },
  ];

async function toggleCheckinRequired(
  required: boolean
) {
  const { error } = await supabase
    .from('events')
    .update({
      checkin_required: required,
    })
    .eq('id', eventId)
    .eq('account_id', accountId);

  if (error) {
    alert(error.message);
    return;
  }

  setEvent((currentEvent) =>
    currentEvent
      ? {
          ...currentEvent,
          checkin_required: required,
        }
      : currentEvent
  );
}

function useCurrentLocationForCheckin() {
  if (!navigator.geolocation) {
    alert(
      'Geolocation is not supported by this browser.'
    );
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const {
        latitude,
        longitude,
      } = position.coords;

      const radius =
        event?.checkin_radius_meters || 150;

      const { error } = await supabase
        .from('events')
        .update({
          venue_lat: latitude,
          venue_lng: longitude,
          checkin_radius_meters: radius,
        })
        .eq('id', eventId)
        .eq('account_id', accountId);

      if (error) {
        alert(error.message);
        return;
      }

      setEvent((currentEvent) =>
        currentEvent
          ? {
              ...currentEvent,
              venue_lat: latitude,
              venue_lng: longitude,
              checkin_radius_meters:
                radius,
            }
          : currentEvent
      );

      alert('Venue location saved.');
    },
    () => {
      alert(
        'Unable to get your location.'
      );
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

  return (
    <SVShell
      title="Audience"
      subtitle={
        event?.name
          ? `${event.name} audience access`
          : 'Manage singer, judge, and audience access.'
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {qrCards.map((card) => {
          const Icon = card.icon;

          return (
            <section
              key={card.key}
              className="sv-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                    }}
                  >
                    <Icon
                      size={22}
                      strokeWidth={2.25}
                    />
                  </div>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 20,
                      }}
                    >
                      {card.title}
                    </h2>

                    <p
                      style={{
                        margin:
                          '5px 0 0',
                        opacity: 0.7,
                        fontSize: 14,
                        lineHeight: 1.4,
                      }}
                    >
                      {card.description}
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    background:
                      card.badge ===
                      'Static QR'
                        ? 'rgba(34, 197, 94, 0.16)'
                        : 'rgba(148, 163, 184, 0.14)',
                    color:
                      card.badge ===
                      'Static QR'
                        ? '#4ade80'
                        : '#cbd5e1',
                    border:
                      '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 999,
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform:
                      'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {card.badge}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 18,
                  borderRadius: 16,
                  background: 'white',
                  width: 'fit-content',
                  alignSelf: 'center',
                }}
              >
                <AppQRCode
                  value={card.url}
                  size={180}
                />
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.65,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
                title={card.url}
              >
                {card.url}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, 1fr)',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    copyLink(
                      card.key,
                      card.url
                    )
                  }
                >
                  <Clipboard size={16} />

                  {copiedLink === card.key
                    ? 'Copied'
                    : 'Copy'}
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    openLink(card.url)
                  }
                >
                  <ExternalLink size={16} />
                  Open
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadQR(
                      card.url,
                      card.filename
                    )
                  }
                >
                  <Download size={16} />
                  Download
                </button>
              </div>

              <label
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 12,
                  borderTop:
                    '1px solid rgba(255,255,255,0.08)',
                  paddingTop: 16,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong>
                    Show on TV display
                  </strong>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.65,
                      marginTop: 3,
                    }}
                  >
                    Display this QR code during
                    the show.
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={card.visible}
                  onChange={(e) =>
                    toggleQrSetting(
                      card.field,
                      e.target.checked
                    )
                  }
                  style={{
                    width: 20,
                    height: 20,
                    margin: 0,
                  }}
                />
              </label>
            </section>
          );
        })}
          </div>

      <section
        className="sv-card"
        style={{
          marginTop: 20,
          display: 'grid',
          gap: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            Venue Check-In Settings
          </h2>

          <p
            style={{
              margin: '6px 0 0',
              opacity: 0.7,
              fontSize: 14,
            }}
          >
            Control location verification for
            People&apos;s Choice voting.
          </p>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 16,
            cursor: 'pointer',
            padding: 16,
            borderRadius: 12,
            background:
              'rgba(255,255,255,0.04)',
            border:
              '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <strong>
              Require venue check-in
            </strong>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                opacity: 0.65,
              }}
            >
              Guests must verify they are at
              the venue before voting.
            </div>
          </div>

          <input
            type="checkbox"
            checked={
              event?.checkin_required ??
              false
            }
            onChange={(e) =>
              toggleCheckinRequired(
                e.target.checked
              )
            }
            style={{
              width: 20,
              height: 20,
              margin: 0,
            }}
          />
        </label>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background:
                'rgba(255,255,255,0.04)',
              border:
                '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.65,
                marginBottom: 6,
              }}
            >
              Venue location
            </div>

            <strong>
              {event?.venue_lat &&
              event?.venue_lng
                ? `${event.venue_lat.toFixed(
                    5
                  )}, ${event.venue_lng.toFixed(
                    5
                  )}`
                : 'Not set'}
            </strong>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background:
                'rgba(255,255,255,0.04)',
              border:
                '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.65,
                marginBottom: 6,
              }}
            >
              Check-in radius
            </div>

            <strong>
              {event?.checkin_radius_meters ||
                150}{' '}
              meters
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={
            useCurrentLocationForCheckin
          }
          style={{
            width: 'fit-content',
          }}
        >
          Use My Current Location
        </button>
      </section>
    </SVShell>
  );
}