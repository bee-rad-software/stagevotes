'use client';

import { useState } from 'react';
import {
  Bell,
  Heart,
  History,
  ListMusic,
  Plus,
  Trophy,
  Vote,
} from 'lucide-react';

import SVButton from '@/components/ui/SVButton';
import SVDevToolbar from '@/components/ui/SVDevToolbar';
import SVSingerHero from '@/components/singer/SVSingerHero';
import SVQueueStatusCard from '@/components/singer/SVQueueStatusCard';
import SVBottomSheet from '@/components/ui/SVBottomSheet';
import SVSongPicker from '@/components/singer/SVSongPicker';

export default function SingerHubPage() {
  const [queueState, setQueueState] = useState<'waiting' | 'soon' | 'next' | 'performing'>('soon');
const [songSheetOpen, setSongSheetOpen] = useState(false);
const [songsTonight, setSongsTonight] = useState([
  'Are You Gonna Be My Girl',
  'Sweet Caroline',
  'Wagon Wheel',
]);

const [editingSongIndex, setEditingSongIndex] = useState<number | null>(null);
const demoSongs = [
  { title: 'Piano Man', artist: 'Billy Joel', status: 'available' as const },
  { title: 'Sweet Caroline', artist: 'Neil Diamond', status: 'queued' as const },
  { title: 'Friends in Low Places', artist: 'Garth Brooks', status: 'available' as const },
  { title: 'Before He Cheats', artist: 'Carrie Underwood', status: 'favorite' as const },
  { title: 'Tennessee Whiskey', artist: 'Chris Stapleton', status: 'available' as const },
  { title: 'Sweet Child O’ Mine', artist: 'Guns N’ Roses', status: 'available' as const },
  { title: 'Mr. Brightside', artist: 'The Killers', status: 'favorite' as const },
];

  return (
    <main className="sv-mobile-page">
     <SVSingerHero
  singerName="Brad"
  venueName="Pub on the Bricks Karaoke Night"
  editable={false}
  status={queueState}
/>

      <SVDevToolbar
        label="Queue State"
        value={queueState}
        onChange={setQueueState}
        options={[
          { label: 'Waiting', value: 'waiting' },
          { label: 'Soon', value: 'soon' },
          { label: 'Next', value: 'next' },
          { label: 'Performing', value: 'performing' },
        ]}
      />

      <SVQueueStatusCard queueState={queueState} />

      <section className="sv-mobile-card">
        <div className="sv-mobile-card-header">
          <div>
            <div className="sv-mobile-kicker">My songs tonight</div>
            <h2>{songsTonight.length} songs queued</h2>
          </div>

          <ListMusic size={22} />
        </div>

        {songsTonight.map((song, index) => {
  const isCurrent = index === 0;

  return (
    <div
      key={`${song}-${index}`}
      className={isCurrent ? 'sv-song-card active' : 'sv-song-card'}
    >
      <div>
        <div className="sv-song-number">
          {isCurrent ? 'NOW' : `#${index + 1}`}
        </div>

        <div className="sv-song-title">
          {song}
        </div>

        <div className="sv-song-status">
          {isCurrent ? 'Currently Performing' : 'Queued'}
        </div>
      </div>

      {!isCurrent && (
        <button
          className="sv-change-song"
          onClick={() => {
            setEditingSongIndex(index);
            setSongSheetOpen(true);
          }}
        >
          Change
        </button>
      )}
    </div>
  );
})}

        <SVButton className="sv-full-button">
          <Plus size={18} />
          Add another song
        </SVButton>
      </section>

      <section className="sv-mobile-actions">
        <button>
          <Bell size={22} />
          Notify Me
        </button>

        <button>
          <Vote size={22} />
          Vote
        </button>

        <button>
          <Trophy size={22} />
          Leaderboard
        </button>

        <button>
          <History size={22} />
          My History
        </button>
      </section>

      <section className="sv-tip-card">
        <Heart size={28} />

        <div>
          <div className="sv-mobile-kicker">Love the show?</div>
          <h2>Tip your host</h2>
          <p>Support the person keeping the music going tonight.</p>
        </div>

        <div className="sv-tip-row">
          <button>$2</button>
          <button>$5</button>
          <button>$10</button>
          <button>Custom</button>
        </div>
      </section>

<SVBottomSheet
  open={songSheetOpen}
  title="Change Song"
  onClose={() => setSongSheetOpen(false)}
>
 <SVSongPicker
  songs={demoSongs}
  onSelect={(song) => {
    if (editingSongIndex !== null) {
      setSongsTonight((current) => {
        const next = [...current];
        next[editingSongIndex] = song.title;
        return next;
      });
    }

    setSongSheetOpen(false);
    setEditingSongIndex(null);
  }}
/>
</SVBottomSheet>

    </main>
  );
}