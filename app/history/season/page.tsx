'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SVShell from '@/components/ui/SVShell';

type SingerStats = {
  singer: string;
  singerProfileId: string;
  photoUrl: string | null;
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
  .select('id, event_id, singer_name, singer_profile_id')
  .in('event_id', eventIds)
  .not('singer_profile_id', 'is', null);

  const singerProfileIds = [
  ...new Set(
    (performances || [])
      .map(
        (performance) =>
          performance.singer_profile_id
      )
      .filter(Boolean)
  ),
] as string[];

const { data: singerProfiles } =
  singerProfileIds.length > 0
    ? await supabase
        .from('singer_profiles')
        .select('id, photo_url')
        .in('id', singerProfileIds)
    : { data: [] };

    const { data: votes } = await supabase
      .from('votes')
      .select('performance_id, score')
      .in('event_id', eventIds);

    const { data: peopleVotes } = await supabase
      .from('peoples_choice_votes')
      .select('event_id, singer_name')
      .in('event_id', eventIds);

    const stats: Record<string, SingerStats> = {};

    (performances || []).forEach((performance) => {
  const singer = performance.singer_name || 'Unknown';

  const key = performance.singer_profile_id
    ? `profile:${performance.singer_profile_id}`
    : `guest:${performance.event_id}:${singer
        .trim()
        .toLowerCase()}`;

  if (!stats[key]) {
    const profile =
  (singerProfiles || []).find(
    (profile) =>
      profile.id === performance.singer_profile_id
  );

stats[key] = {
  singer,
  singerProfileId:
    performance.singer_profile_id!,
  photoUrl: profile?.photo_url || null,
  songs: 0,
  totalScore: 0,
  voteCount: 0,
  averageScore: 0,
  peopleChoiceVotes: 0,
};
  }

  stats[key].songs += 1;
});

  (votes || []).forEach((vote) => {
  const performance = (performances || []).find(
    (p) => p.id === vote.performance_id
  );

  if (!performance) return;

  const singer =
    performance.singer_name || 'Unknown';

  const key = performance.singer_profile_id
    ? `profile:${performance.singer_profile_id}`
    : `guest:${performance.event_id}:${singer
        .trim()
        .toLowerCase()}`;

  if (!stats[key]) {
    const profile =
  (singerProfiles || []).find(
    (profile) =>
      profile.id === performance.singer_profile_id
  );

stats[key] = {
  singer,
  singerProfileId:
    performance.singer_profile_id!,
  photoUrl: profile?.photo_url || null,
  songs: 0,
  totalScore: 0,
  voteCount: 0,
  averageScore: 0,
  peopleChoiceVotes: 0,
};
  }

  stats[key].totalScore +=
    Number(vote.score || 0);

  stats[key].voteCount += 1;
});

    (peopleVotes || []).forEach((vote) => {
  const singer = vote.singer_name || 'Unknown';

  const matchingPerformance =
    (performances || []).find(
      (performance) =>
        performance.event_id === vote.event_id &&
        performance.singer_name
          ?.trim()
          .toLowerCase() ===
          singer.trim().toLowerCase()
    );

  if (!matchingPerformance?.singer_profile_id) {
  return;
}

const key =
  `profile:${matchingPerformance.singer_profile_id}`;

  if (!stats[key]) {
    const profile =
  (singerProfiles || []).find(
    (profile) =>
      profile.id === matchingPerformance.singer_profile_id
  );

stats[key] = {
  singer,
  singerProfileId:
    matchingPerformance.singer_profile_id!,
  photoUrl: profile?.photo_url || null,
  songs: 0,
  totalScore: 0,
  voteCount: 0,
  averageScore: 0,
  peopleChoiceVotes: 0,
};
  }

  stats[key].peopleChoiceVotes += 1;
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
  <SVShell
    title="Season Leaderboard"
    subtitle={`${leaderboard.length} singers ranked`}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 1180,
        margin: '0 auto',
      }}
    >
        <h1>Season Leaderboard</h1>

       <div
  style={{
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  }}
>
  <Link
    href="/history"
    className="sv-btn sv-btn-secondary"
    style={{ textDecoration: 'none' }}
  >
    ← Back to History
  </Link>
</div>

        {message && <p>{message}</p>}

        {leaderboard.length === 0 ? (
          <p>No season data yet.</p>
        ) : (
          <div
  style={{
    display: 'grid',
    gap: 14,
  }}
>
  {leaderboard.map((entry, index) => (
              <div
  key={entry.singer}
  className="card"
  style={{
    margin: 0,
    padding: 18,
    borderRadius: 16,
  }}
>
                <div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  }}
>
  <div
    style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      display: 'grid',
      placeItems: 'center',
      fontWeight: 900,
      fontSize: 18,
      background:
        index === 0
          ? '#f59e0b'
          : index === 1
          ? '#94a3b8'
          : index === 2
          ? '#b45309'
          : '#334155',
      color: index < 3 ? '#0f172a' : '#ffffff',
      flexShrink: 0,
    }}
  >
    #{index + 1}
  </div>

  {entry.photoUrl ? (
    <img
      src={entry.photoUrl}
      alt={entry.singer}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(255,255,255,0.12)',
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        background: '#1e293b',
        border:
  index === 0
    ? '2px solid #f59e0b'
    : index === 1
    ? '2px solid #94a3b8'
    : index === 2
    ? '2px solid #b45309'
    : '2px solid rgba(255,255,255,0.12)',
        color: '#ffffff',
        fontWeight: 900,
        fontSize: 16,
        flexShrink: 0,
      }}
    >
      {entry.singer
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </div>
  )}

  <h2
    style={{
      margin: 0,
      fontSize: 22,
    }}
  >
    {entry.singer}
  </h2>
</div>

                <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 12,
    marginTop: 14,
  }}
>
  {[
    ['Average Score', entry.averageScore.toFixed(2)],
    ['Songs', entry.songs],
    ['Judge Votes', entry.voteCount],
    ["People's Choice", entry.peopleChoiceVotes],
  ].map(([label, value]) => (
    <div
      key={label}
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid rgba(148,163,184,0.16)',
        background: 'rgba(15,23,42,0.55)',
      }}
    >
      <div
        style={{
          color: '#94a3b8',
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          color: '#ffffff',
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {value}
      </div>
    </div>
  ))}
</div>
              </div>
            ))}
          </div>
        )}
          </div>
  </SVShell>
  );
}
