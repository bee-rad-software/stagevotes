'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  MapPin,
  Mic2,
  Music2,
  Trophy,
  Users,
} from 'lucide-react';

import SVShell from '@/components/ui/SVShell';
import {
  supabase,
  EventRow,
  PerformanceRow,
} from '@/lib/supabase';

type ArchivedEvent = EventRow & {
  created_at?: string | null;
};

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.eventId as string;

  const [event, setEvent] =
    useState<EventRow | null>(null);

  const [performances, setPerformances] =
    useState<PerformanceRow[]>([]);

  const [archivedEvents, setArchivedEvents] =
    useState<ArchivedEvent[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadHistory();
  }, [eventId]);

  async function loadHistory() {
    setLoading(true);

    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      router.push('/login');
      return;
    }

    const {
      data: accountUser,
      error: accountUserError,
    } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userData.user.id)
      .single();

    if (
      accountUserError ||
      !accountUser
    ) {
      console.error(accountUserError);

      alert(
        'No StageVotes account was found.'
      );

      router.push('/');
      return;
    }

    const accountId =
      accountUser.account_id;

      const recentArchivedEvents =
  archivedEvents.slice(0, 6);

    const [
      eventResult,
      performancesResult,
      archivedResult,
    ] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('account_id', accountId)
        .single(),

      supabase
        .from('performances')
        .select('*')
        .eq('event_id', eventId)
        .eq('account_id', accountId)
        .order('queue_order', {
          ascending: true,
        }),

      supabase
        .from('events')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_archived', true)
        .neq('id', eventId)
        .order('created_at', {
          ascending: false,
        }),
    ]);

    if (
      eventResult.error ||
      !eventResult.data
    ) {
      console.error(
        eventResult.error
      );

      alert(
        'You do not have access to this event.'
      );

      router.push('/');
      return;
    }

    setEvent(eventResult.data);

    setPerformances(
      performancesResult.data || []
    );

    if (archivedResult.error) {
      console.error(
        archivedResult.error
      );

      setArchivedEvents([]);
    } else {
      setArchivedEvents(
        archivedResult.data || []
      );
    }

    setLoading(false);
  }

  const completedPerformances =
    useMemo(() => {
      return performances.filter(
        (performance) =>
          performance.status ===
          'completed'
      );
    }, [performances]);

  const skippedPerformances =
    useMemo(() => {
      return performances.filter(
        (performance) =>
          performance.status ===
          'skipped'
      );
    }, [performances]);

const recentArchivedEvents = useMemo(() => {
  return archivedEvents.slice(0, 6);
}, [archivedEvents]);

  const uniqueSingerCount =
    new Set(
      performances.map(
        (performance) =>
          performance.singer_name
            .trim()
            .toLowerCase()
      )
    ).size;

  function formatDate(
    dateValue?: string | null
  ) {
    if (!dateValue) {
      return 'Date unavailable';
    }

    const parsedDate =
      new Date(dateValue);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  }

  if (loading) {
    return (
      <SVShell
        title="History"
        subtitle="Loading show history..."
      >
        <div className="sv-card">
          Loading...
        </div>
      </SVShell>
    );
  }

  const summaryCards = [
    {
      label: 'Singers Tonight',
      value: uniqueSingerCount,
      icon: Users,
      accent: '#38bdf8',
    },
    {
      label: 'Songs Submitted',
      value: performances.length,
      icon: Music2,
      accent: '#f97316',
    },
    {
      label: 'Completed',
      value:
        completedPerformances.length,
      icon: CheckCircle2,
      accent: '#4ade80',
    },
    {
      label: 'Skipped',
      value:
        skippedPerformances.length,
      icon: Clock3,
      accent: '#c084fc',
    },
  ];

  return (
    <SVShell
      title="History"
      subtitle={
        event?.name
          ? `${event.name} show history`
          : 'Review completed performances and previous shows.'
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
        }}
      >
        {summaryCards.map(
          (card) => {
            const Icon =
              card.icon;

            return (
              <section
                key={card.label}
                className="sv-card"
                style={{
                  display: 'flex',
                  alignItems:
                    'center',
                  gap: 14,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems:
                      'center',
                    color:
                      card.accent,
                    background:
                      `${card.accent}1f`,
                  }}
                >
                  <Icon size={22} />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.65,
                    }}
                  >
                    {card.label}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 26,
                      fontWeight: 900,
                    }}
                  >
                    {card.value}
                  </div>
                </div>
              </section>
            );
          }
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1.35fr) minmax(300px, 0.65fr)',
          gap: 20,
          marginTop: 20,
        }}
      >
        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2
                size={22}
                color="#4ade80"
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Completed Tonight
              </h2>
            </div>

            <span
              style={{
                borderRadius: 999,
                padding: '5px 10px',
                background:
                  'rgba(74,222,128,0.12)',
                color: '#4ade80',
                fontSize: 11,
                fontWeight: 800,
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.05em',
              }}
            >
              {
                completedPerformances.length
              }{' '}
              completed
            </span>
          </div>

          {completedPerformances.length ===
          0 ? (
            <div
              style={{
                padding: '34px 20px',
                textAlign: 'center',
                borderRadius: 14,
                background:
                  'rgba(255,255,255,0.025)',
                border:
                  '1px dashed rgba(255,255,255,0.12)',
              }}
            >
              <Mic2
                size={30}
                style={{
                  opacity: 0.4,
                }}
              />

              <h3
                style={{
                  margin:
                    '12px 0 5px',
                }}
              >
                No completed songs yet
              </h3>

              <p
                style={{
                  margin: 0,
                  opacity: 0.6,
                  fontSize: 13,
                }}
              >
                Performances will appear here
                as the show progresses.
              </p>
            </div>
          ) : (
            completedPerformances.map(
              (
                performance,
                index
              ) => (
                <div
                  key={
                    performance.id
                  }
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    gap: 16,
                    padding:
                      '14px 0',
                    borderBottom:
                      index ===
                      completedPerformances.length -
                        1
                        ? 'none'
                        : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems:
                        'center',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius:
                          10,
                        display:
                          'grid',
                        placeItems:
                          'center',
                        background:
                          'rgba(74,222,128,0.12)',
                        color:
                          '#4ade80',
                        fontWeight:
                          900,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <strong>
                        {
                          performance.singer_name
                        }
                      </strong>

                      <div
                        style={{
                          marginTop: 4,
                          opacity: 0.65,
                          fontSize: 13,
                          overflow:
                            'hidden',
                          textOverflow:
                            'ellipsis',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {
                          performance.song_title
                        }

                        {performance.artist
                          ? ` by ${performance.artist}`
                          : ''}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      color:
                        '#4ade80',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    COMPLETED
                  </span>
                </div>
              )
            )
          )}
        </section>

        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <History
              size={22}
              color="#38bdf8"
            />

            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              Current Show
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background:
                  'rgba(255,255,255,0.04)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 9,
                  alignItems:
                    'center',
                  opacity: 0.65,
                  fontSize: 12,
                }}
              >
                <Trophy size={15} />
                Show
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 7,
                }}
              >
                {event?.name ||
                  'Current Show'}
              </strong>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background:
                  'rgba(255,255,255,0.04)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 9,
                  alignItems:
                    'center',
                  opacity: 0.65,
                  fontSize: 12,
                }}
              >
                <MapPin size={15} />
                Venue
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 7,
                }}
              >
                {event?.venue ||
                  'Venue not set'}
              </strong>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background:
                  'rgba(255,255,255,0.04)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 9,
                  alignItems:
                    'center',
                  opacity: 0.65,
                  fontSize: 12,
                }}
              >
                <Archive size={15} />
                Status
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 7,
                  color:
                    event?.is_archived
                      ? '#facc15'
                      : '#4ade80',
                }}
              >
                {event?.is_archived
                  ? 'Archived'
                  : 'Active Show'}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section
  className="sv-card"
  style={{
    marginTop: 20,
  }}
>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16,
      marginBottom: 18,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Archive
        size={22}
        color="#c084fc"
      />

      <h2
        style={{
          margin: 0,
          fontSize: 20,
        }}
      >
        Previous Shows
      </h2>
    </div>

    <span
      style={{
        opacity: 0.6,
        fontSize: 12,
      }}
    >
      {archivedEvents.length} archived
    </span>
  </div>

  {archivedEvents.length === 0 ? (
    <div
      style={{
        padding: '32px 20px',
        textAlign: 'center',
        borderRadius: 14,
        background:
          'rgba(255,255,255,0.025)',
        border:
          '1px dashed rgba(255,255,255,0.12)',
      }}
    >
      <CalendarDays
        size={30}
        style={{
          opacity: 0.4,
        }}
      />

      <h3
        style={{
          margin: '12px 0 5px',
        }}
      >
        No archived shows yet
      </h3>

      <p
        style={{
          margin: 0,
          opacity: 0.6,
          fontSize: 13,
        }}
      >
        End or archive a show and it will appear here.
      </p>
    </div>
  ) : (
    <>
      <div
        style={{
          display: 'grid',
        }}
      >
        {recentArchivedEvents.map(
          (archivedEvent, index) => (
            <button
              key={archivedEvent.id}
              type="button"
              onClick={() =>
            router.push(`/history/${archivedEvent.id}`)
              }
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns:
                  'minmax(0, 1fr) auto auto',
                alignItems: 'center',
                gap: 16,
                padding: '15px 4px',
                background: 'transparent',
                color: 'white',
                border: 'none',
                borderBottom:
                  index ===
                  recentArchivedEvents.length - 1
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.08)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  minWidth: 0,
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {archivedEvent.name ||
                    'Archived Show'}
                </strong>

                <div
                  style={{
                    marginTop: 4,
                    opacity: 0.6,
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {archivedEvent.venue ||
                    'Venue not set'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  opacity: 0.65,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                <CalendarDays size={14} />

                {formatDate(
                  archivedEvent.created_at
                )}
              </div>

              <span
                style={{
                  fontSize: 20,
                  opacity: 0.45,
                }}
              >
                ›
              </span>
            </button>
          )
        )}
      </div>

      {archivedEvents.length > 6 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 16,
            borderTop:
              '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            type="button"
            className="secondary"
            onClick={() =>
              router.push('/show-history')
            }
          >
            View All {archivedEvents.length} Shows
          </button>
        </div>
      )}
    </>
  )}
</section>
    </SVShell>
  );
}