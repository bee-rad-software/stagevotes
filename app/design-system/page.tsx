'use client';

import { useState } from 'react';
import SVMissionControl from '@/components/dashboard/SVMissionControl';
import SVAddSingerSheet from '@/components/dashboard/SVAddSingerSheet';
import SVShell from '@/components/ui/SVShell';
import SVCard from '@/components/ui/SVCard';
import SVButton from '@/components/ui/SVButton';
import SVSection from '@/components/ui/SVSection';
import SVStatCard from '@/components/ui/SVStatCard';
import { Mic2, Award, Users } from 'lucide-react';
import SVLiveCard from '@/components/ui/SVLiveCard';
import SVHeroNowSinging from '@/components/ui/SVHeroNowSinging';
import SVHostHero from '@/components/dashboard/SVHostHero';
import SVHostQueue from '@/components/dashboard/SVHostQueue';
import SVSingerDetailSheet from '@/components/dashboard/SVSingerDetailSheet';
import SVLiveActivity, {
  type SVActivityItem,
} from '@/components/dashboard/SVLiveActivity';

export default function DesignSystemPage() {
  const [addSingerOpen, setAddSingerOpen] = useState(false);
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null);
const [hostQueue, setHostQueue] = useState([
 {
  id: '1',
  singerName: 'Brad Bock',
  songTitle: 'Are You Gonna Be My Girl',
  artist: 'Jet',
  status: 'current' as const,
  round: 1,
},
{
  id: '2',
  singerName: 'John',
  songTitle: 'Sweet Caroline',
  artist: 'Neil Diamond',
  status: 'next' as const,
  round: 1,
},
{
  id: '3',
  singerName: 'Sarah',
  songTitle: 'Before He Cheats',
  artist: 'Carrie Underwood',
  status: 'waiting' as const,
  round: 1,
},
{
  id: '4',
  singerName: 'Brad Bock',
  songTitle: 'Cold',
  artist: 'Chris Stapleton',
  status: 'waiting' as const,
  round: 2,
},
]);

const [activityItems, setActivityItems] = useState<SVActivityItem[]>([
  {
    id: 'activity-1',
    type: 'performance',
    title: 'Brad is now performing',
    detail: 'Are You Gonna Be My Girl by Jet',
    time: 'Just now',
  },
]);

function reorderHostQueue(draggedId: string, targetId: string) {
  setHostQueue((currentQueue) => {
    const currentSinger = currentQueue.find(
      (item) => item.status === 'current'
    );

    const waitingQueue = currentQueue.filter(
      (item) => item.status !== 'current'
    );

    const draggedIndex = waitingQueue.findIndex(
      (item) => item.id === draggedId
    );

    const targetIndex = waitingQueue.findIndex(
      (item) => item.id === targetId
    );

    if (
      draggedIndex === -1 ||
      targetIndex === -1 ||
      draggedIndex === targetIndex
    ) {
      return currentQueue;
    }

    const reorderedWaiting = [...waitingQueue];
    const [draggedItem] = reorderedWaiting.splice(draggedIndex, 1);

    reorderedWaiting.splice(targetIndex, 0, draggedItem);

    const updatedWaiting = reorderedWaiting.map((item, index) => ({
      ...item,
      status: index === 0
        ? ('next' as const)
        : ('waiting' as const),
    }));

    return currentSinger
      ? [
          {
            ...currentSinger,
            status: 'current' as const,
          },
          ...updatedWaiting,
        ]
      : updatedWaiting;
  });
}

const selectedSinger =
  hostQueue.find((item) => item.id === selectedSingerId) || null;

function advanceQueue() {
  const currentSinger = hostQueue.find(
    (item) => item.status === 'current'
  );

  const nextSinger = hostQueue.find(
    (item) => item.status === 'next'
  );

  if (!nextSinger) return;

  setHostQueue((currentQueue) => {
    const remainingQueue = currentQueue.filter(
      (item) => item.id !== currentSinger?.id
    );

    return remainingQueue.map((item, index) => ({
      ...item,
      status:
        index === 0
          ? ('current' as const)
          : index === 1
          ? ('next' as const)
          : ('waiting' as const),
    }));
  });

  logActivity(
    'performance',
    `${nextSinger.singerName} is now performing`,
    nextSinger.artist
      ? `${nextSinger.songTitle} by ${nextSinger.artist}`
      : nextSinger.songTitle
  );

  setSelectedSingerId(null);
}

function logActivity(
  type: SVActivityItem['type'],
  title: string,
  detail?: string
) {
  setActivityItems((current) => [
    {
      id: crypto.randomUUID(),
      type,
      title,
      detail,
      time: 'Just now',
    },
    ...current.slice(0, 24), // keep newest 25
  ]);
}

function addActivity(
  item: Omit<SVActivityItem, 'id' | 'time'>
) {
  setActivityItems((currentItems) => [
    {
      ...item,
      id: crypto.randomUUID(),
      time: 'Just now',
    },
    ...currentItems,
  ]);
}

const currentHostSinger =
  hostQueue.find((item) => item.status === 'current') || null;

  return (
    <SVShell
      title="StageVotes Design System"
      subtitle="Sandbox for the new professional StageVotes UI"
    >

<SVHostHero
  singerName={currentHostSinger?.singerName || 'No current singer'}
  songTitle={currentHostSinger?.songTitle || 'Waiting to begin'}
  artist={currentHostSinger?.artist || ''}
  votingOpen={false}
  showName="Friday Night Karaoke"
/>

<SVMissionControl
  onAddSinger={() => setAddSingerOpen(true)}
onNextSinger={advanceQueue} 
  onToggleVoting={() => {
    console.log('Toggle voting');
  }}
  votingOpen={false}
/>

<SVHostQueue
items={hostQueue}
  onMoveUp={(id) => console.log('Move up', id)}
onSkip={(id) => {
  const skippedSinger = hostQueue.find(
    (item) => item.id === id
  );

  setHostQueue((currentQueue) => {
    const singerToSkip = currentQueue.find(
      (item) => item.id === id
    );

    if (!singerToSkip) return currentQueue;

    const remainingQueue = currentQueue.filter(
      (item) => item.id !== id
    );

    const currentSinger = remainingQueue.find(
      (item) => item.status === 'current'
    );

    const waitingQueue = remainingQueue.filter(
      (item) => item.status !== 'current'
    );

    const updatedWaiting = [
      ...waitingQueue,
      {
        ...singerToSkip,
        status: 'waiting' as const,
      },
    ].map((item, index) => ({
      ...item,
      status:
        index === 0
          ? ('next' as const)
          : ('waiting' as const),
    }));

    return currentSinger
      ? [
          {
            ...currentSinger,
            status: 'current' as const,
          },
          ...updatedWaiting,
        ]
      : updatedWaiting;
  });

  if (skippedSinger) {
    logActivity(
      'performance',
      `${skippedSinger.singerName} was skipped`,
      skippedSinger.artist
        ? `${skippedSinger.songTitle} by ${skippedSinger.artist}`
        : skippedSinger.songTitle
    );
  }

  setSelectedSingerId(null);
}}

onRemove={(id) => {
  const removedSinger = hostQueue.find(
    (item) => item.id === id
  );

  setHostQueue((currentQueue) => {
    const remainingQueue = currentQueue.filter(
      (item) => item.id !== id
    );

    const currentSinger = remainingQueue.find(
      (item) => item.status === 'current'
    );

    const waitingQueue = remainingQueue.filter(
      (item) => item.status !== 'current'
    );

    const updatedWaiting = waitingQueue.map((item, index) => ({
      ...item,
      status:
        index === 0
          ? ('next' as const)
          : ('waiting' as const),
    }));

    return currentSinger
      ? [
          {
            ...currentSinger,
            status: 'current' as const,
          },
          ...updatedWaiting,
        ]
      : updatedWaiting;
  });

  if (removedSinger) {
    logActivity(
      'performance',
      `${removedSinger.singerName} was removed from the rotation`,
      removedSinger.artist
        ? `${removedSinger.songTitle} by ${removedSinger.artist}`
        : removedSinger.songTitle
    );
  }

  setSelectedSingerId(null);
}}
  onReorder={reorderHostQueue}
  onSelect={(id) => setSelectedSingerId(id)}
/>

<SVLiveActivity items={activityItems} />

<SVHeroNowSinging />

      <SVSection
        title="Buttons"
        subtitle="Reusable action styles for the product"
      >
        <SVCard>
          <div className="sv-demo-row">
            <SVButton>Primary</SVButton>
            <SVButton variant="secondary">Secondary</SVButton>
            <SVButton variant="danger">Danger</SVButton>
            <SVButton variant="ghost">Ghost</SVButton>
          </div>
        </SVCard>
      </SVSection>

      <SVSection
        title="Cards"
        subtitle="Core containers for dashboards and settings"
      >
        <div className="sv-demo-grid">
          <SVCard title="Live Show" subtitle="Currently running">
            <p className="sv-muted">Friday Night Karaoke</p>
            <div className="sv-demo-stat">47 singers</div>
          </SVCard>

          <SVCard title="Voting" subtitle="Audience and judges">
            <p className="sv-muted">People’s Choice is active.</p>
            <div className="sv-demo-stat">128 votes</div>
          </SVCard>

          <SVCard title="Display" subtitle="TV mode">
            <p className="sv-muted">Now Singing screen is live.</p>
            <div className="sv-demo-stat">Connected</div>
          </SVCard>
        </div>
      </SVSection>

<SVSection
  title="Live Stats"
  subtitle="Dashboard cards for show status and activity"
>
  <div className="sv-dashboard-grid">
   <SVStatCard
  icon={Mic2}
  title="Queue"
  value={23}
  subtitle="Singers waiting"
  trend="+2 checked in recently"
/>

<SVStatCard
  icon={Award}
  title="Judges"
  value="4 / 4"
  subtitle="All judges connected"
  trend="Judge 3 submitted just now"
  color="var(--sv-orange)"
/>

<SVStatCard
  icon={Users}
  title="Audience"
  value={187}
  subtitle="Votes cast"
  trend="+12 since current singer"
  color="var(--sv-green)"
/>
  </div>
</SVSection>

<SVSection
  title="Live Event Widgets"
  subtitle="Animated cards that make StageVotes feel alive"
>
  <div className="sv-dashboard-grid">
    <SVLiveCard
      icon={Mic2}
      title="Queue"
      value={23}
      subtitle="Singers waiting"
      activity="+ Sarah checked in just now"
    />

    <SVLiveCard
      icon={Award}
      title="Judges"
      value="4 / 4"
      subtitle="All judges connected"
      activity="Judge 3 submitted score"
      color="var(--sv-orange)"
    />

    <SVLiveCard
      icon={Users}
      title="Audience"
      value={187}
      subtitle="Votes cast"
      activity="+12 since current singer"
      color="var(--sv-green)"
    />
  </div>
</SVSection>

      <SVSection
        title="Host Dashboard Mockup"
        subtitle="First pass at the live-show workspace"
      >
        <div className="sv-host-mockup">
          <SVCard title="Now Singing" subtitle="Current performer">
            <div className="sv-now-singing">
              <div className="sv-avatar">BB</div>
              <div>
                <h3>Brad</h3>
                <p>Are You Gonna Be My Girl — Jet</p>
              </div>
            </div>
          </SVCard>

          <SVCard title="Up Next" subtitle="Queue preview">
            <div className="sv-list-item">Sarah — Before He Cheats</div>
            <div className="sv-list-item">Mike — Tennessee Whiskey</div>
            <div className="sv-list-item">Amy — Dancing Queen</div>
          </SVCard>

          <SVCard title="Quick Actions" subtitle="Show controls">
            <div className="sv-demo-row">
              <SVButton>Next Singer</SVButton>
              <SVButton variant="secondary">TV Display</SVButton>
              <SVButton variant="danger">End Show</SVButton>
            </div>
          </SVCard>
        </div>
      </SVSection>

<SVSingerDetailSheet
  open={selectedSinger !== null}
  singer={
    selectedSinger
      ? {
          id: selectedSinger.id,
          singerName: selectedSinger.singerName,
          songTitle: selectedSinger.songTitle,
          artist: selectedSinger.artist,
          signupType: 'phone',
        }
      : null
  }
  onClose={() => setSelectedSingerId(null)}
  onChangeSong={(id) => {
    console.log('Change song', id);
  }}
  onAddSong={(id) => {
    console.log('Add song', id);
  }}
  onSkip={(id) => {
  const skippedSinger = hostQueue.find(
    (item) => item.id === id
  );

  setHostQueue((currentQueue) => {
    const singerToSkip = currentQueue.find(
      (item) => item.id === id
    );

    if (!singerToSkip) return currentQueue;

    const remainingQueue = currentQueue.filter(
      (item) => item.id !== id
    );

    const currentSinger = remainingQueue.find(
      (item) => item.status === 'current'
    );

    const waitingQueue = remainingQueue.filter(
      (item) => item.status !== 'current'
    );

    const updatedWaiting = [
      ...waitingQueue,
      {
        ...singerToSkip,
        status: 'waiting' as const,
      },
    ].map((item, index) => ({
      ...item,
      status:
        index === 0
          ? ('next' as const)
          : ('waiting' as const),
    }));

    return currentSinger
      ? [
          {
            ...currentSinger,
            status: 'current' as const,
          },
          ...updatedWaiting,
        ]
      : updatedWaiting;
  });

  if (skippedSinger) {
    logActivity(
      'performance',
      `${skippedSinger.singerName} was skipped`,
      skippedSinger.artist
        ? `${skippedSinger.songTitle} by ${skippedSinger.artist}`
        : skippedSinger.songTitle
    );
  }

  setSelectedSingerId(null);
}}

onRemove={(id) => {
  const removedSinger = hostQueue.find(
    (item) => item.id === id
  );

  setHostQueue((currentQueue) => {
    const remainingQueue = currentQueue.filter(
      (item) => item.id !== id
    );

    const currentSinger = remainingQueue.find(
      (item) => item.status === 'current'
    );

    const waitingQueue = remainingQueue.filter(
      (item) => item.status !== 'current'
    );

    const updatedWaiting = waitingQueue.map((item, index) => ({
      ...item,
      status:
        index === 0
          ? ('next' as const)
          : ('waiting' as const),
    }));

    return currentSinger
      ? [
          {
            ...currentSinger,
            status: 'current' as const,
          },
          ...updatedWaiting,
        ]
      : updatedWaiting;
  });

  if (removedSinger) {
    logActivity(
      'performance',
      `${removedSinger.singerName} was removed from the rotation`,
      removedSinger.artist
        ? `${removedSinger.songTitle} by ${removedSinger.artist}`
        : removedSinger.songTitle
    );
  }

  setSelectedSingerId(null);
}}
/>

<SVAddSingerSheet
  open={addSingerOpen}
  onClose={() => setAddSingerOpen(false)}
  onAddSinger={async (singer) => {
  setHostQueue((currentQueue) => {
    const activeRound =
      currentQueue.find((item) => item.status === 'current')?.round ??
      Math.min(...currentQueue.map((item) => item.round), 1);

    const newSinger = {
      id: crypto.randomUUID(),
      singerName: singer.singerName,
      songTitle: singer.songTitle,
      artist: singer.artist,
      status: 'waiting' as const,
      round: activeRound,
    };

    const currentRoundItems = currentQueue.filter(
      (item) => item.round === activeRound
    );

    const laterRoundItems = currentQueue.filter(
      (item) => item.round > activeRound
    );

    return [
      ...currentRoundItems,
      newSinger,
      ...laterRoundItems,
    ];
  });

logActivity(
  'join',
  `${singer.singerName} joined the rotation`,
  singer.artist
    ? `${singer.songTitle} by ${singer.artist}`
    : singer.songTitle
);
}}
/>

    </SVShell>
  );
}