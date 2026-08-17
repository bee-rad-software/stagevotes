'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SVShell from '@/components/ui/SVShell';

type Tournament = {
  id: string;
  name: string;
  slug: string;
  status:
    | 'draft'
    | 'open'
    | 'active'
    | 'completed'
    | 'archived';
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export default function TournamentDirectorPage() {
  const router = useRouter();

  const [tournaments, setTournaments] =
    useState<Tournament[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    async function loadTournaments() {
      setLoading(true);
      setMessage('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage(
          'Sign in to manage tournaments.'
        );
        setLoading(false);
        return;
      }

      const {
        data: accountUser,
        error: accountError,
      } = await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (accountError) {
        console.error(
          'Unable to load tournament account:',
          accountError
        );

        setMessage(
          'We could not load your StageVotes account.'
        );
        setLoading(false);
        return;
      }

      if (!accountUser?.account_id) {
        setMessage(
          'No StageVotes account is connected to this user.'
        );
        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          slug,
          status,
          starts_at,
          ends_at,
          created_at
        `)
        .eq(
          'created_by_account_id',
          accountUser.account_id
        )
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        console.error(
          'Unable to load tournaments:',
          error
        );

        setMessage(
          'We could not load your tournaments.'
        );
        setLoading(false);
        return;
      }

      setTournaments(
        (data || []) as Tournament[]
      );

      setLoading(false);
    }

    loadTournaments();
  }, []);

  return (
  <SVShell
    title="Tournament Director"
    subtitle="Championship management"
  >
    <main className="sv-director-page">
      <header className="sv-director-header">
        <div>
          <div className="sv-director-eyebrow">
            Tournament Director
          </div>

          <h1>Championship Control Center</h1>

          <p>
            Build multi-venue qualifiers,
            connect rounds, and manage the
            path to the championship.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              '/tournament-director/new'
            )
          }
          className="sv-director-create"
        >
          + Create Tournament
        </button>
      </header>

      {loading ? (
        <div className="sv-director-empty">
          Loading tournaments...
        </div>
      ) : message ? (
        <div className="sv-director-empty">
          {message}
        </div>
      ) : tournaments.length > 0 ? (
        <section className="sv-director-grid">
          {tournaments.map(
            (tournament) => (
              <Link
                key={tournament.id}
                href={`/tournament-director/${tournament.id}`}
                className="sv-director-card"
              >
                <div className="sv-director-card-status">
                  {tournament.status}
                </div>

                <h2>{tournament.name}</h2>

                <p>
                  {tournament.starts_at
                    ? new Date(
                        tournament.starts_at
                      ).toLocaleDateString()
                    : 'Dates not set'}
                </p>

                <span>
                  Open Tournament →
                </span>
              </Link>
            )
          )}
        </section>
      ) : (
        <div className="sv-director-empty">
          <div>🏆</div>

          <h2>Create your first tournament</h2>

          <p>
            Start with a championship, then
            add local qualifiers, regionals,
            state rounds, and a national final.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/tournament-director/new'
              )
            }
          >
            Create Tournament
          </button>
        </div>
           )}
         </main>
  </SVShell>
);
}