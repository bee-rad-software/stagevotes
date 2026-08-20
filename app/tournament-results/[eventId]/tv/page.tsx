'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ResultRow = {
  tournament_entry_id: string;
  placement: number | null;

  average_score: number | null;
  judge_score: number | null;

  peoples_choice_votes: number;
  peoples_choice_score: number | null;

  official_score: number | null;

  singerName: string;
  photoUrl: string | null;
  advanced: boolean;
};

export default function TournamentResultsTvPage() {
  const params = useParams<{
    eventId: string;
  }>();

  const eventId = params.eventId;

  const [loading, setLoading] =
    useState(true);

  const [eventName, setEventName] =
    useState('Tournament Results');

  const [venueName, setVenueName] =
    useState('');

  const [
    destinationName,
    setDestinationName,
  ] = useState<string | null>(null);

  const [
  isFinalRound,
  setIsFinalRound,
] = useState(false);

const [
  tournamentName,
  setTournamentName,
] = useState('Tournament');

  const [results, setResults] =
    useState<ResultRow[]>([]);

  const [
  revealStep,
  setRevealStep,
] = useState(0);

  useEffect(() => {
  if (!eventId) return;

  loadResults();

  let channel: ReturnType<
    typeof supabase.channel
  > | null = null;

  async function subscribeToReveal() {
    const { data: stageEvent } =
      await supabase
        .from('events')
        .select('tournament_event_id')
        .eq('id', eventId)
        .maybeSingle();

    if (!stageEvent?.tournament_event_id) {
      return;
    }

    channel = supabase
      .channel(
        `tournament-results-${stageEvent.tournament_event_id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournament_events',
          filter:
            `id=eq.${stageEvent.tournament_event_id}`,
        },
        (payload: any) => {
          setRevealStep(
            payload.new
              ?.results_reveal_step || 0
          );
        }
      )
      .subscribe();
  }

  subscribeToReveal();

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [eventId]);

  async function loadResults() {
    const {
      data: stageEvent,
    } = await supabase
      .from('events')
      .select(`
        id,
        name,
        venue,
        tournament_event_id
      `)
      .eq('id', eventId)
      .maybeSingle();

    if (!stageEvent?.tournament_event_id) {
      setLoading(false);
      return;
    }

    setEventName(
      stageEvent.name ||
        'Tournament Results'
    );

    setVenueName(
      stageEvent.venue || ''
    );

    const tournamentEventId =
      stageEvent.tournament_event_id;

   const {
  data: tournamentEvent,
} = await supabase
  .from('tournament_events')
  .select(`
    results_reveal_step,
    tournaments (
      name
    ),
    tournament_rounds (
      round_type
    )
  `)
  .eq('id', tournamentEventId)
  .maybeSingle();

setRevealStep(
  tournamentEvent?.results_reveal_step || 0
);

const tournament =
  Array.isArray(
    (tournamentEvent as any)?.tournaments
  )
    ? (tournamentEvent as any)
        .tournaments[0] || null
    : (tournamentEvent as any)
        ?.tournaments || null;

const round =
  Array.isArray(
    (tournamentEvent as any)
      ?.tournament_rounds
  )
    ? (tournamentEvent as any)
        .tournament_rounds[0] || null
    : (tournamentEvent as any)
        ?.tournament_rounds || null;

setTournamentName(
  tournament?.name || 'Tournament'
);

setIsFinalRound(
  round?.round_type === 'final'
);

    const {
      data: entryData,
    } = await supabase
      .from('tournament_event_entries')
      .select(`
        tournament_entry_id,
placement,
average_score,
judge_score,
peoples_choice_votes,
peoples_choice_score,
official_score,
        tournament_entries!inner (
          singer_profile_id,
          singer_profiles (
            display_name,
            stage_name,
            photo_url
          )
        )
      `)
      .eq(
        'tournament_event_id',
        tournamentEventId
      )
      .not(
        'placement',
        'is',
        null
      )
      .order(
        'placement',
        {
          ascending: true,
        }
      );

    const {
      data: advancementData,
    } = await supabase
      .from('tournament_advancements')
      .select(`
        tournament_entry_id,
        to_tournament_event_id
      `)
      .eq(
        'from_tournament_event_id',
        tournamentEventId
      );

    const advancementIds =
      new Set(
        (advancementData || []).map(
          (item: any) =>
            item.tournament_entry_id
        )
      );

    const destinationId =
      advancementData?.[0]
        ?.to_tournament_event_id ||
      null;

    if (destinationId) {
      const {
        data: destination,
      } = await supabase
        .from('tournament_events')
        .select('name')
        .eq(
          'id',
          destinationId
        )
        .maybeSingle();

      setDestinationName(
        destination?.name || null
      );
    }

    const normalized: ResultRow[] =
      (entryData || []).map(
        (entry: any) => {
          const tournamentEntry =
            Array.isArray(
              entry.tournament_entries
            )
              ? entry
                  .tournament_entries[0] ||
                null
              : entry
                  .tournament_entries ||
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

          const singerName =
            singerProfile
              ?.stage_name?.trim() ||
            singerProfile
              ?.display_name?.trim() ||
            'Tournament Singer';

          return {
  tournament_entry_id:
    entry.tournament_entry_id,

  placement:
    entry.placement,

  average_score:
    entry.average_score,

  judge_score:
    entry.judge_score,

  peoples_choice_votes:
    entry.peoples_choice_votes ?? 0,

  peoples_choice_score:
    entry.peoples_choice_score,

  official_score:
    entry.official_score,

  singerName,

  photoUrl:
    singerProfile?.photo_url || null,

  advanced:
    advancementIds.has(
      entry.tournament_entry_id
    ),
};
        }
      );

    setResults(normalized);
    setLoading(false);
  }

  const podium = results.slice(0, 3);

  if (loading) {
    return (
      <main className="sv-tournament-tv-page">
        Loading results...
      </main>
    );
  }

  return (
    <main className="sv-tournament-tv-page">
      <section className="sv-tournament-tv-header">
        <div className="sv-tournament-tv-kicker">
  {isFinalRound
    ? '🏆 CHAMPIONSHIP FINAL'
    : '🏆 QUALIFIER COMPLETE'}
</div>

        <h1>{eventName}</h1>

        {venueName && (
          <p>{venueName}</p>
        )}
      </section>

      <section className="sv-tournament-tv-podium">
       {podium
  .filter((result) => {
    if (result.placement === 3) {
      return revealStep >= 1;
    }

    if (result.placement === 2) {
      return revealStep >= 2;
    }

    if (result.placement === 1) {
      return revealStep >= 3;
    }

    return false;
  })
  .map((result) => (
          <div
            key={
              result.tournament_entry_id
            }
            className={`sv-tournament-tv-place sv-tournament-tv-place-${result.placement}`}
          >
            <div className="sv-tournament-tv-medal">
              {result.placement === 1
                ? '🥇'
                : result.placement === 2
                ? '🥈'
                : '🥉'}
            </div>

            <div className="sv-tournament-tv-avatar">
              {result.photoUrl ? (
                <img
                  src={result.photoUrl}
                  alt={result.singerName}
                />
              ) : (
                <span>
                  {result.singerName
                    .split(/\s+/)
                    .map(
                      (word) => word[0]
                    )
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <h2>
              {result.singerName}
            </h2>

            <div className="sv-tournament-tv-score">
  {result.official_score !== null
    ? Number(
        result.official_score
      ).toFixed(2)
    : '—'}

  <span>OFFICIAL</span>
</div>

<div className="sv-tournament-tv-score-breakdown">
  <span>
    JUDGES
    <strong>
      {result.judge_score !== null
        ? `${Number(
            result.judge_score
          ).toFixed(2)} / 5`
        : '—'}
    </strong>
  </span>

  <span>
    PEOPLE&apos;S CHOICE
    <strong>
      {result.peoples_choice_votes}{' '}
      {result.peoples_choice_votes === 1
        ? 'vote'
        : 'votes'}
    </strong>
  </span>
</div>

            {isFinalRound &&
result.placement === 1 ? (
  <div className="sv-tournament-tv-advances">
    🏆 CHAMPION
  </div>
) : result.advanced ? (
  <div className="sv-tournament-tv-advances">
    ✓ ADVANCES
  </div>
) : null}
          </div>
        ))}
      </section>

     {revealStep >= 4 && (
  <>
    {isFinalRound && results[0] ? (
      <section className="sv-tournament-tv-moving-on">
        <span>
          🏆 TOURNAMENT CHAMPION
        </span>

        <h2>
          {results[0].singerName}
        </h2>

        <div className="sv-tournament-tv-advancer-list">
          <strong>
            🏆 {tournamentName} Champion
          </strong>
        </div>

        <div className="sv-tournament-tv-next-stop">
          OFFICIAL SCORE
<strong>
  {results[0].official_score !== null
    ? Number(
        results[0].official_score
      ).toFixed(2)
    : 'Champion'}
</strong>
        </div>
      </section>
    ) : (
      <section className="sv-tournament-tv-moving-on">
        <span>MOVING ON</span>

        <h2>
          {
            results.filter(
              (result) => result.advanced
            ).length
          }{' '}
          {results.filter(
            (result) => result.advanced
          ).length === 1
            ? 'Singer Is Moving On'
            : 'Singers Are Moving On'}
        </h2>

        <div className="sv-tournament-tv-advancer-list">
          {results
            .filter(
              (result) =>
                result.advanced
            )
            .map((result) => (
              <strong
                key={
                  result.tournament_entry_id
                }
              >
                🏆 {result.singerName}
              </strong>
            ))}
        </div>

        {destinationName && (
          <div className="sv-tournament-tv-next-stop">
            NEXT STOP

            <strong>
              {destinationName}
            </strong>
          </div>
        )}
      </section>
    )}
  </>
)}
    </main>
  );
}