'use client';

import Link from 'next/link';

type ChampionshipJourneyCardProps = {
  championships: any[];
};

function normalizeRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function formatEventDate(value?: string | null) {
  if (!value) return 'Date coming soon';

  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ChampionshipJourneyCard({
  championships,
}: ChampionshipJourneyCardProps) {
  const activeChampionship =
    championships.find((entry) => {
      const tournament = normalizeRelation(
        entry.tournaments
      );

      return (
        tournament?.status === 'active' ||
        tournament?.status === 'open'
      );
    }) || championships[0];

  if (!activeChampionship) {
    return null;
  }

  const tournament = normalizeRelation(
    activeChampionship.tournaments
  );

  if (!tournament) {
    return null;
  }

  const eventEntries =
    activeChampionship.tournament_event_entries ||
    [];

  const normalizedEvents = eventEntries
    .map((entry: any) => ({
      ...entry,

      tournament_events: normalizeRelation(
        entry.tournament_events
      ),
    }))
    .filter(
      (entry: any) =>
        entry.tournament_events
    )
    .sort(
      (a: any, b: any) =>
        (
          normalizeRelation(
            a.tournament_events
              ?.tournament_rounds
          )?.round_order || 999
        ) -
        (
          normalizeRelation(
            b.tournament_events
              ?.tournament_rounds
          )?.round_order || 999
        )
    );

  const completedEvents =
    normalizedEvents.filter(
      (entry: any) =>
        entry.status === 'advanced' ||
        entry.status === 'competed' ||
        entry.status === 'eliminated'
    );

  const nextEntry =
    normalizedEvents.find(
      (entry: any) =>
        entry.status === 'eligible' ||
        entry.status === 'confirmed'
    );

  const nextEvent =
    nextEntry?.tournament_events || null;

  const finalEntry =
  normalizedEvents[
    normalizedEvents.length - 1
  ] || null;

const isChampion =
  !nextEvent &&
  finalEntry?.placement === 1 &&
  (
    finalEntry?.status === 'advanced' ||
    finalEntry?.status === 'competed' ||
    finalEntry?.status === 'eliminated'
  );

  return (
    <section className="sv-my-stage-championship">
      <div className="sv-my-stage-championship-top">
        <div>
          <span>Championship Journey</span>

          <h2>{tournament.name}</h2>

         <p>
  {nextEvent
    ? `You have completed ${
        completedEvents.length
      } ${
        completedEvents.length === 1
          ? 'stage'
          : 'stages'
      } and qualified for ${nextEvent.name}.`
    : isChampion
      ? `You conquered the road to the title and became the ${tournament.name} Champion.`
      : `Your championship journey ended after ${
          completedEvents.length
        } ${
          completedEvents.length === 1
            ? 'stage'
            : 'stages'
        }.`}
</p>
        </div>

       <div className="sv-my-stage-championship-icon">
  {tournament.logo_url ? (
    <img
      src={tournament.logo_url}
      alt={`${tournament.name} logo`}
    />
  ) : (
    '🏆'
  )}
</div>
      </div>

      <div className="sv-my-stage-championship-progress">
        {normalizedEvents.length > 0 ? (
          normalizedEvents.map(
            (entry: any, index: number) => {
              const tournamentEvent =
                entry.tournament_events;

              const round =
                normalizeRelation(
                  tournamentEvent
                    ?.tournament_rounds
                );

              const isCompleted =
                entry.status === 'advanced' ||
                entry.status === 'competed' ||
                entry.status === 'eliminated';

              const isCurrent =
                entry.status === 'eligible' ||
                entry.status === 'confirmed';

              return (
  <div
    key={
      tournamentEvent?.id ||
      `${entry.status}-${index}`
    }
    className="sv-my-stage-championship-step-wrap"
  >
    <div
      className={[
        'sv-my-stage-championship-step',
        isCompleted
          ? 'sv-my-stage-championship-step-completed'
          : '',
        isCurrent
          ? 'sv-my-stage-championship-step-current'
          : '',
      ].join(' ')}
    >
                  <div className="sv-my-stage-championship-marker">
                    {isCompleted
                      ? '✓'
                      : isCurrent
                        ? '●'
                        : index + 1}
                  </div>

                  <div>
                    <span>
                      {round?.name ||
                        `Round ${index + 1}`}
                    </span>

                    <strong>
                      {tournamentEvent?.name ||
                        'Tournament Event'}
                    </strong>

                   <small>
  {entry.placement
    ? `${entry.placement === 1 ? 'Champion' : `Finished #${entry.placement}`}${
        entry.average_score !== null &&
        entry.average_score !== undefined
          ? ` • ${Number(entry.average_score).toFixed(2)}`
          : ''
      }`
    : isCurrent
      ? 'You are Qualified'
      : 'Upcoming'}
</small>
                                    </div>
                </div>

                {index < normalizedEvents.length - 1 && (
                  <div className="sv-my-stage-championship-connector">
                    <span />
                  </div>
                )}
              </div>
            );
            }
          )
        ) : (
          <div className="sv-my-stage-championship-empty">
            Tournament events will appear here.
          </div>
        )}
      </div>

      {nextEvent && (
        <div className="sv-my-stage-championship-next">
          <div>
           <span>Next Stop</span>

            <strong>{nextEvent.name}</strong>

            <p>
              📅{' '}
              {formatEventDate(
                nextEvent.starts_at
              )}
            </p>

            <p>
              📍{' '}
              {normalizeRelation(
                nextEvent.venues
              )?.name ||
                'Venue coming soon'}
            </p>
          </div>

          {nextEvent.event_id && (
            <Link
              href={`/championship-event/${nextEvent.event_id}`}
            >
              View Next Event →
            </Link>
          )}
        </div>
      )}

      <div className="sv-my-stage-championship-footer">
        <span>
          {completedEvents.length}{' '}
          {completedEvents.length === 1
            ? 'stage completed'
            : 'stages completed'}
        </span>

        {tournament.slug && (
          <Link
            href={`/tournaments/${tournament.slug}`}
          >
            View Championship →
          </Link>
        )}
      </div>
    </section>
  );
}