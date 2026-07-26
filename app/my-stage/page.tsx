'use client';

import useMyStage from '@/hooks/useMyStage';    
import Link from 'next/link';
import StatCard from '@/components/my-stage/StatCard';
import InfoCard from '@/components/my-stage/InfoCard';
import PerformanceSummary from '@/components/my-stage/PerformanceSummary';
import AchievementGrid from "@/components/my-stage/AchievementGrid";
import MyStageHero from '@/components/my-stage/MyStageHero';
import ExploreGrid from '@/components/my-stage/ExploreGrid';
import PersonalBests from '@/components/my-stage/PersonalBests';
import CareerTimeline from '@/components/my-stage/CareerTimeline';


export default function MyStagePage() {
const {
  profile,
  stats,
  personalBests,
  performerLevel,
  timeline,
  loading,
  message,
  handlePhotoUpload,
} = useMyStage();

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
    stats={stats}
    level={performerLevel}
    onPhotoUpload={handlePhotoUpload}
  />
)}

        <PerformanceSummary
  performances={stats.performances}
  venues={stats.venues}
  averageScore={stats.averageScore}
/>

<PersonalBests bests={personalBests} />

<AchievementGrid
  performances={stats.performances}
  venues={stats.venues}
  averageScore={stats.averageScore}
  wins={stats.wins}
/>

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

<CareerTimeline entries={timeline} />

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
