'use client';

import { Suspense } from 'react';
import useMyStage from '@/hooks/useMyStage';
import Link from 'next/link';
import StatCard from '@/components/my-stage/StatCard';
import PerformanceSummary from '@/components/my-stage/PerformanceSummary';
import AchievementGrid from '@/components/my-stage/AchievementGrid';
import MyStageHero from '@/components/my-stage/MyStageHero';
import ExploreGrid from '@/components/my-stage/ExploreGrid';
import PersonalBests from '@/components/my-stage/PersonalBests';
import CareerTimeline from '@/components/my-stage/CareerTimeline';
import { useRouter, useSearchParams } from 'next/navigation';

import useLiveEvent from '@/hooks/useLiveEvent';
import SVLiveShowBanner from '@/components/singer/SVLiveShowBanner';
import SVSingerShell from '@/components/navigation/SVSingerShell';
import ChampionshipJourneyCard from '@/components/my-stage/ChampionshipJourneyCard';
import ChampionshipTrophyCase from '@/components/my-stage/ChampionshipTrophyCase';

export default function MyStagePage() {
  return (
    <Suspense fallback={<MyStageLoading />}>
      <MyStageContent />
    </Suspense>
  );
}

function MyStageLoading() {
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

function MyStageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = searchParams.get('event');
  const liveEvent = useLiveEvent(eventId);

  const {
  profile,
  stats,
  monthlyStats,
  personalBests,
  performerLevel,
  timeline,
  championshipData,
  loading,
  message,
  handlePhotoUpload,
} = useMyStage();

const activeChampionship =
  championshipData.find((entry: any) => {
    const tournament =
      Array.isArray(entry.tournaments)
        ? entry.tournaments[0] || null
        : entry.tournaments || null;

    return (
      tournament?.status === 'active' ||
      tournament?.status === 'open'
    );
  }) || championshipData[0];

const latestAdvancement = (() => {
  if (!activeChampionship) {
    return null;
  }

  const eventEntries =
    activeChampionship
      .tournament_event_entries || [];

  const completedEntries =
    eventEntries
      .filter(
        (entry: any) =>
          entry.status === 'advanced'
      )
      .sort(
        (a: any, b: any) => {
          const aEvent =
            Array.isArray(
              a.tournament_events
            )
              ? a.tournament_events[0]
              : a.tournament_events;

          const bEvent =
            Array.isArray(
              b.tournament_events
            )
              ? b.tournament_events[0]
              : b.tournament_events;

          return (
            new Date(
              bEvent?.starts_at || 0
            ).getTime() -
            new Date(
              aEvent?.starts_at || 0
            ).getTime()
          );
        }
      );

  const fromEntry =
    completedEntries[0];

  if (!fromEntry) {
    return null;
  }

  const nextEntry =
    eventEntries.find(
      (entry: any) =>
        entry.status === 'eligible' ||
        entry.status === 'confirmed'
    );

  if (!nextEntry) {
    return null;
  }

  const fromEvent =
    Array.isArray(
      fromEntry.tournament_events
    )
      ? fromEntry.tournament_events[0] ||
        null
      : fromEntry.tournament_events ||
        null;

  const nextEvent =
    Array.isArray(
      nextEntry.tournament_events
    )
      ? nextEntry.tournament_events[0] ||
        null
      : nextEntry.tournament_events ||
        null;

  const nextVenue =
    Array.isArray(nextEvent?.venues)
      ? nextEvent.venues[0] || null
      : nextEvent?.venues || null;

  if (!fromEvent || !nextEvent) {
    return null;
  }

  return {
    placement:
      fromEntry.placement,

    score:
      fromEntry.average_score,

    fromEventName:
      fromEvent.name,

    nextEventName:
      nextEvent.name,

    nextEventStatus:
      nextEvent.status,

    nextEventDate:
      nextEvent.starts_at,

    nextVenueName:
      nextVenue?.name || null,

    nextVenueCity:
      nextVenue?.city || null,

    nextVenueState:
      nextVenue?.state || null,

    seed:
      nextEntry.seed,

    eventId:
      nextEvent.event_id,
  };
})();

const advancementStatus = (() => {
  if (!latestAdvancement) {
    return null;
  }

  const status =
    latestAdvancement.nextEventStatus;

  /*
   * The tournament event exists,
   * but the venue has not launched
   * the live StageVotes event yet.
   */
  if (!latestAdvancement.eventId) {
    return {
      step: 'qualified',
      icon: '🏆',
      label: 'Qualified',
      message:
        'Your spot in the next round is secured.',
      actionLabel: null,
    };
  }

  /*
   * The venue has launched the event
   * and registration/check-in is open.
   */
  if (
    status === 'registration_open' ||
    status === 'check_in_open'
  ) {
    return {
      step: 'checkin',
      icon: '📍',
      label: 'Check-In Open',
      message:
        'Your next tournament event is ready.',
      actionLabel: 'Check In',
    };
  }

  /*
   * Singer has already confirmed
   * their spot for this event.
   */
  if (
    status === 'in_progress' ||
    status === 'live'
  ) {
    return {
      step: 'ready',
      icon: '🎤',
      label: 'Ready to Compete',
      message:
        'Your tournament event is underway.',
      actionLabel: 'Open Event',
    };
  }

  /*
   * Event exists, but isn't ready
   * for singer activity yet.
   */
  return {
    step: 'upcoming',
    icon: '📅',
    label: 'Upcoming',
    message:
      'You’re qualified. We’ll see you at the next round.',
    actionLabel: null,
  };
})();

const championshipStory = (() => {
  if (!activeChampionship) {
    return null;
  }

  const eventEntries =
    activeChampionship
      .tournament_event_entries || [];

  const completedStages =
    eventEntries.filter(
      (entry: any) =>
        entry.status === 'advanced' ||
        entry.status === 'competed' ||
        entry.status === 'eliminated'
    );

  const nextEntry =
    eventEntries.find(
      (entry: any) =>
        entry.status === 'eligible' ||
        entry.status === 'confirmed'
    );

  const nextEvent =
    Array.isArray(
      nextEntry?.tournament_events
    )
      ? nextEntry.tournament_events[0] ||
        null
      : nextEntry?.tournament_events ||
        null;

  const venue =
    Array.isArray(nextEvent?.venues)
      ? nextEvent.venues[0] || null
      : nextEvent?.venues || null;

  if (nextEvent) {
    const eventDate = nextEvent.starts_at
      ? new Date(
          nextEvent.starts_at
        ).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    return `You’ve completed ${completedStages.length} championship ${
      completedStages.length === 1
        ? 'stage'
        : 'stages'
    } and qualified for ${nextEvent.name}${
      eventDate ? ` on ${eventDate}` : ''
    }${
      venue?.name
        ? ` at ${venue.name}`
        : ''
    }.`;
  }

  return `Your championship journey is in progress with ${completedStages.length} ${
    completedStages.length === 1
      ? 'stage completed'
      : 'stages completed'
  }.`;
})();


  if (loading) {
    return <MyStageLoading />;
  }

 return (
  <SVSingerShell
    title="My Stage"
    subtitle="Your karaoke career"
  >
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
        {liveEvent.error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              borderRadius: 10,
              background: '#fee2e2',
              color: '#991b1b',
            }}
          >
            Live event error: {liveEvent.error}
          </div>
        )}

        {eventId && (
          <SVLiveShowBanner
            venueName={liveEvent.venueName}
            status={liveEvent.queueState}
            currentSinger={
              liveEvent.currentPerformance?.singer_name ?? ''
            }
            currentSong={
              liveEvent.currentPerformance?.song_title ?? ''
            }
            currentArtist={
              liveEvent.currentPerformance?.artist
            }
            position={liveEvent.myPosition}
            estimatedWaitMinutes={
              liveEvent.estimatedWaitMinutes
            }
            loading={liveEvent.loading}
            onReturn={() =>
              router.push(`/signup/${eventId}`)
            }
          />
        )}

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

        </header>

        {profile && (
          <MyStageHero
            profile={profile}
            stats={stats}
            level={performerLevel}
            onPhotoUpload={handlePhotoUpload}
          />
        )}

    {latestAdvancement && (
  <section
    style={{
      marginTop: 18,
      padding: '22px 20px',
      borderRadius: 20,
      border:
        '1px solid rgba(34,197,94,0.28)',
      background:
        'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(56,189,248,0.08))',
    }}
  >
    <div
      style={{
        color: '#86efac',
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      🏆 You’re Moving On
    </div>

    <h2
      style={{
        margin: '6px 0 8px',
        fontSize: 28,
      }}
    >
      Congratulations!
    </h2>

    <p
      style={{
        margin: 0,
        color: '#cbd5e1',
        lineHeight: 1.6,
      }}
    >
      You finished{' '}
      <strong>
        {latestAdvancement.placement
          ? `#${latestAdvancement.placement}`
          : 'high enough to advance'}
      </strong>{' '}
      at{' '}
      <strong>
        {latestAdvancement.fromEventName}
      </strong>
      {latestAdvancement.score !== null &&
        ` with a score of ${Number(
          latestAdvancement.score
        ).toFixed(2)}.`}
    </p>

    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 16,
        background:
          'rgba(15,23,42,0.62)',
        border:
          '1px solid rgba(148,163,184,0.16)',
      }}
    >
      <div
        style={{
          color: '#38bdf8',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Next Event
      </div>

      <strong
        style={{
          display: 'block',
          fontSize: 20,
        }}
      >
        {latestAdvancement.nextEventName}
      </strong>

      {latestAdvancement.nextEventDate && (
        <span
          style={{
            display: 'block',
            marginTop: 4,
            color: '#cbd5e1',
          }}
        >
          {new Date(
            latestAdvancement.nextEventDate
          ).toLocaleDateString([], {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      )}

      {latestAdvancement.nextVenueName && (
        <span
          style={{
            display: 'block',
            marginTop: 4,
            color: '#94a3b8',
          }}
        >
          {latestAdvancement.nextVenueName}
          {latestAdvancement.nextVenueCity
            ? ` · ${latestAdvancement.nextVenueCity}`
            : ''}
          {latestAdvancement.nextVenueState
            ? `, ${latestAdvancement.nextVenueState}`
            : ''}
        </span>
      )}

      {latestAdvancement.seed && (
        <div
          style={{
            marginTop: 12,
            color: '#f8fafc',
            fontWeight: 800,
          }}
        >
          Tournament Seed #{latestAdvancement.seed}
        </div>
      )}
    </div>

    {advancementStatus && (
  <div
    style={{
      marginTop: 16,
      display: 'grid',
      gridTemplateColumns:
        'repeat(4, minmax(0, 1fr))',
      gap: 8,
    }}
  >
    {[
      {
        key: 'qualified',
        icon: '🏆',
        label: 'Qualified',
      },
      {
        key: 'upcoming',
        icon: '📅',
        label: 'Upcoming',
      },
      {
        key: 'checkin',
        icon: '📍',
        label: 'Check In',
      },
      {
        key: 'ready',
        icon: '🎤',
        label: 'Compete',
      },
    ].map((item, index) => {
      const order = [
        'qualified',
        'upcoming',
        'checkin',
        'ready',
      ];

      const currentIndex =
        order.indexOf(
          advancementStatus.step
        );

      const complete =
        index < currentIndex;

      const active =
        index === currentIndex;

      return (
        <div
          key={item.key}
          style={{
            padding: '10px 6px',
            textAlign: 'center',
            borderRadius: 12,

            border: active
              ? '1px solid rgba(56,189,248,0.55)'
              : complete
                ? '1px solid rgba(34,197,94,0.28)'
                : '1px solid rgba(148,163,184,0.12)',

            background: active
              ? 'rgba(56,189,248,0.12)'
              : complete
                ? 'rgba(34,197,94,0.08)'
                : 'rgba(15,23,42,0.35)',

            opacity:
              index > currentIndex
                ? 0.45
                : 1,
          }}
        >
          <div
            style={{
              fontSize: 18,
            }}
          >
            {complete
              ? '✓'
              : item.icon}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {item.label}
          </div>
        </div>
      );
    })}
  </div>
)}

    {advancementStatus && (
  <div
    style={{
      marginTop: 16,
    }}
  >
    <div
      style={{
        color: '#f8fafc',
        fontWeight: 800,
      }}
    >
      {advancementStatus.icon}{' '}
      {advancementStatus.label}
    </div>

    <div
      style={{
        marginTop: 3,
        color: '#94a3b8',
        fontSize: 13,
      }}
    >
      {advancementStatus.message}
    </div>

    {advancementStatus.actionLabel &&
      latestAdvancement.eventId && (
        <button
          type="button"
          onClick={() =>
            router.push(
              `/signup/${latestAdvancement.eventId}`
            )
          }
          style={{
            width: '100%',
            marginTop: 12,
          }}
        >
          {advancementStatus.actionLabel}
        </button>
      )}
  </div>
)}
  </section>
)}

        {championshipData.length > 0 && (
  <ChampionshipJourneyCard
    championships={championshipData}
  />
)}

        <PerformanceSummary
  performances={stats.performances}
  venues={stats.venues}
  averageScore={stats.averageScore}
  championshipStory={championshipStory}
/>

        <PersonalBests bests={personalBests} />

        <AchievementGrid
          performances={stats.performances}
          venues={stats.venues}
          averageScore={stats.averageScore}
          wins={stats.wins}
        />

        {championshipData.length > 0 && (
  <ChampionshipTrophyCase
    championships={championshipData}
  />
)}

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

            <h2 style={{ margin: '5px 0 0' }}>
              This Month
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
            }}
          >
            <StatCard
  icon="🎪"
  value={monthlyStats.shows}
  label="Shows"
/>

<StatCard
  icon="🎶"
  value={monthlyStats.songs}
  label="Songs"
/>

<StatCard
  icon="🗺️"
  value={monthlyStats.newVenues}
  label="Venues"
/>
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
  </SVSingerShell>
  );
}