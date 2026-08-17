'use client';

import {
  useEffect,
  useState,
} from 'react';
import {
  useParams,
  useRouter,
} from 'next/navigation';

import { supabase } from '@/lib/supabase';
import SVShell from '@/components/ui/SVShell';

type ResultRow = {
  tournament_entry_id: string;
  placement: number | null;
  average_score: number | null;
  status: string;
  singerName: string;
  photoUrl: string | null;
  advanced: boolean;
};

export default function TournamentResultsPage() {
  const params = useParams<{
    eventId: string;
  }>();

  const router = useRouter();

  const eventId = params.eventId;

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState('');

  const [
    eventName,
    setEventName,
  ] = useState('Tournament Event');

  const [
    venueName,
    setVenueName,
  ] = useState('');

  const [
    tournamentEventId,
    setTournamentEventId,
  ] = useState<string | null>(null);

  const [
    destinationName,
    setDestinationName,
  ] = useState<string | null>(null);

  const [
    advancementCount,
    setAdvancementCount,
  ] = useState<number | null>(null);

  const [
    results,
    setResults,
  ] = useState<ResultRow[]>([]);

  const [
  revealStep,
  setRevealStep,
] = useState(0);

  useEffect(() => {
    if (!eventId) return;

    loadResults();
  }, [eventId]);

  async function loadResults() {
    setLoading(true);
    setMessage('');

    /*
     * Step 1:
     * Load the normal StageVotes event
     * and find its tournament event.
     */
    const {
      data: stageEvent,
      error: eventError,
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

    if (
      eventError ||
      !stageEvent?.tournament_event_id
    ) {
      console.error(
        'Unable to load tournament event:',
        eventError
      );

      setMessage(
        'Tournament results could not be found.'
      );

      setLoading(false);
      return;
    }

    setEventName(
      stageEvent.name ||
        'Tournament Event'
    );

    setVenueName(
      stageEvent.venue || ''
    );

    setTournamentEventId(
      stageEvent.tournament_event_id
    );

    /*
     * Step 2:
     * Load this tournament event.
     */
    const {
      data: tournamentEvent,
      error: tournamentEventError,
    } = await supabase
      .from('tournament_events')
      .select(`
  id,
  tournament_id,
  name,
  advancement_count,
  results_reveal_step
`)
      .eq(
        'id',
        stageEvent.tournament_event_id
      )
      .maybeSingle();

    if (
      tournamentEventError ||
      !tournamentEvent
    ) {
      console.error(
        'Unable to load tournament event details:',
        tournamentEventError
      );

      setMessage(
        'Tournament event details could not be loaded.'
      );

      setLoading(false);
      return;
    }

    setAdvancementCount(
      tournamentEvent.advancement_count ||
        null
    );

    setRevealStep(
  tournamentEvent.results_reveal_step || 0
);

    /*
     * Step 3:
     * Load final placements.
     */
    const {
      data: entryData,
      error: entryError,
    } = await supabase
      .from('tournament_event_entries')
      .select(`
        tournament_entry_id,
        placement,
        average_score,
        status,
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
        tournamentEvent.id
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

    if (entryError) {
      console.error(
        'Unable to load tournament standings:',
        entryError
      );

      setMessage(
        'Final standings could not be loaded.'
      );

      setLoading(false);
      return;
    }

    /*
     * Step 4:
     * Load permanent advancement records
     * for this event.
     */
    const {
      data: advancementData,
      error: advancementError,
    } = await supabase
      .from('tournament_advancements')
      .select(`
        tournament_entry_id,
        to_tournament_event_id
      `)
      .eq(
        'from_tournament_event_id',
        tournamentEvent.id
      );

    if (advancementError) {
      console.error(
        'Unable to load advancements:',
        advancementError
      );
    }

    const advancementIds =
      new Set(
        (advancementData || []).map(
          (item: any) =>
            item.tournament_entry_id
        )
      );

    /*
     * Step 5:
     * Find the next tournament event.
     */
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

    /*
     * Normalize Supabase relation shapes.
     */
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

            status:
              entry.status,

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

  if (loading) {
    return (
      <SVShell
        title="Tournament Results"
        subtitle="Finalizing standings"
      >
        <div className="sv-card">
          Finalizing tournament results...
        </div>
      </SVShell>
    );
  }

  async function updateRevealStep(
  nextStep: number
) {
  if (!tournamentEventId) return;

  const { error } = await supabase
    .from('tournament_events')
    .update({
      results_reveal_step: nextStep,
    })
    .eq(
      'id',
      tournamentEventId
    );

  if (error) {
    console.error(
      'Unable to update reveal step:',
      error
    );

    return;
  }

  setRevealStep(nextStep);
}

  return (
    <SVShell
      title="Tournament Results"
      subtitle={venueName}
    >
      <main className="sv-tournament-results-page">
  <section className="sv-tournament-results-hero">
    <div className="sv-tournament-results-badge">
      🏆 Qualifier Complete
    </div>

    <h1>{eventName}</h1>

    {venueName && (
      <p>{venueName}</p>
    )}

    <div className="sv-tournament-results-summary">
      <strong>
        {results.length} Competitors
      </strong>

      <span>•</span>

      <strong>
        {
          results.filter(
            (result) => result.advanced
          ).length
        }{' '}
        Advance
      </strong>
    </div>
  </section>

  {message && (
    <div className="sv-card">
      {message}
    </div>
  )}

  {!message && (
    <>
      <section className="sv-tournament-results-section">
        <div className="sv-mobile-kicker">
          Final Standings
        </div>

        <h2>Competition Results</h2>

        <div className="sv-tournament-results-list">
          {results.map((result) => (
            <div
              key={result.tournament_entry_id}
              className={`sv-tournament-result-row ${
                result.advanced
                  ? 'sv-tournament-result-row-advanced'
                  : ''
              }`}
            >
              <div className="sv-tournament-result-place">
                {result.placement === 1
                  ? '🥇'
                  : result.placement === 2
                  ? '🥈'
                  : result.placement === 3
                  ? '🥉'
                  : `#${result.placement}`}
              </div>

              <div className="sv-tournament-result-avatar">
                {result.photoUrl ? (
                  <img
                    src={result.photoUrl}
                    alt={result.singerName}
                  />
                ) : (
                  <span>
                    {result.singerName
                      .split(/\s+/)
                      .map((word) => word[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
              </div>

             <div className="sv-tournament-result-copy">
  <strong>
    {result.singerName}
  </strong>

  <span>
    {result.advanced
      ? 'Moving on to the next round'
      : 'Final placement'}
  </span>
</div>

<div className="sv-tournament-result-score">
  <strong>
    {result.average_score !== null
      ? Number(
          result.average_score
        ).toFixed(2)
      : '—'}
  </strong>

  <span>/ 5</span>
</div>

{result.advanced && (
  <div className="sv-tournament-result-advanced">
    ✓ ADVANCES
  </div>
)}
            </div>
          ))}
        </div>
      </section>

      {results.some(
        (result) => result.advanced
      ) && (
        <section className="sv-tournament-advance-card">
          <div className="sv-mobile-kicker">
            Moving On
          </div>

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

          <div className="sv-tournament-advancers">
            {results
              .filter(
                (result) => result.advanced
              )
              .map((result) => (
                <div
                  key={
                    result.tournament_entry_id
                  }
                  className="sv-tournament-advancer-chip"
                >
                  🏆 {result.singerName}
                </div>
              ))}
          </div>

          {destinationName && (
            <div className="sv-tournament-next-event">
              <span>ADVANCING TO</span>

              <strong>
                {destinationName}
              </strong>
            </div>
          )}
        </section>
      )}

      <div className="sv-tournament-results-actions">
  <button
    type="button"
    onClick={() =>
      router.push('/')
    }
  >
    Back to Host Home
  </button>

  {revealStep === 0 && (
  <button
    type="button"
    className="primary"
    onClick={() => {
      window.open(
        `/tournament-results/${eventId}/tv`,
        '_blank'
      );

      updateRevealStep(1);
    }}
  >
    Reveal 3rd Place
  </button>
)}

  {revealStep === 1 && (
    <button
      type="button"
      className="primary"
      onClick={() =>
        updateRevealStep(2)
      }
    >
      Reveal 2nd Place
    </button>
  )}

  {revealStep === 2 && (
    <button
      type="button"
      className="primary"
      onClick={() =>
        updateRevealStep(3)
      }
    >
      🏆 Reveal Champion
    </button>
  )}

  {revealStep === 3 && (
    <button
      type="button"
      className="primary"
      onClick={() =>
        updateRevealStep(4)
      }
    >
      Reveal Who's Moving On
    </button>
  )}

  {revealStep === 4 && (
    <button
      type="button"
      className="primary"
      onClick={() =>
        window.open(
          `/tournament-results/${eventId}/tv`,
          '_blank'
        )
      }
    >
      🏆 Open Results TV
    </button>
  )}

  {revealStep > 0 && (
  <button
    type="button"
    onClick={() =>
      updateRevealStep(0)
    }
  >
    Reset Reveal
  </button>
)}
</div>
    </>
  )}
</main>
    </SVShell>
  );
}