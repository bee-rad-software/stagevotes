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
  .select('results_reveal_step')
  .eq('id', tournamentEventId)
  .maybeSingle();

setRevealStep(
  tournamentEvent?.results_reveal_step || 0
);

    const {
      data: entryData,
    } = await supabase
      .from('tournament_event_entries')
      .select(`
        tournament_entry_id,
        placement,
        average_score,
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

            singerName,

            photoUrl:
              singerProfile
                ?.photo_url || null,

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
          🏆 QUALIFIER COMPLETE
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
              {result.average_score !== null
                ? Number(
                    result.average_score
                  ).toFixed(2)
                : '—'}
            </div>

            {result.advanced && (
              <div className="sv-tournament-tv-advances">
                ✓ ADVANCES
              </div>
            )}
          </div>
        ))}
      </section>

      {revealStep >= 4 && (
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
    </main>
  );
}