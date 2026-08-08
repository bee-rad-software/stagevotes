'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
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

type TournamentEventSummary = {
  id: string;
  tournament_id: string;
  name: string;
  status:
    | 'scheduled'
    | 'registration_open'
    | 'live'
    | 'completed'
    | 'cancelled';
  starts_at: string | null;
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] =
    useState<Tournament[]>([]);

  const [events, setEvents] =
    useState<TournamentEventSummary[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    async function loadTournaments() {
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
        .in('status', [
          'open',
          'active',
          'completed',
        ])
        .order('starts_at', {
          ascending: true,
          nullsFirst: false,
        });

      if (tournamentError) {
        console.error(
          'Unable to load public tournaments:',
          tournamentError
        );

        setMessage(
          'We could not load the championships.'
        );

        setLoading(false);
        return;
      }

      const rows =
        (tournamentData || []) as Tournament[];

      setTournaments(rows);

      const tournamentIds =
        rows.map(
          (tournament) => tournament.id
        );

      if (tournamentIds.length > 0) {
        const {
          data: eventData,
          error: eventError,
        } = await supabase
          .from('tournament_events')
          .select(`
            id,
            tournament_id,
            name,
            status,
            starts_at
          `)
          .in(
            'tournament_id',
            tournamentIds
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

          setEvents([]);
        } else {
          setEvents(
            (eventData || []) as
              TournamentEventSummary[]
          );
        }
      } else {
        setEvents([]);
      }

      setLoading(false);
    }

    loadTournaments();
  }, []);

  const activeTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament) =>
          tournament.status === 'active'
      ),
    [tournaments]
  );

  const upcomingTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament) =>
          tournament.status === 'open'
      ),
    [tournaments]
  );

  const completedTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament) =>
          tournament.status === 'completed'
      ),
    [tournaments]
  );

  function getTournamentEvents(
    tournamentId: string
  ) {
    return events.filter(
      (event) =>
        event.tournament_id === tournamentId
    );
  }

  function getNextEvent(
    tournamentId: string
  ) {
    return getTournamentEvents(
      tournamentId
    ).find(
      (event) =>
        event.status === 'live' ||
        event.status ===
          'registration_open' ||
        event.status === 'scheduled'
    );
  }

  return (
    <SVSingerShell
      title="Championships"
      subtitle="Qualify, advance, and chase the title"
    >
      <main className="sv-tournaments-page">
        <section className="sv-tournaments-hero">
          <div>
            <div className="sv-tournaments-eyebrow">
              StageVotes Championships
            </div>

            <h1>
              The road to the championship
              starts here.
            </h1>

            <p>
              Follow local qualifiers,
              regional rounds, state finals,
              and national championships.
            </p>
          </div>

          <div className="sv-tournaments-summary">
            <div>
              <strong>
                {activeTournaments.length}
              </strong>

              <span>Active</span>
            </div>

            <div>
              <strong>
                {upcomingTournaments.length}
              </strong>

              <span>Upcoming</span>
            </div>

            <div>
              <strong>
                {completedTournaments.length}
              </strong>

              <span>Completed</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="sv-tournaments-empty">
            Loading championships...
          </div>
        ) : message ? (
          <div className="sv-tournaments-empty">
            {message}
          </div>
        ) : (
          <>
            <TournamentSection
              title="Active Championships"
              eyebrow="Happening Now"
              tournaments={activeTournaments}
              getNextEvent={getNextEvent}
              emptyMessage="No championships are active right now."
              mode="active"
            />

            <TournamentSection
              title="Upcoming Championships"
              eyebrow="Coming Soon"
              tournaments={upcomingTournaments}
              getNextEvent={getNextEvent}
              emptyMessage="No upcoming championships have been announced."
              mode="upcoming"
            />

            <TournamentSection
              title="Completed Championships"
              eyebrow="Tournament Archive"
              tournaments={completedTournaments}
              getNextEvent={getNextEvent}
              emptyMessage="Completed championships will appear here."
              mode="completed"
            />
          </>
        )}
      </main>
    </SVSingerShell>
  );
}

type TournamentSectionProps = {
  title: string;
  eyebrow: string;
  tournaments: Tournament[];
  getNextEvent: (
    tournamentId: string
  ) => TournamentEventSummary | undefined;
  emptyMessage: string;
  mode:
    | 'active'
    | 'upcoming'
    | 'completed';
};

function TournamentSection({
  title,
  eyebrow,
  tournaments,
  getNextEvent,
  emptyMessage,
  mode,
}: TournamentSectionProps) {
  return (
    <section className="sv-tournaments-section">
      <div className="sv-tournaments-section-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>

        <strong>
          {tournaments.length}
        </strong>
      </div>

      {tournaments.length > 0 ? (
        <div className="sv-tournaments-grid">
          {tournaments.map(
            (tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                nextEvent={getNextEvent(
                  tournament.id
                )}
                mode={mode}
              />
            )
          )}
        </div>
      ) : (
        <div className="sv-tournaments-empty">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

type TournamentCardProps = {
  tournament: Tournament;
  nextEvent:
    | TournamentEventSummary
    | undefined;
  mode:
    | 'active'
    | 'upcoming'
    | 'completed';
};

function TournamentCard({
  tournament,
  nextEvent,
  mode,
}: TournamentCardProps) {
  const eventLabel =
    mode === 'completed'
      ? 'Championship Complete'
      : nextEvent?.status === 'live'
        ? 'Live Now'
        : nextEvent?.name ||
          'Schedule coming soon';

  return (
    <Link
      href={`/tournaments/${tournament.slug}`}
      className="sv-tournament-public-card"
    >
      <div
        className="sv-tournament-public-photo"
        style={
          tournament.cover_photo_url
            ? {
                backgroundImage: `
                  linear-gradient(
                    180deg,
                    rgba(2, 6, 23, 0.04),
                    rgba(2, 6, 23, 0.94)
                  ),
                  url("${tournament.cover_photo_url}")
                `,
              }
            : undefined
        }
      >
        <div className="sv-tournament-public-top">
          <div className="sv-tournament-public-logo">
            {tournament.logo_url ? (
              <img
                src={tournament.logo_url}
                alt={`${tournament.name} logo`}
              />
            ) : (
              '🏆'
            )}
          </div>

          <div
            className={[
              'sv-tournament-public-status',
              `sv-tournament-public-status-${mode}`,
            ].join(' ')}
          >
            {mode === 'active'
              ? 'Active'
              : mode === 'upcoming'
                ? 'Upcoming'
                : 'Completed'}
          </div>
        </div>

        <div className="sv-tournament-public-photo-copy">
          <span>{eventLabel}</span>

          <h3>{tournament.name}</h3>
        </div>
      </div>

      <div className="sv-tournament-public-content">
        <p>
          {tournament.description ||
            'Follow the championship path and see who advances.'}
        </p>

        <div className="sv-tournament-public-meta">
          <span>
            📅{' '}
            {nextEvent?.starts_at
              ? new Date(
                  nextEvent.starts_at
                ).toLocaleDateString(
                  undefined,
                  {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }
                )
              : tournament.starts_at
                ? new Date(
                    tournament.starts_at
                  ).toLocaleDateString()
                : 'Dates coming soon'}
          </span>

          <strong>
            {mode === 'completed'
              ? 'View Results →'
              : 'View Championship →'}
          </strong>
        </div>
      </div>
    </Link>
  );
}