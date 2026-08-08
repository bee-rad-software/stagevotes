'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function normalizeRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function formatEventDate(value: string | null) {
  if (!value) return 'Date coming soon';

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ChampionshipEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [loading, setLoading] = useState(true);

  const [event, setEvent] = useState<any>(null);
const [results, setResults] = useState<any[]>([]);
const [advancing, setAdvancing] = useState<any[]>([]);
const [tournament, setTournament] = useState<any>(null);
const [peopleChoice, setPeopleChoice] = useState<any>(null);
const [message, setMessage] = useState('');
const [officialResult, setOfficialResult] =
  useState<any>(null);
  const [tournamentPath, setTournamentPath] =
  useState<any[]>([]);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  async function loadEvent() {
  setLoading(true);
  setMessage('');

  const {
    data: eventData,
    error: eventError,
  } = await supabase
    .from('events')
    .select(`
      id,
      name,
      venue,
      venue_id,
      competition_mode,
      tournament_event_id,
      is_show_ended,
      is_voting_open,
      current_performance_id,
      venues (
        id,
        name,
        slug,
        city,
        state,
        logo_url,
        cover_photo_url
      )
    `)
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) {
    console.error(
      'Unable to load championship event:',
      eventError
    );

    setMessage(
      'We could not load this championship event.'
    );
    setLoading(false);
    return;
  }

  if (!eventData) {
    setMessage(
      'This championship event could not be found.'
    );
    setLoading(false);
    return;
  }

  setEvent(eventData);

  if (eventData.tournament_event_id) {
    const {
      data: tournamentEventData,
      error: tournamentEventError,
    } = await supabase
      .from('tournament_events')
      .select(`
        id,
        name,
        status,
        starts_at,
        advancement_count,
        tournament_id,
        round_id,
        tournaments (
          id,
          name,
          slug,
          description,
          status,
          logo_url,
          cover_photo_url
        ),
        tournament_rounds (
          id,
          name,
          round_type,
          round_order
        )
      `)
      .eq(
        'id',
        eventData.tournament_event_id
      )
      .maybeSingle();

    if (tournamentEventError) {
      console.error(
        'Unable to load tournament details:',
        tournamentEventError
      );
    } else if (tournamentEventData) {
      const tournamentRecord =
  normalizeRelation(
    tournamentEventData.tournaments
  );

const roundRecord =
  normalizeRelation(
    tournamentEventData.tournament_rounds
  );

      setTournament({
  ...tournamentRecord,
  tournamentEvent: {
    ...tournamentEventData,
    tournament_rounds: roundRecord,
  },
});

const {
  data: tournamentPathData,
  error: tournamentPathError,
} = await supabase
  .from('tournament_events')
  .select(`
    id,
    name,
    status,
    starts_at,
    event_id,
    tournament_id,
    round_id,
    tournament_rounds (
      id,
      name,
      round_order
    ),
    venues (
      id,
      name
    )
  `)
  .eq(
    'tournament_id',
    tournamentEventData.tournament_id
  );

if (tournamentPathError) {
  console.error(
    'Unable to load tournament path:',
    tournamentPathError
  );

  setTournamentPath([]);
} else {
  const normalizedPath =
    (tournamentPathData || [])
      .map((item: any) => {
        const round =
          Array.isArray(
            item.tournament_rounds
          )
            ? item.tournament_rounds[0] ||
              null
            : item.tournament_rounds ||
              null;

        const venue =
          Array.isArray(item.venues)
            ? item.venues[0] || null
            : item.venues || null;

        return {
          ...item,
          tournament_rounds: round,
          venues: venue,
        };
      })
      .sort(
        (a: any, b: any) =>
          (
            a.tournament_rounds
              ?.round_order || 999
          ) -
          (
            b.tournament_rounds
              ?.round_order || 999
          )
      );

  setTournamentPath(normalizedPath);
}

    }
  }

  
const {
  data: officialResult,
  error: officialResultError,
} = await supabase
  .from('event_results')
  .select(`
    id,
    event_id,
    event_name,
    venue_name,
    judge_winner_name,
    judge_score,
    peoples_choice_name,
    peoples_choice_votes,
    total_performers,
    total_judge_votes,
    total_people_votes,
    finished_at
  `)
  .eq('event_id', eventId)
  .maybeSingle();

if (officialResultError) {
  console.error(
    'Unable to load official event result:',
    officialResultError
  );
}

if (officialResult) {
  setOfficialResult(officialResult);

  setPeopleChoice({
    singerName:
      officialResult.peoples_choice_name,
    voteCount:
      officialResult.peoples_choice_votes || 0,
    totalVotes:
      officialResult.total_people_votes || 0,
  });
}

if (eventData.tournament_event_id) {
  const {
    data: tournamentResultData,
    error: tournamentResultError,
  } = await supabase
    .from('tournament_event_entries')
    .select(`
      status,
      placement,
      average_score,
      tournament_entry_id,
      tournament_entries!inner (
  singer_profile_id,
  singer_profiles (
    stage_name,
    display_name,
    photo_url
  )
),
feeds_to_event:tournament_events (
  id,
  name,
  round_id,
  tournament_rounds (
    name
  )
)
    `)
    .eq(
      'tournament_event_id',
      eventData.tournament_event_id
    )
    .not('placement', 'is', null)
    .order('placement', {
      ascending: true,
    });

  if (tournamentResultError) {
    console.error(
      'Unable to load official tournament standings:',
      tournamentResultError
    );

    setResults([]);
    setAdvancing([]);
  } else {

const {
  data: destinationData,
  error: destinationError,
} = await supabase
  .from('tournament_advancements')
  .select(`
    tournament_entry_id,
    to_tournament_event_id,
    tournament_events!tournament_advancements_to_tournament_event_id_fkey (
      id,
      name,
      starts_at,
      status,
      event_id,
      venues (
        id,
        name,
        slug,
        city,
        state
      ),
      tournament_rounds (
        id,
        name,
        round_type,
        round_order
      )
    )
  `)
  .eq(
    'from_tournament_event_id',
    eventData.tournament_event_id
  );

if (destinationError) {
  console.error(
    'Unable to load next tournament destinations:',
    destinationError
  );
}

const destinationLookup = new Map<
  string,
  any
>();

(destinationData || []).forEach(
  (advancement: any) => {
    const destinationEvent =
      Array.isArray(
        advancement.tournament_events
      )
        ? advancement.tournament_events[0] ||
          null
        : advancement.tournament_events ||
          null;

    destinationLookup.set(
      advancement.tournament_entry_id,
      destinationEvent
    );
  }
);

    const officialStandings =
      (tournamentResultData || []).map(
        (row: any) => {
          const entry =
            Array.isArray(
              row.tournament_entries
            )
              ? row.tournament_entries[0] ||
                null
              : row.tournament_entries ||
                null;

          const profile =
            Array.isArray(
              entry?.singer_profiles
            )
              ? entry.singer_profiles[0] ||
                null
              : entry?.singer_profiles ||
                null;

          return {
            tournamentEntryId:
              row.tournament_entry_id,

            singerProfileId:
              entry?.singer_profile_id ||
              null,

            singerName:
              profile?.stage_name?.trim() ||
              profile?.display_name?.trim() ||
              'Tournament Singer',

            photoUrl:
              profile?.photo_url || null,

            placement:
              row.placement,

            averageScore:
              row.average_score,

            status:
              row.status,

             nextEvent:
  destinationLookup.get(
    row.tournament_entry_id
  ) || null,
          };
        }
      );

    setResults(officialStandings);

    setAdvancing(
      officialStandings.filter(
        (singer) =>
          singer.status === 'advanced'
      )
    );
  }
}

  setLoading(false);
}

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: '#f8fafc',
          background: '#070b18',
        }}
      >
        Loading Championship...
      </main>
    );
  }

  if (message) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: '#fecaca',
        background: '#070b18',
        textAlign: 'center',
      }}
    >
      {message}
    </main>
  );
}

 const venueRecord =
  normalizeRelation(event?.venues);

const tournamentEvent =
  tournament?.tournamentEvent || null;

const tournamentRound =
  tournamentEvent?.tournament_rounds || null;

const eventStatus =
  tournamentEvent?.status ||
  (event?.is_show_ended
    ? 'completed'
    : 'scheduled');

const isLive =
  eventStatus === 'live' &&
  !event?.is_show_ended;

const eventDisplayName =
  tournamentEvent?.name ||
  event?.name ||
  'Championship Event';

return (
  <main className="sv-championship-event-page">
    <section
      className="sv-championship-event-hero"
      style={
        tournament?.cover_photo_url ||
        venueRecord?.cover_photo_url
          ? {
              backgroundImage: `
                linear-gradient(
                  110deg,
                  rgba(2, 6, 23, 0.97),
                  rgba(32, 23, 29, 0.82)
                ),
                url("${
                  tournament?.cover_photo_url ||
                  venueRecord?.cover_photo_url
                }")
              `,
            }
          : undefined
      }
    >
      <div className="sv-championship-event-hero-copy">
        <div className="sv-championship-event-kicker">
          {tournamentRound?.name ||
            'StageVotes Championship'}
        </div>

        <h1>{eventDisplayName}</h1>

        <p className="sv-championship-event-tournament-name">
          {tournament?.name ||
            'StageVotes Tournament'}
        </p>

        <div className="sv-championship-event-meta">
          <span>
            📍{' '}
            {venueRecord?.name ||
              event?.venue ||
              'Venue not assigned'}
          </span>

          <span>
            📅{' '}
            {formatEventDate(
              tournamentEvent?.starts_at ||
                null
            )}
          </span>

          <span>
            🎟️ Top{' '}
            {tournamentEvent
              ?.advancement_count || '—'}{' '}
            advance
          </span>
        </div>
      </div>

      <div className="sv-championship-event-hero-side">
        <div
          className={[
            'sv-championship-event-status',
            isLive
              ? 'sv-championship-event-status-live'
              : eventStatus === 'completed'
                ? 'sv-championship-event-status-completed'
                : 'sv-championship-event-status-scheduled',
          ].join(' ')}
        >
          <span />
          {isLive
            ? 'Live Now'
            : eventStatus === 'completed'
              ? 'Complete'
              : 'Scheduled'}
        </div>

        <div className="sv-championship-event-logo">
          {tournament?.logo_url ? (
            <img
              src={tournament.logo_url}
              alt={`${tournament.name} logo`}
            />
          ) : (
            '🏆'
          )}
        </div>
      </div>
    </section>

    <section className="sv-championship-event-status-grid">
      <div>
        <span>Tournament</span>
        <strong>
          {tournament?.name ||
            'Not connected'}
        </strong>
      </div>

      <div>
        <span>Round</span>
        <strong>
          {tournamentRound?.name ||
            'Championship Round'}
        </strong>
      </div>

      <div>
        <span>Judging</span>
        <strong>
          {event?.is_show_ended
            ? 'Closed'
            : event?.is_voting_open
              ? 'Open'
              : 'Waiting'}
        </strong>
      </div>
    </section>

<section className="sv-championship-results-section">
  <div className="sv-championship-section-heading">
    <span>Official Results</span>
    <h2>Championship Standings</h2>
    <p>
      Final judged scores from this tournament event.
    </p>
  </div>

  {results.length > 0 ? (
    <div className="sv-championship-results-grid">
      {results.map((result) => {
        const hasAdvanced =
  result.status === 'advanced';

        return (
          <article
            key={result.tournamentEntryId}
            className={[
              'sv-championship-result-card',
              result.placement <= 3
                ? `sv-championship-result-card-${result.placement}`
                : '',
            ].join(' ')}
          >
            <div className="sv-championship-result-placement">
              {result.placement === 1
                ? '🥇'
                : result.placement === 2
                  ? '🥈'
                  : result.placement === 3
                    ? '🥉'
                    : `#${result.placement}`}
            </div>

            <div className="sv-championship-result-copy">
              <span>
                {result.placement === 1
                  ? 'Champion'
                  : result.placement === 2
                    ? 'Runner-Up'
                    : result.placement === 3
                      ? 'Third Place'
                      : 'Final Standing'}
              </span>

              <h3>{result.singerName}</h3>

              <p>
  {result.status === 'advanced'
    ? 'Qualified for the next round'
    : 'Tournament result'}
</p>
            </div>

            <div className="sv-championship-result-score">
              <strong>
                {result.averageScore.toFixed(2)}
              </strong>

              <span>/ 5</span>
            </div>

            <div
              className={[
                'sv-championship-result-status',
                hasAdvanced
                  ? 'sv-championship-result-status-advanced'
                  : 'sv-championship-result-status-eliminated',
              ].join(' ')}
            >
              {hasAdvanced
                ? 'Advanced'
                : 'Eliminated'}
            </div>
          </article>
        );
      })}
    </div>
  ) : (
    <div className="sv-championship-empty-card">
      Judged results will appear here.
    </div>
  )}
</section>

<section className="sv-championship-advancing-section">
  <div className="sv-championship-section-heading">
    <span>Moving Forward</span>
    <h2>Advancing Singers</h2>
    <p>
      These competitors earned a place in the next round.
    </p>
  </div>

  {advancing.length > 0 ? (
    <div className="sv-championship-advancing-grid">
      {advancing
        .sort(
          (a, b) =>
            (a.placement || 999) -
            (b.placement || 999)
        )
        .map((singer) => (
         <article
  key={singer.tournamentEntryId}
  className="sv-championship-advancer-card"
>
  <div className="sv-championship-advancer-avatar">
    {singer.photoUrl ? (
      <img
        src={singer.photoUrl}
        alt={singer.singerName}
      />
    ) : (
      singer.singerName
        .split(/\s+/)
        .map((word: string) => word[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    )}
  </div>

  <div>
    <span>
      Seed #{singer.placement || '—'}
    </span>

    <h3>{singer.singerName}</h3>

    <div className="sv-championship-next-destination">
      <span>Next Destination</span>

      <h4>
        {singer.nextEvent?.name ||
          'Next round coming soon'}
      </h4>

      <p>
        📅{' '}
        {singer.nextEvent?.starts_at
          ? formatEventDate(
              singer.nextEvent.starts_at
            )
          : 'Date coming soon'}
      </p>

      <p>
        📍{' '}
        {normalizeRelation(
          singer.nextEvent?.venues
        )?.name || 'Venue coming soon'}
      </p>
    </div>

    {singer.nextEvent?.event_id && (
      <a
        href={`/championship-event/${singer.nextEvent.event_id}`}
        className="sv-championship-next-link"
      >
        View Next Event →
      </a>
    )}
  </div>

  <div className="sv-championship-advancer-badge">
    → Next Round
  </div>
</article>
        ))}
    </div>

  ) : (
    <div className="sv-championship-empty-card">
      Advancing singers will appear when results are processed.
    </div>
  )}
</section>

<section className="sv-championship-summary-section">
  <div className="sv-championship-section-heading">
    <span>Event Recap</span>
    <h2>Championship Summary</h2>
    <p>
      Official totals and winners from this tournament event.
    </p>
  </div>

  {officialResult ? (
    <div className="sv-championship-summary-grid">
      <article className="sv-championship-summary-card sv-championship-summary-card-winner">
        <span>Champion</span>

        <strong>
          {officialResult.judge_winner_name ||
            'No judged winner'}
        </strong>

        <p>
          {officialResult.judge_score !== null
            ? `${Number(
                officialResult.judge_score
              ).toFixed(2)} winning score`
            : 'No judged score recorded'}
        </p>
      </article>

      <article className="sv-championship-summary-card">
        <span>Performers</span>

        <strong>
          {officialResult.total_performers || 0}
        </strong>

        <p>
          Competitors in this event
        </p>
      </article>

      <article className="sv-championship-summary-card">
        <span>Judge Activity</span>

        <strong>
          {officialResult.total_judge_votes || 0}
        </strong>

        <p>
          Category scores submitted
        </p>
      </article>

      <article className="sv-championship-summary-card sv-championship-summary-card-crowd">
        <span>People’s Choice</span>

        <strong>
          {officialResult.peoples_choice_name ||
            'No audience winner'}
        </strong>

        <p>
          {officialResult.peoples_choice_name
            ? `${officialResult.peoples_choice_votes || 0} audience votes`
            : `${officialResult.total_people_votes || 0} total audience votes`}
        </p>
      </article>
    </div>
  ) : (
    <div className="sv-championship-empty-card">
      The official event summary will appear after the show ends.
    </div>
  )}
</section>

<section className="sv-championship-path-section">
  <div className="sv-championship-section-heading">
    <span>Road to the Title</span>

    <h2>Championship Journey</h2>

    <p>
      Follow each stage from the opening qualifier
      to the championship final.
    </p>
  </div>

  {tournamentPath.length > 0 ? (
    <div className="sv-championship-path-list">
      {tournamentPath.map(
        (pathEvent, index) => {
          const isCurrentEvent =
            pathEvent.id ===
              tournament?.tournamentEvent?.id ||
            pathEvent.event_id === eventId;

          const isCompleted =
            pathEvent.status === 'completed';

          const isLive =
            pathEvent.status === 'live';

          const statusLabel = isCurrentEvent
            ? event?.is_show_ended
              ? 'Current Event Complete'
              : 'You Are Here'
            : isCompleted
              ? 'Completed'
              : isLive
                ? 'Live Now'
                : 'Upcoming';

          return (
            <div
              key={pathEvent.id}
              className={[
                'sv-championship-path-item',
                isCurrentEvent
                  ? 'sv-championship-path-item-current'
                  : '',
                isCompleted
                  ? 'sv-championship-path-item-completed'
                  : '',
                isLive
                  ? 'sv-championship-path-item-live'
                  : '',
              ].join(' ')}
            >
              <div className="sv-championship-path-marker">
                {isCompleted
                  ? '✓'
                  : isLive
                    ? '●'
                    : index + 1}
              </div>

              <div className="sv-championship-path-copy">
                <span>
                  {pathEvent.tournament_rounds?.name ||
                    `Round ${index + 1}`}
                </span>

                <h3>{pathEvent.name}</h3>

                <p>
                  📍{' '}
                  {pathEvent.venues?.name ||
                    'Venue coming soon'}
                </p>

                <p>
                  📅{' '}
                  {pathEvent.starts_at
                    ? formatEventDate(
                        pathEvent.starts_at
                      )
                    : 'Date coming soon'}
                </p>
              </div>

              <div className="sv-championship-path-status">
                {statusLabel}
              </div>

              {pathEvent.event_id && (
                <a
                  href={`/championship-event/${pathEvent.event_id}`}
                  className="sv-championship-path-link"
                >
                  {isCurrentEvent
                    ? 'Current Event'
                    : isCompleted
                      ? 'View Results →'
                      : 'View Event →'}
                </a>
              )}

              {index <
                tournamentPath.length - 1 && (
                <div className="sv-championship-path-connector">
                  ↓
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  ) : (
    <div className="sv-championship-empty-card">
      The tournament journey will appear as events
      are scheduled.
    </div>
  )}
</section>

    {/* Live Status */}

    {/* Leaderboard */}

    {/* Advancing */}

    {/* People’s Choice */}

    {/* Judges */}

    {/* Venue */}

    {/* Tournament Progress */}
  </main>
);
}