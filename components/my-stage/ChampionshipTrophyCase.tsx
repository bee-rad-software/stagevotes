'use client';

import Link from 'next/link';

type ChampionshipTrophyCaseProps = {
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

function getAwardDetails(entry: any) {
  const placement = entry.placement;
  const status = entry.status;

  if (placement === 1) {
    return {
      icon: '🥇',
      title: 'Champion',
      className:
        'sv-trophy-card sv-trophy-card-gold',
    };
  }

  if (placement === 2) {
    return {
      icon: '🥈',
      title: 'Runner-Up',
      className:
        'sv-trophy-card sv-trophy-card-silver',
    };
  }

  if (placement === 3) {
    return {
      icon: '🥉',
      title: 'Third Place',
      className:
        'sv-trophy-card sv-trophy-card-bronze',
    };
  }

  if (
    status === 'eligible' ||
    status === 'confirmed'
  ) {
    return {
      icon: '⭐',
      title: 'Qualified',
      className:
        'sv-trophy-card sv-trophy-card-qualified',
    };
  }

  if (status === 'advanced') {
    return {
      icon: '🏆',
      title: 'Advanced',
      className:
        'sv-trophy-card sv-trophy-card-advanced',
    };
  }

  return null;
}

export default function ChampionshipTrophyCase({
  championships,
}: ChampionshipTrophyCaseProps) {
  const trophies = championships.flatMap(
    (championship: any) => {
      const tournament = normalizeRelation(
        championship.tournaments
      );

      const eventEntries =
        championship.tournament_event_entries ||
        [];

      return eventEntries
        .map((entry: any) => {
          const tournamentEvent =
            normalizeRelation(
              entry.tournament_events
            );

          const round = normalizeRelation(
            tournamentEvent
              ?.tournament_rounds
          );

          const award =
            getAwardDetails(entry);

          if (
            !tournament ||
            !tournamentEvent ||
            !award
          ) {
            return null;
          }

          const eventYear =
            tournamentEvent.starts_at
              ? new Date(
                  tournamentEvent.starts_at
                ).getFullYear()
              : null;

          return {
            id: `${championship.id}:${tournamentEvent.id}`,
            icon: award.icon,
            awardTitle: award.title,
            className: award.className,
            eventName: tournamentEvent.name,
            roundName:
              round?.name || 'Championship Event',
            tournamentName: tournament.name,
            tournamentSlug:
              tournament.slug || null,
            eventYear,
            placement:
              entry.placement || null,
            averageScore:
              entry.average_score,
            status: entry.status,
          };
        })
        .filter(Boolean);
    }
  );

  if (trophies.length === 0) {
    return null;
  }

  return (
    <section className="sv-trophy-case-section">
      <div className="sv-trophy-case-heading">
        <div>
          <span>Championship Honors</span>

          <h2>Trophy Case</h2>

          <p>
            Your finishes, qualifications, and
            championship milestones.
          </p>
        </div>

        <strong>
          {trophies.length}{' '}
          {trophies.length === 1
            ? 'honor'
            : 'honors'}
        </strong>
      </div>

      <div className="sv-trophy-case-grid">
        {trophies.map((trophy: any) => (
          <article
            key={trophy.id}
            className={trophy.className}
          >
            <div className="sv-trophy-card-icon">
              {trophy.icon}
            </div>

            <div className="sv-trophy-card-copy">
              <span>{trophy.awardTitle}</span>

              <h3>{trophy.eventName}</h3>

              <p>{trophy.roundName}</p>

              <small>
                {trophy.eventYear
                  ? `${trophy.eventYear} • `
                  : ''}
                {trophy.tournamentName}
              </small>
            </div>

            {trophy.averageScore !== null &&
              trophy.averageScore !==
                undefined && (
                <div className="sv-trophy-card-score">
                  {Number(
                    trophy.averageScore
                  ).toFixed(2)}
                </div>
              )}

            {trophy.tournamentSlug && (
              <Link
                href={`/tournaments/${trophy.tournamentSlug}`}
                className="sv-trophy-card-link"
              >
                View Championship →
              </Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}