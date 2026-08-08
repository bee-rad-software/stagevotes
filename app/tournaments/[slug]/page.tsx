'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import { supabase } from '@/lib/supabase';

type Tournament = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status:
    | 'draft'
    | 'open'
    | 'active'
    | 'completed'
    | 'archived';
  starts_at: string | null;
  ends_at: string | null;
  cover_photo_url: string | null;
  logo_url: string | null;
};

type TournamentRound = {
  id: string;
  tournament_id: string;
  name: string;
  round_type:
    | 'local'
    | 'regional'
    | 'state'
    | 'national'
    | 'final'
    | 'custom';
  round_order: number;
  default_advancement_count: number | null;
};

type TournamentEvent = {
  id: string;
  tournament_id: string;
  round_id: string;
  venue_id: string | null;
  event_id: string | null;
  name: string;
  status:
    | 'scheduled'
    | 'registration_open'
    | 'live'
    | 'completed'
    | 'cancelled';
  starts_at: string | null;
  advancement_count: number | null;
  venues: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
  } | null;
};

type TournamentPath = {
  id: string;
  from_tournament_event_id: string;
  to_tournament_event_id: string;
};

type QualifiedSinger = {
  tournament_event_id: string;
  tournament_entry_id: string;
  status:
    | 'eligible'
    | 'confirmed'
    | 'competed'
    | 'advanced'
    | 'eliminated'
    | 'withdrawn'
    | 'alternate';
  seed: number | null;
  placement: number | null;
  average_score: number | null;
  stage_name: string | null;
  display_name: string | null;
  photo_url: string | null;
  source_event_name: string | null;
};

export default function PublicTournamentPage() {
  const params = useParams<{
    slug: string;
  }>();

  const slug = params.slug;

  const [tournament, setTournament] =
    useState<Tournament | null>(null);

  const [rounds, setRounds] =
    useState<TournamentRound[]>([]);

  const [events, setEvents] =
    useState<TournamentEvent[]>([]);

  const [paths, setPaths] =
    useState<TournamentPath[]>([]);

  const [qualifiedSingers, setQualifiedSingers] =
    useState<QualifiedSinger[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    if (!slug) return;

    async function loadTournament() {
      setLoading(true);
      setMessage('');

      const {
        data: tournamentData,
        error: tournamentError,
      } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          slug,
          description,
          status,
          starts_at,
          ends_at,
          cover_photo_url,
          logo_url
        `)
        .eq('slug', slug)
        .in('status', [
          'open',
          'active',
          'completed',
        ])
        .maybeSingle();

      if (tournamentError) {
        console.error(
          'Unable to load tournament:',
          tournamentError
        );

        setMessage(
          'We could not load this championship.'
        );

        setLoading(false);
        return;
      }

      if (!tournamentData) {
        setMessage(
          'This championship could not be found.'
        );

        setLoading(false);
        return;
      }

      const loadedTournament =
        tournamentData as Tournament;

      setTournament(loadedTournament);

      const {
        data: roundData,
        error: roundError,
      } = await supabase
        .from('tournament_rounds')
        .select(`
          id,
          tournament_id,
          name,
          round_type,
          round_order,
          default_advancement_count
        `)
        .eq(
          'tournament_id',
          loadedTournament.id
        )
        .order('round_order', {
          ascending: true,
        });

      if (roundError) {
        console.error(
          'Unable to load tournament rounds:',
          roundError
        );
      }

      const loadedRounds =
        (roundData || []) as TournamentRound[];

      setRounds(loadedRounds);

      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from('tournament_events')
        .select(`
          id,
          tournament_id,
          round_id,
          venue_id,
          event_id,
          name,
          status,
          starts_at,
          advancement_count,
          venues (
            id,
            name,
            slug,
            city,
            state
          )
        `)
        .eq(
          'tournament_id',
          loadedTournament.id
        )
        .order('starts_at', {
          ascending: true,
          nullsFirst: false,
        });

      if (eventError) {
        console.error(
          'Unable to load tournament events:',
          eventError
        );
      }

      const loadedEvents: TournamentEvent[] =
        (eventData || []).map(
          (event: any) => ({
            ...event,

            venues: Array.isArray(
              event.venues
            )
              ? event.venues[0] || null
              : event.venues || null,
          })
        );

      setEvents(loadedEvents);

      const {
        data: pathData,
        error: pathError,
      } = await supabase
        .from('tournament_event_paths')
        .select(`
          id,
          from_tournament_event_id,
          to_tournament_event_id
        `)
        .eq(
          'tournament_id',
          loadedTournament.id
        );

      if (pathError) {
        console.error(
          'Unable to load tournament paths:',
          pathError
        );
      }

      setPaths(
        (pathData || []) as TournamentPath[]
      );

      const {
        data: advancementData,
        error: advancementError,
      } = await supabase
        .from('tournament_advancements')
        .select(`
          tournament_entry_id,
          from_tournament_event_id,
          to_tournament_event_id
        `)
        .eq(
          'tournament_id',
          loadedTournament.id
        );

      if (advancementError) {
        console.error(
          'Unable to load tournament advancement sources:',
          advancementError
        );
      }

      const sourceLookup = new Map<
        string,
        string
      >();

      (advancementData || []).forEach(
        (advancement: any) => {
          sourceLookup.set(
            `${advancement.tournament_entry_id}:${advancement.to_tournament_event_id}`,
            advancement.from_tournament_event_id
          );
        }
      );

      const {
        data: entryData,
        error: entryError,
      } = await supabase
        .from('tournament_event_entries')
        .select(`
          tournament_event_id,
          tournament_entry_id,
          status,
          seed,
          placement,
          average_score,
          tournament_entries!inner (
            tournament_id,
            singer_profile_id,
            singer_profiles (
              stage_name,
              display_name,
              photo_url
            )
          )
        `)
        .eq(
          'tournament_entries.tournament_id',
          loadedTournament.id
        );

      if (entryError) {
        console.error(
          'Unable to load tournament competitors:',
          entryError
        );

        setQualifiedSingers([]);
      } else {
        const normalizedSingers: QualifiedSinger[] =
          (entryData || []).map(
            (entry: any) => {
              const tournamentEntry =
                Array.isArray(
                  entry.tournament_entries
                )
                  ? entry.tournament_entries[0] ||
                    null
                  : entry.tournament_entries ||
                    null;

              const singerProfile =
                Array.isArray(
                  tournamentEntry
                    ?.singer_profiles
                )
                  ? tournamentEntry
                      .singer_profiles[0] ||
                    null
                  : tournamentEntry
                      ?.singer_profiles ||
                    null;

              const sourceEventId =
                sourceLookup.get(
                  `${entry.tournament_entry_id}:${entry.tournament_event_id}`
                ) || null;

              const sourceEvent =
                loadedEvents.find(
                  (event) =>
                    event.id ===
                    sourceEventId
                );

              return {
                tournament_event_id:
                  entry.tournament_event_id,
                tournament_entry_id:
                  entry.tournament_entry_id,
                status: entry.status,
                seed: entry.seed,
                placement:
                  entry.placement,
                average_score:
                  entry.average_score,
                stage_name:
                  singerProfile
                    ?.stage_name || null,
                display_name:
                  singerProfile
                    ?.display_name || null,
                photo_url:
                  singerProfile
                    ?.photo_url || null,
                source_event_name:
                  sourceEvent?.name || null,
              };
            }
          );

        setQualifiedSingers(
          normalizedSingers
        );
      }

      setLoading(false);
    }

    loadTournament();
  }, [slug]);

  const currentEvent = useMemo(() => {
    const liveEvent = events.find(
      (event) => event.status === 'live'
    );

    if (liveEvent) {
      return liveEvent;
    }

    return events.find(
      (event) =>
        event.status ===
          'registration_open' ||
        event.status === 'scheduled'
    );
  }, [events]);

  const completedEventCount =
    events.filter(
      (event) =>
        event.status === 'completed'
    ).length;

  const totalCompetitors = new Set(
    qualifiedSingers.map(
      (singer) =>
        singer.tournament_entry_id
    )
  ).size;

  if (loading) {
    return (
      <SVSingerShell
        title="Championships"
        subtitle="Loading tournament"
      >
        <main className="sv-public-tournament-page">
          <div className="sv-tournaments-empty">
            Loading championship...
          </div>
        </main>
      </SVSingerShell>
    );
  }

  if (!tournament) {
    return (
      <SVSingerShell
        title="Championships"
        subtitle="Tournament unavailable"
      >
        <main className="sv-public-tournament-page">
          <div className="sv-tournaments-empty">
            {message ||
              'Tournament not found.'}
          </div>
        </main>
      </SVSingerShell>
    );
  }

  return (
    <SVSingerShell
      title={tournament.name}
      subtitle="StageVotes Championship"
    >
      <main className="sv-public-tournament-page">
        <section
          className="sv-public-tournament-hero"
          style={
            tournament.cover_photo_url
              ? {
                  backgroundImage: `
                    linear-gradient(
                      110deg,
                      rgba(2, 6, 23, 0.96),
                      rgba(28, 20, 26, 0.8)
                    ),
                    url("${tournament.cover_photo_url}")
                  `,
                }
              : undefined
          }
        >
          <div className="sv-public-tournament-hero-copy">
            <Link
              href="/tournaments"
              className="sv-public-tournament-back"
            >
              ← All Championships
            </Link>

            <div className="sv-tournaments-eyebrow">
              StageVotes Championship
            </div>

            <h1>{tournament.name}</h1>

            <p>
              {tournament.description ||
                'Follow every qualifier, regional round, and championship event.'}
            </p>

            <div className="sv-public-tournament-hero-meta">
              <span>
                {tournament.status}
              </span>

              <span>
                {rounds.length}{' '}
                {rounds.length === 1
                  ? 'round'
                  : 'rounds'}
              </span>

              <span>
                {events.length}{' '}
                {events.length === 1
                  ? 'event'
                  : 'events'}
              </span>
            </div>
          </div>

          <div className="sv-public-tournament-hero-logo">
            {tournament.logo_url ? (
              <img
                src={tournament.logo_url}
                alt={`${tournament.name} logo`}
              />
            ) : (
              '🏆'
            )}
          </div>
        </section>

        <section className="sv-public-tournament-summary">
          <div>
            <strong>
              {completedEventCount}
            </strong>

            <span>Events Completed</span>
          </div>

          <div>
            <strong>
              {totalCompetitors}
            </strong>

            <span>Competitors</span>
          </div>

          <div>
            <strong>
              {currentEvent
                ? 'Active'
                : tournament.status ===
                    'completed'
                  ? 'Complete'
                  : 'Scheduled'}
            </strong>

            <span>Tournament Status</span>
          </div>
        </section>

        {currentEvent && (
          <section className="sv-public-tournament-next">
            <div>
              <span>
                {currentEvent.status ===
                'live'
                  ? 'Live Now'
                  : 'Next Tournament Event'}
              </span>

              <h2>{currentEvent.name}</h2>

              <p>
                {currentEvent.venues?.name ||
                  'Venue to be announced'}
              </p>
            </div>

            <div className="sv-public-tournament-next-meta">
              <strong>
                {currentEvent.starts_at
                  ? new Date(
                      currentEvent.starts_at
                    ).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Date coming soon'}
              </strong>

              {currentEvent.event_id && (
                <Link
                  href={`/leaderboard/${currentEvent.event_id}`}
                >
                  View Event →
                </Link>
              )}
            </div>
          </section>
        )}

        <section className="sv-public-tournament-bracket-section">
          <div className="sv-public-tournament-heading">
            <span>Championship Bracket</span>
            <h2>The Road to the Title</h2>
            <p>
              Each hosted event feeds advancing
              singers into the next stage.
            </p>
          </div>

          <div className="sv-public-tournament-bracket">
            {rounds.map(
              (round, roundIndex) => {
                const roundEvents =
                  events.filter(
                    (event) =>
                      event.round_id ===
                      round.id
                  );

                return (
                  <div
                    key={round.id}
                    className="sv-public-tournament-round-column"
                  >
                    <div className="sv-public-tournament-round-heading">
                      <span>
                        Round {roundIndex + 1}
                      </span>

                      <h3>{round.name}</h3>
                    </div>

                    <div className="sv-public-tournament-round-events">
                      {roundEvents.length >
                      0 ? (
                        roundEvents.map(
                          (event) => {
                            const outgoingPaths =
                              paths.filter(
                                (path) =>
                                  path.from_tournament_event_id ===
                                  event.id
                              );

                            const eventSingers =
                              qualifiedSingers.filter(
                                (singer) =>
                                  singer.tournament_event_id ===
                                  event.id
                              );

                            return (
                              <article
                                key={event.id}
                                className={[
                                  'sv-public-tournament-event',
                                  `sv-public-tournament-event-${event.status}`,
                                ].join(' ')}
                              >
                                <div className="sv-public-tournament-event-top">
                                  <span>
                                    {event.status}
                                  </span>

                                  {event.status ===
                                    'completed' && (
                                    <strong>✓</strong>
                                  )}
                                </div>

                                <h4>
                                  {event.name}
                                </h4>

                                <p>
                                  📍{' '}
                                  {event.venues
                                    ?.name ||
                                    'Venue not assigned'}
                                </p>

                                <p>
                                  🎟️ Top{' '}
                                  {event.advancement_count ||
                                    round.default_advancement_count ||
                                    '—'}{' '}
                                  advance
                                </p>

                                {eventSingers.length >
                                  0 && (
                                  <div className="sv-public-tournament-event-singers">
                                    {eventSingers
                                      .slice(0, 4)
                                      .map(
                                        (
                                          singer
                                        ) => {
                                          const singerName =
                                            singer.stage_name?.trim() ||
                                            singer.display_name?.trim() ||
                                            'Tournament Singer';

                                          return (
                                            <div
                                              key={
                                                singer.tournament_entry_id
                                              }
                                            >
                                              <span>
                                                {singer.seed
                                                  ? `#${singer.seed}`
                                                  : singer.placement
                                                    ? `#${singer.placement}`
                                                    : '•'}
                                              </span>

                                              <strong>
                                                {
                                                  singerName
                                                }
                                              </strong>
                                            </div>
                                          );
                                        }
                                      )}

                                    {eventSingers.length >
                                      4 && (
                                      <small>
                                        +
                                        {eventSingers.length -
                                          4}{' '}
                                        more
                                      </small>
                                    )}
                                  </div>
                                )}

                                {outgoingPaths.length >
                                  0 && (
                                  <div className="sv-public-tournament-event-feeds">
                                    Feeds next round →
                                  </div>
                                )}

                                {event.event_id && (
                                  <Link
                                    href={`/leaderboard/${event.event_id}`}
                                  >
                                    View Results
                                  </Link>
                                )}
                              </article>
                            );
                          }
                        )
                      ) : (
                        <div className="sv-public-tournament-no-events">
                          Events coming soon
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="sv-public-tournament-qualified-section">
          <div className="sv-public-tournament-heading">
            <span>Still in the Hunt</span>
            <h2>Qualified Competitors</h2>
          </div>

          <div className="sv-public-tournament-qualified-grid">
            {qualifiedSingers.filter(
              (singer) =>
                singer.status ===
                  'eligible' ||
                singer.status ===
                  'confirmed'
            ).length > 0 ? (
              qualifiedSingers
                .filter(
                  (singer) =>
                    singer.status ===
                      'eligible' ||
                    singer.status ===
                      'confirmed'
                )
                .map((singer) => {
                  const singerName =
                    singer.stage_name?.trim() ||
                    singer.display_name?.trim() ||
                    'Tournament Singer';

                  return (
                    <article
                      key={`${singer.tournament_event_id}:${singer.tournament_entry_id}`}
                      className="sv-public-tournament-qualified-card"
                    >
                      <div className="sv-public-tournament-qualified-avatar">
                        {singer.photo_url ? (
                          <img
                            src={
                              singer.photo_url
                            }
                            alt={singerName}
                          />
                        ) : (
                          singerName
                            .split(/\s+/)
                            .map(
                              (word) =>
                                word[0]
                            )
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>

                      <div>
                        <span>
                          {singer.seed
                            ? `Seed #${singer.seed}`
                            : 'Qualified'}
                        </span>

                        <h3>
                          {singerName}
                        </h3>

                        <p>
                          {singer.source_event_name
                            ? `Advanced from ${singer.source_event_name}`
                            : 'Tournament competitor'}
                        </p>
                      </div>
                    </article>
                  );
                })
            ) : (
              <div className="sv-tournaments-empty">
                Qualified competitors will appear
                as tournament events are completed.
              </div>
            )}
          </div>
        </section>
      </main>
    </SVSingerShell>
  );
}