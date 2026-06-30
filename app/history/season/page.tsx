'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type SingerStats = {
  singer: string;
  songs: number;
  totalScore: number;
  voteCount: number;
  averageScore: number;
  peopleChoiceVotes: number;
};

export default function SeasonLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<SingerStats[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSeasonLeaderboard();
  }, []);

  async function loadSeasonLeaderboard() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = '/login';
      return;
    }

    const { data: accountUser } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userData.user.id)
      .single();

    if (!accountUser) {
      setMessage('Unable to find your account.');
      return;
    }

    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('account_id', accountUser.account_id);

    const eventIds = (events || []).map((event) => event.id);

    if (eventIds.length === 0) {
      setLeaderboard([]);
      return;
    }

    const { data: performances } = await supabase
      .from('performances')
      .select('id, singer_name')
      .in('event_id', eventIds);

    const { data: votes } = await supabase
      .from('votes')
      .select('performance_id, score')
      .in('event_id', eventIds);

    const { data: peopleVotes } = await supabase
      .from('peoples_choice_votes')
      .select('singer_name')
      .in('event_id', eventIds);

    const stats: Record<string, SingerStats> = {};

    (performances || []).forEach((performance) => {
      const singer = performance.singer_name || 'Unknown';

      if (!stats[singer]) {
        stats[singer] = {
          singer,
          songs: 0,
          totalScore: 0,
          voteCount: 0,
          averageScore: 0,
          peopleChoiceVotes: 0,
        };
      }

      stats[singer].songs += 1;
    });

    (votes || []).forEach((vote) => {
      const performance = (performances || []).find(
        (p) => p.id === vote.performance_id
      );

      if (!performance) return;

      const singer = performance.singer_name || 'Unknown';

      if (!stats[singer]) {
        stats[singer] = {
          singer,
          songs: 0,
          totalScore: 0,
          voteCount: 0,
          averageScore: 0,
          peopleChoiceVotes: 0,
        };
      }

      stats[singer].totalScore += Number(vote.score || 0);
      stats[singer].voteCount += 1;
    });

    (peopleVotes || []).forEach((vote) => {
      const singer = vote.singer_name || 'Unknown';

      if (!stats[singer]) {
        stats[singer] = {
          singer,
          songs: 0,
          totalScore: 0,
          voteCount: 0,
          averageScore: 0,
          peopleChoiceVotes: 0,
        };
      }

      stats[singer].peopleChoiceVotes += 1;
    });

    const results = Object.values(stats)
      .map((entry) => ({
        ...entry,
        averageScore:
          entry.voteCount > 0 ? entry.totalScore / entry.voteCount : 0,
      }))
      .sort((a, b) => {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }

        return b.peopleChoiceVotes - a.peopleChoiceVotes;
      });

    setLeaderboard(results);
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Season Leaderboard</h1>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <Link href="/history">
            <button type="button">← Back to History</button>
          </Link>
        </div>

        {message && <p>{message}</p>}

        {leaderboard.length === 0 ? (
          <p>No season data yet.</p>
        ) : (
          <div className="card">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.singer}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                  padding: '12px 0',
                }}
              >
                <h2>
                  #{index + 1} {entry.singer}
                </h2>

                <p>Average Score: {entry.averageScore.toFixed(2)}</p>
                <p>Songs: {entry.songs}</p>
                <p>Judge Votes: {entry.voteCount}</p>
                <p>People's Choice Votes: {entry.peopleChoiceVotes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
