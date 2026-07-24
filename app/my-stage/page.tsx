'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/my-stage/StatCard';
import InfoCard from '@/components/my-stage/InfoCard';
import type {
  SingerProfile,
  SingerStats,
  SingerFavorites,
} from '@/components/my-stage/types';
import LifetimeStats from '@/components/my-stage/LifetimeStats';
import SignatureSongs from '@/components/my-stage/SignatureSongs';
import PerformanceSummary from '@/components/my-stage/PerformanceSummary';
import AchievementGrid from "@/components/my-stage/AchievementGrid";
import MyStageHero from '@/components/my-stage/MyStageHero';
import ExploreGrid from '@/components/my-stage/ExploreGrid';

export default function MyStagePage() {
  const [profile, setProfile] = useState<SingerProfile | null>(null);
  const [stats, setStats] = useState<SingerStats>({
    performances: 0,
    averageScore: 0,
    wins: 0,
    venues: 0,
  });

const [favorites, setFavorites] = useState<SingerFavorites>({
  artist: 'Waiting for more performances',
  song: 'Waiting for more performances',
});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadMyStage();
  }, []);

function isTestEntry(value?: string | null) {
  if (!value) return true;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  return (
    normalized === 'test' ||
    normalized.startsWith('test') ||
    normalized === 'song1' ||
    normalized === 'song2' ||
    normalized === 'artist1' ||
    normalized === 'artist2'
  );
}

  async function loadMyStage() {
    setLoading(true);
    setMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      window.location.href = '/login';
      return;
    }

    let { data: profileData, error: profileError } = await supabase
      .from('singer_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Unable to load singer profile:', profileError);
      setMessage('We could not load your singer profile.');
      setLoading(false);
      return;
    }

    const fallbackName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Singer';

      if (!profileData) {
  const { data: newProfile, error: createProfileError } = await supabase
    .from('singer_profiles')
    .insert({
      user_id: user.id,
      display_name: fallbackName,
      stage_name: fallbackName,
      profile_visibility: 'public',
    })
    .select('*')
    .single();

  if (createProfileError) {
    console.error(
      'Unable to create singer profile:',
      createProfileError
    );

    setMessage(
      `Unable to create your singer profile: ${createProfileError.message}`
    );

    setLoading(false);
    return;
  }

  profileData = newProfile;
}

setProfile(profileData);

let completedPerformanceCount = 0;
let venuesVisitedCount = 0;
let averageJudgeScore = 0;
let favoriteArtist = 'Waiting for more performances';
let favoriteSong = 'Waiting for more performances';

if (profileData?.id) {
  const { data: completedPerformances, error: performanceError } =
    await supabase
      .from('performances')
     .select(`
  id,
  event_id,
  song_title,
  artist,
  events (
    venue,
    venue_id
  )
`)
      .eq('singer_profile_id', profileData.id)
      .eq('status', 'completed');

  if (performanceError) {
    console.error(
      'Unable to load completed performances:',
      performanceError
    );
  } else {
    completedPerformanceCount = completedPerformances?.length || 0;

    const completedPerformanceIds =
  completedPerformances?.map((performance: any) => performance.id) || [];

if (completedPerformanceIds.length > 0) {
  const { data: voteRows, error: voteError } = await supabase
    .from('votes')
    .select('score')
    .in('performance_id', completedPerformanceIds);

  if (voteError) {
    console.error('Unable to load judge scores:', voteError);
  } else {
    const validScores =
      voteRows
        ?.map((vote) => Number(vote.score))
        .filter((score) => Number.isFinite(score)) || [];

    if (validScores.length > 0) {
      const scoreTotal = validScores.reduce(
        (sum, score) => sum + score,
        0
      );

      averageJudgeScore = scoreTotal / validScores.length;
    }
  }
}

    const artistCounts = new Map<string, number>();
const songCounts = new Map<string, number>();

completedPerformances?.forEach((performance: any) => {
  const artist = performance.artist?.trim();
  const songTitle = performance.song_title?.trim();

  if (artist && !isTestEntry(artist)) {
    const normalizedArtist = artist.toLowerCase();

    artistCounts.set(
      normalizedArtist,
      (artistCounts.get(normalizedArtist) || 0) + 1
    );
  }

  if (songTitle && !isTestEntry(songTitle)) {
    const normalizedSong = songTitle.toLowerCase();

    songCounts.set(
      normalizedSong,
      (songCounts.get(normalizedSong) || 0) + 1
    );
  }
});

const topArtist = [...artistCounts.entries()].sort(
  (a, b) => b[1] - a[1]
)[0];

const topSong = [...songCounts.entries()].sort(
  (a, b) => b[1] - a[1]
)[0];

if (topArtist) {
  const matchingPerformance = completedPerformances?.find(
    (performance: any) =>
      performance.artist?.trim().toLowerCase() === topArtist[0]
  );

  favoriteArtist =
    matchingPerformance?.artist?.trim() || topArtist[0];
}

if (topSong) {
  const matchingPerformance = completedPerformances?.find(
    (performance: any) =>
      performance.song_title?.trim().toLowerCase() === topSong[0]
  );

  favoriteSong =
    matchingPerformance?.song_title?.trim() || topSong[0];
}

    const uniqueVenues = new Set<string>();

    completedPerformances?.forEach((performance: any) => {
      const event = Array.isArray(performance.events)
        ? performance.events[0]
        : performance.events;

      if (event?.venue_id) {
        uniqueVenues.add(`id:${event.venue_id}`);
      } else if (event?.venue) {
        uniqueVenues.add(
          `name:${event.venue.trim().toLowerCase()}`
        );
      }
    });

    venuesVisitedCount = uniqueVenues.size;
  }
}

setStats({
  performances: completedPerformanceCount,
  averageScore: averageJudgeScore,
  wins: 0,
  venues: venuesVisitedCount,
});

setFavorites({
  artist: favoriteArtist,
  song: favoriteSong,
});

    setLoading(false);
  }

  function getPerformerLevel(performanceCount: number) {
    if (performanceCount >= 250) return 'Karaoke Legend';
    if (performanceCount >= 100) return 'Crowd Favorite';
    if (performanceCount >= 25) return 'Regular';
    return 'Rookie';
  }

  const singerName =
    profile?.stage_name ||
    profile?.display_name ||
    'StageVotes Singer';

  const initials = singerName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#07111f',
          color: 'white',
        }}
      >
        <p>Loading My Stage...</p>
      </main>
    );
  }

const performerLevel =
  stats.performances >= 100
    ? 'Headliner'
    : stats.performances >= 50
      ? 'Veteran'
      : stats.performances >= 25
        ? 'Regular'
        : 'Rookie';

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '24px 16px 80px',
        color: '#f8fafc',
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 34rem), radial-gradient(circle at top right, rgba(249,115,22,0.12), transparent 30rem), #07111f',
      }}
    >
      <div
        style={{
          width: 'min(920px, 100%)',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Singer Profile
            </p>

            <h1
              style={{
                margin: '5px 0 0',
                fontSize: 'clamp(2rem, 7vw, 3.5rem)',
                letterSpacing: '-0.05em',
              }}
            >
              My Stage
            </h1>
          </div>

          <Link
            href="/"
            style={{
              color: '#bae6fd',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            StageVotes
          </Link>
        </header>

{profile && (
  <MyStageHero
    profile={profile}
    level={performerLevel}
  />
)}

        <LifetimeStats stats={stats} />

        <PerformanceSummary
  performances={stats.performances}
  venues={stats.venues}
  averageScore={stats.averageScore}
/>

<AchievementGrid
  performances={stats.performances}
  venues={stats.venues}
  averageScore={stats.averageScore}
  wins={stats.wins}
/>

       <SignatureSongs favorites={favorites} />

        <section style={{ marginTop: 28 }}>
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                margin: 0,
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Activity
            </p>

            <h2 style={{ margin: '5px 0 0' }}>This Month</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
            }}
          >
            <StatCard icon="🎪" value={0} label="Shows" />
            <StatCard icon="🎶" value={0} label="Songs" />
            <StatCard icon="🗺️" value={0} label="New Venues" />
          </div>
        </section>

        <ExploreGrid />

        {message && (
          <p
            style={{
              marginTop: 20,
              padding: 14,
              borderRadius: 14,
              color: '#fecaca',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
