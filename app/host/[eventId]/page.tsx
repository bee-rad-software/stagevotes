'use client'

import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, EventRow, PerformanceRow, VoteRow } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function HostPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [performances, setPerformances] = useState<PerformanceRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [singerName, setSingerName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [singerView, setSingerView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
const [editSingerName, setEditSingerName] = useState('');
const [editSongTitle, setEditSongTitle] = useState('');
const [editArtist, setEditArtist] = useState('');
const [peoplesChoiceResults, setPeoplesChoiceResults] = useState<
  { singer_name: string; votes: number }[]
>([]);
  const [categories, setCategories] = useState<
  { id: string; category_name: string }[]
>([]);
  const [checkinCount, setCheckinCount] = useState(0);
  const [showSingerSignup, setShowSingerSignup] = useState(false);
  const [showAudienceAccess, setShowAudienceAccess] = useState(false);
  const [showCheckinSettings, setShowCheckinSettings] = useState(false);
  
  const voteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/vote/${eventId}`
      : '';

  const signupUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/signup/${eventId}`
      : '';

  const peoplesChoiceUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/peopleschoice/${eventId}`
    : '';

  const checkinUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/checkin/${eventId}`
    : '';

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel(`host-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        loadEvent
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'performances', filter: `event_id=eq.${eventId}` },
        loadAll
      )
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` },
  loadAll
)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` },
        loadAll
      )
      .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'peoples_choice_votes', filter: `event_id=eq.${eventId}` },
  loadPeoplesChoice
)
     .on(
  'postgres_changes',
  { event: '*', schema: 'public', table: 'event_checkins', filter: `event_id=eq.${eventId}` },
  loadCheckins
) 
      .subscribe();

const interval = setInterval(() => {
  loadAll();
}, 3000);

    return () => {
  clearInterval(interval);
  supabase.removeChannel(channel);
};
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function loadAll() {
   await Promise.all([
  loadEvent(),
  loadPerformances(),
  loadPeoplesChoice(),
  loadVotes(),
  loadCategories(),
loadCheckins()
]);
  }

async function loadCheckins() {
  const { count, error } = await supabase
    .from('event_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) {
    console.error(error.message);
    return;
  }

  setCheckinCount(count || 0);
}
  
async function copyLink(label: string, url: string) {
  await navigator.clipboard.writeText(url);
  alert(`${label} link copied!`);
}

function downloadQR(url: string, filename: string) {
  const canvas = document.createElement('canvas');
  const size = 1200;
  const margin = 80;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);

 const img = new Image();
img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, margin, margin, size - margin * 2, size - margin * 2);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

 img.src = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&format=png&data=${encodeURIComponent(url)}`;
}
  
  async function loadEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setEvent(data);
  }
  
  async function endShow() {
  if (!confirm('End the show and show awards?')) return;

  const { error } = await supabase
    .from('events')
    .update({
      is_voting_open: false,
      is_show_ended: true
    })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAll();
}
  
  async function loadPerformances() {
    const { data, error } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)
      .order('queue_order', { ascending: true });

    if (error) {
      console.error(error.message);
      return;
    }

    setPerformances(data || []);
  }

async function loadPeoplesChoice() {
  const { data, error } = await supabase
  .from('peoples_choice_votes')
  .select('singer_name')
  .eq('event_id', eventId);

  if (error) {
    console.error(error.message);
    return;
  }

  const counts: Record<string, number> = {};

  (data || []).forEach((vote) => {
    counts[vote.singer_name] = (counts[vote.singer_name] || 0) + 1;
  });

  const results = Object.entries(counts)
    .map(([singer_name, votes]) => ({
      singer_name,
      votes
    }))
    .sort((a, b) => b.votes - a.votes);

  setPeoplesChoiceResults(results);
}
  
  async function loadVotes() {
    const { data, error } = await supabase
      .from('votes')
     .select(`
  *,
  vote_categories!votes_category_id_fkey (
    category_name
  )
`)
      .eq('event_id', eventId);

    if (error) {
      console.error(error.message);
      return;
    }

    setVotes(data || []);
  }

async function loadCategories() {
  const { data, error } = await supabase
    .from('vote_categories')
    .select('id, category_name')
    .eq('event_id', eventId);

  if (error) {
    console.error(error.message);
    return;
  }

  setCategories(data || []);
}

function getCurrentActiveRound() {
  const active = performances.filter(
    (p: any) => p.status !== 'completed' && p.status !== 'skipped'
  );

  if (active.length === 0) return 1;

  return Math.min(...active.map((p: any) => p.round || 1));
}
  
  async function addPerformance() {
    if (!singerName.trim() || !songTitle.trim()) {
      alert('Singer name and song title are required.');
      return;
    }
const currentRound = getCurrentActiveRound();

const singerKey = singerName.trim().toLowerCase();

const singerExistingSongs = performances.filter(
  (p: any) =>
    p.singer_name.trim().toLowerCase() === singerKey
);
    
const singerNextRound = singerExistingSongs.length + 1;

const assignedRound = Math.max(currentRound, singerNextRound);

const singerOriginalOrder =
  singerExistingSongs.length > 0
    ? Math.min(...singerExistingSongs.map((p: any) => p.queue_order || 0))
    : null;

const maxOrderInAssignedRound =
  performances
    .filter(
      (p: any) =>
        (p.round || 1) === assignedRound &&
        p.status !== 'completed' &&
        p.status !== 'skipped'
    )
    .reduce((max, p: any) => Math.max(max, p.queue_order || 0), 0);

const nextOrder =
  singerOriginalOrder !== null
    ? singerOriginalOrder
    : maxOrderInAssignedRound + 1;

const { error } = await supabase.from('performances').insert({
  event_id: eventId,
  singer_name: singerName.trim(),
  song_title: songTitle.trim(),
  artist: artist.trim(),
  queue_order: nextOrder,
  round: assignedRound
});

    if (error) {
      alert(error.message);
      return;
    }

    setSingerName('');
    setSongTitle('');
    setArtist('');
    await loadPerformances();
  }

  async function setCurrent(performanceId: string) {
    const { error } = await supabase
      .from('events')
      .update({
        current_performance_id: performanceId,
        is_voting_open: false
      })
      .eq('id', eventId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadAll();
  }

async function newShow() {
  if (
    !confirm(
      'Start a new show? This event will be archived.'
    )
  ) return;

  await supabase
    .from('events')
    .update({
      is_archived: true,
      is_show_ended: true
    })
    .eq('id', eventId);

  window.location.href = '/';
}
  
  async function startShow() {
  const firstSinger = rotatedQueue.find((p) => p.status !== 'completed');

  if (!firstSinger) {
    alert('No singers in the queue yet.');
    return;
  }

  const { error } = await supabase
    .from('events')
    .update({
      current_performance_id: firstSinger.id,
      is_voting_open: true
    })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return;
  }

  window.open(`/display/${eventId}`, '_blank');

  await loadAll();
}

async function toggleCheckinRequired(required: boolean) {
  const { error } = await supabase
    .from('events')
    .update({ checkin_required: required })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadEvent();
}
  
  function startEditing(p: PerformanceRow) {
  setEditingId(p.id);
  setEditSingerName(p.singer_name);
  setEditSongTitle(p.song_title);
  setEditArtist(p.artist || '');
}

function cancelEditing() {
  setEditingId(null);
  setEditSingerName('');
  setEditSongTitle('');
  setEditArtist('');
}

function useCurrentLocationForCheckin() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by this browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      const { error } = await supabase
        .from('events')
        .update({
          venue_lat: latitude,
          venue_lng: longitude,
          checkin_radius_meters: event?.checkin_radius_meters || 150
        })
        .eq('id', eventId);

      if (error) {
        alert(error.message);
        return;
      }

      alert('Venue location saved.');
      await loadEvent();
    },
    () => {
      alert('Unable to get your location.');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}
  
async function saveEdit(performanceId: string) {
  if (!editSingerName.trim() || !editSongTitle.trim()) {
    alert('Singer name and song title are required.');
    return;
  }

  const { error } = await supabase
    .from('performances')
    .update({
      singer_name: editSingerName.trim(),
      song_title: editSongTitle.trim(),
      artist: editArtist.trim()
    })
    .eq('id', performanceId);

  if (error) {
    alert(error.message);
    return;
  }

  cancelEditing();
  await loadAll();
}
  
  async function removeSinger(performanceId: string) {
  if (!confirm('Remove this singer from the queue?')) return;

  const { error } = await supabase
    .from('performances')
    .update({ status: 'completed' })
    .eq('id', performanceId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAll();
}

async function skipSinger(performanceId: string) {
  const { error } = await supabase
    .from('performances')
    .update({ status: 'skipped' })
    .eq('id', performanceId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAll();
}
async function moveSinger(performanceId: string, direction: 'up' | 'down') {
  const visibleQueue = rotatedQueue.filter(
    (p) => p.status !== 'completed' && p.status !== 'skipped'
  );

  const index = visibleQueue.findIndex((p) => p.id === performanceId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || swapWith < 0 || swapWith >= visibleQueue.length) return;

  const currentItem = visibleQueue[index];
  const otherItem = visibleQueue[swapWith];

  await supabase
    .from('performances')
    .update({ queue_order: otherItem.queue_order })
    .eq('id', currentItem.id);

  await supabase
    .from('performances')
    .update({ queue_order: currentItem.queue_order })
    .eq('id', otherItem.id);

  await loadAll();
}
  async function nextSinger() {
  const completedId = event?.current_performance_id;

  if (completedId) {
    await supabase
      .from('performances')
      .update({ status: 'completed' })
      .eq('id', completedId);
  }

  const next = rotatedQueue.find((p) => p.id !== completedId && p.status !== 'completed');

  if (!next) {
    alert('No more singers in the queue.');
    return;
  }

  const { error } = await supabase
    .from('events')
    .update({
      current_performance_id: next.id,
      is_voting_open: true
    })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAll();
}
  async function toggleVoting(open: boolean) {
    const { error } = await supabase
      .from('events')
      .update({ is_voting_open: open })
      .eq('id', eventId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadEvent();
  }

async function toggleQrSetting(
  field: 'show_signup_qr' | 'show_voting_qr' | 'show_peoples_choice_qr' | 'show_checkin_qr',
  value: boolean
) {
  const { error } = await supabase
    .from('events')
    .update({ [field]: value })
    .eq('id', eventId);

  if (error) {
    alert(error.message);
    return;
  }

  await loadEvent();
}
  
  const current = performances.find((p) => p.id === event?.current_performance_id);

  const rotatedQueue = useMemo(() => {
  return performances
    .filter((p) => p.status !== 'completed' && p.status !== 'skipped')
    .slice()
    .sort((a: any, b: any) => {
      const roundDiff = (a.round || 1) - (b.round || 1);
      if (roundDiff !== 0) return roundDiff;

      return (a.queue_order || 0) - (b.queue_order || 0);
    });
}, [performances]);
const fairQueue = useMemo(() => {
  const sorted = [...performances].sort((a, b) => a.queue_order - b.queue_order);
  const singerCounts = new Map<string, number>();
  const firstSeen = new Map<string, number>();

  return sorted
    .map((p) => {
      const singer = p.singer_name.trim().toLowerCase();

      if (!firstSeen.has(singer)) {
        firstSeen.set(singer, p.queue_order);
      }

      const round = (singerCounts.get(singer) || 0) + 1;
      singerCounts.set(singer, round);

      return {
        ...p,
        round,
        firstOrder: firstSeen.get(singer) || p.queue_order
      };
    })
    .sort((a, b) => a.round - b.round || a.firstOrder - b.firstOrder);
}, [performances]);
 const upNext = rotatedQueue.find(
  p =>
    p.id !== event?.current_performance_id &&
    p.status !== 'completed'
);
  const leaderboard = useMemo(() => {
  const singerScores = new Map<
    string,
    {
      singer_name: string;
      totalScore: number;
      totalVotes: number;
      performances: number;
      tiebreakerScore: number;
    }
  >();

  performances.forEach((p) => {
    const pv = votes.filter((v) => v.performance_id === p.id);

    if (pv.length === 0) return;

    const performanceAverage =
      pv.reduce((sum, v) => sum + v.score, 0) / pv.length;

    const key = p.singer_name.trim().toLowerCase();

    if (!singerScores.has(key)) {
      singerScores.set(key, {
  singer_name: p.singer_name,
  totalScore: 0,
  totalVotes: 0,
  performances: 0,
  tiebreakerScore: 0
      });
    }

    const singer = singerScores.get(key)!;

    singer.totalScore += performanceAverage;

   const tiebreakerCategory = categories.find(
  (c) =>
    c.category_name.trim().toLowerCase() ===
    (event as any)?.tiebreaker_category_name?.trim().toLowerCase()
);

const tiebreakerVotes = pv.filter(
  (v) => (v as any).category_id === tiebreakerCategory?.id
);
    
if (tiebreakerVotes.length > 0) {
  const tiebreakerAverage =
    tiebreakerVotes.reduce((sum, v) => sum + v.score, 0) / tiebreakerVotes.length;

  singer.tiebreakerScore += tiebreakerAverage;
}

    singer.totalVotes += pv.length;
    singer.performances += 1;
  });

  return Array.from(singerScores.values())
    .map((s) => ({
      ...s,
      averageScore: s.totalScore / s.performances
    }))
  .sort((a, b) => {
  const scoreDiff = b.averageScore - a.averageScore;

  if (Math.abs(scoreDiff) > 0.001) {
    return scoreDiff;
  }

  return (b.tiebreakerScore / b.performances || 0) - (a.tiebreakerScore / a.performances || 0);
})
}, [performances, votes, categories, event]);
 
  const singers = Array.from(
  new Set(
    rotatedQueue
      .filter((p) => p.status !== 'completed')
      .map((p) => p.singer_name)
  )
);
  
  const activeQueue = performances
  .filter((p) => p.status !== 'completed' && p.status !== 'skipped')
  .sort((a: any, b: any) => {
    const roundDiff = (a.round || 1) - (b.round || 1);
    if (roundDiff !== 0) return roundDiff;

    return a.queue_order - b.queue_order;
  });
  
const judgeBallotCount = new Set(
  votes.map((v: any) => `${v.performance_id}-${v.device_id}`)
).size;
  
const singerGroups = activeQueue.reduce((groups, p) => {
  const singer = p.singer_name.trim();

  if (!groups[singer]) {
    groups[singer] = [];
  }

  groups[singer].push(p);

  return groups;
}, {} as Record<string, typeof activeQueue>);
  
  return (
    <main
  className="container"
  style={{
    background: '#0f172a',
    minHeight: '100vh',
    color: 'white',
    padding: 32
  }}
>
     <div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  }}
>
  <div>
    <h1 style={{ fontSize: 44, marginBottom: 6 }}>
      🎤 Host Dashboard
    </h1>

    <p className="small">
      {event?.name}
      {event?.venue ? ` at ${event.venue}` : ''}
    </p>
  </div>

  <div
    style={{
      padding: '10px 18px',
      borderRadius: 999,
     background: event?.is_voting_open ? '#38bdf8' : '#c2410c',
      color: 'white',
      fontWeight: 800
    }}
  >
    {event?.is_voting_open ? 'Voting Open' : 'Voting Closed'}
  </div>
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24
  }}
>
  <div className="card">
    <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🎤 Singers</h3>
    <div style={{ fontSize: 36, fontWeight: 900 }}>
      {new Set(performances.map((p) => p.singer_name.trim().toLowerCase())).size}
    </div>
  </div>

  <div className="card">
    <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🎵 Songs</h3>
    <div style={{ fontSize: 36, fontWeight: 900 }}>
      {performances.length}
    </div>
  </div>

  <div className="card">
   <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🧑‍⚖️ Judge Ballots</h3>
<div style={{ fontSize: 36, fontWeight: 900 }}>
  {judgeBallotCount}
</div>
  </div>

  <div className="card">
    <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🏆 Leader</h3>
    <div style={{ fontSize: 24, fontWeight: 900, color: '#c2410c' }}>
      {leaderboard[0]?.singer_name || 'No votes yet'}
    </div>
  </div>
</div>
     </div>
   
<div className="card">
          <h2
  style={{
    color: '#c2410c',
    fontSize: 32,
    marginBottom: 16
  }}
>
  🎙 NOW SINGING
</h2>
          {current ? (
            <>
              <h3
  style={{
    fontSize: 48,
    color: '#38bdf8',
    marginBottom: 8
  }}
>
  {current.singer_name}
</h3>
              <p>
                {current.song_title}
                {current.artist ? ` by ${current.artist}` : ''}
              </p>
              <p>
                Voting:{' '}
                <span className="badge">
                  {event?.is_voting_open ? 'Open' : 'Closed'}
                </span>
              </p>
              <div
  style={{
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    background: 'rgba(56,189,248,0.12)',
    border: '1px solid rgba(56,189,248,0.35)'
  }}
>
  <h3 style={{ color: '#38bdf8', marginTop: 0 }}>⏭ Up Next</h3>

  {upNext ? (
    <>
      <div style={{ fontSize: 28, fontWeight: 900 }}>
        {upNext.singer_name}
      </div>
      <div className="small">
        {upNext.song_title}
        {upNext.artist ? ` by ${upNext.artist}` : ''}
      </div>
    </>
  ) : (
    <p>No one waiting.</p>
  )}
</div>
              <div className="row">
              <button onClick={nextSinger}>Next Singer</button>
                <button onClick={() => toggleVoting(true)}>Open Voting</button>
                <button className="danger" onClick={() => toggleVoting(false)}>
                  Close Voting
                </button>
              </div>
            </>
          ) : (
            <p>No current singer selected.</p>
          )}
        </div>

 <div className="card">
        <h2 style={{ color: '#38bdf8' }}>
  📋 Queue
</h2>
        <div style={{ marginBottom: 12 }}>
  <button onClick={() => setSingerView(!singerView)}>
    {singerView ? 'Normal View' : 'Singer View'}
  </button>
</div>
        
     {singerView ? (
  Object.entries(singerGroups).map(([singer, songs]) => (
    <div className="leaderboard-row" key={singer}>
      <div style={{ width: '100%' }}>
        <strong style={{ color: '#38bdf8', fontSize: 22 }}>
  {singer} ({(songs as PerformanceRow[]).length} song
  {(songs as PerformanceRow[]).length !== 1 ? 's' : ''})
</strong>

        {(songs as PerformanceRow[]).map((p) => (
          <div
            key={p.id}
            style={{
              marginTop: 10,
              paddingLeft: 14,
              borderLeft: '3px solid #c2410c'
            }}
          >
            <div className="small">
              {p.song_title}
              {p.artist ? ` by ${p.artist}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  ))
) : (
  <>
    {rotatedQueue
  .filter((p) => p.status !== 'completed' && p.status !== 'skipped')
  .map((p, index) => (
  <div
  className="queue-row"
  key={p.id}
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  }}
>
        <div>
          {editingId === p.id ? (
            <div style={{ width: '100%' }}>
              <label>Singer name</label>
              <input
                value={editSingerName}
                onChange={(e) => setEditSingerName(e.target.value)}
              />

              <label>Song title</label>
              <input
                value={editSongTitle}
                onChange={(e) => setEditSongTitle(e.target.value)}
              />

              <label>Artist</label>
              <input
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
              />
            </div>
          ) : (
         <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 18 }}>
              #{index + 1} {p.singer_name} (Queue #{p.queue_order})
              </strong>

              <div className="small">
                {p.song_title}
                {p.artist ? ` by ${p.artist}` : ''}
              </div>
            </div>
          )}
        </div>

        <div
  style={{
    display: 'flex',
    gap: 6,
    alignItems: 'center'
  }}
>
          {editingId === p.id ? (
            <>
              <button onClick={() => saveEdit(p.id)}>Save</button>
              <button onClick={cancelEditing}>Cancel</button>
            </>
          ) : (
            <>
           <button
  className="btn-small primary"
  onClick={() => setCurrent(p.id)}
>
  ▶
</button>

<button
  className="btn-small"
  onClick={() => moveSinger(p.id, 'up')}
>
  ↑
</button>

<button
  className="btn-small"
  onClick={() => moveSinger(p.id, 'down')}
>
  ↓
</button>

<button
  className="btn-small warning"
  onClick={() => skipSinger(p.id)}
>
  Skip
</button>

<button
  className="btn-small danger"
  onClick={() => removeSinger(p.id)}
>
  ✕
</button>

<button
  className="btn-small"
  onClick={() => startEditing(p)}
>
  Edit
</button>
            </>
          )}
        </div>
      </div>
    ))}
  </>
)}
</div>
      
      <div className="card">
  <h2 style={{ color: '#38bdf8' }}>⚡ Quick Actions</h2>

  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
   <button
  onClick={startShow}
  style={{
    background: '#c2410c',
    color: 'white',
    fontWeight: 'bold'
  }}
>
  🎤 Start Show
</button>
    <button
      className="secondary"
      onClick={() => window.open(`/display/${eventId}`, '_blank')}
    >
      📺 Launch TV Display
    </button>

    <button
      onClick={() => toggleVoting(true)}
      style={{
        background: '#38bdf8',
        color: '#0f172a',
        fontWeight: 'bold'
      }}
    >
      Open Voting
    </button>

    <button
      onClick={() => toggleVoting(false)}
      style={{
        background: '#c2410c',
        color: 'white',
        fontWeight: 'bold'
      }}
    >
      Close Voting
    </button>

    <button
  className="secondary"
  onClick={() => window.open(`/peopleschoice/${eventId}`, '_blank')}
>
  🎉 People’s Choice
</button>

    <button
  onClick={endShow}
  style={{
    background: '#c2410c',
    color: 'white',
    fontWeight: 'bold'
  }}
>
  🏁 End Show
</button>

<button
  onClick={newShow}
  style={{
    background: '#c2410c',
    color: 'white',
    fontWeight: 'bold'
  }}
>
  ➕ New Show
 </button>
</div>
 </div>

 <h2
  style={{ color: '#38bdf8', cursor: 'pointer' }}
  onClick={() => setShowSingerSignup(!showSingerSignup)}
>
  🎤 Singer Signup {showSingerSignup ? '▲' : '▼'}
</h2>
      {showSingerSignup && (
  <>
        <label>Singer name</label>
        <input value={singerName} onChange={(e) => setSingerName(e.target.value)} />

        <label>Song title</label>
        <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />

        <label>Artist</label>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />

        <button onClick={addPerformance}>Add to Queue</button>
      </>
)}

<div className="card">
 <h2
  style={{ cursor: 'pointer' }}
  onClick={() => setShowAudienceAccess(!showAudienceAccess)}
>
  📱 Audience Access {showAudienceAccess ? '▲' : '▼'}
</h2>
  {showAudienceAccess && (
  <>

 <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16
  }}
>
  <div>
  <h3>Signup</h3>

<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }}
>
  <button onClick={() => navigator.clipboard.writeText(signupUrl)}>
  Copy Link
</button>

<button onClick={() => downloadQR(signupUrl, 'signup-qr.png')}>
  Download QR
</button>
  </div>

<label
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    width: 'fit-content',
    alignSelf: 'center'
  }}
>
    <input
      type="checkbox"
      checked={!!event?.show_signup_qr}
      onChange={(e) =>
        toggleQrSetting('show_signup_qr', e.target.checked)
      }
    />
    Show on TV
  </label>
</div>
      
    <div>
      <h3>Voting</h3>
     <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }}
>
      <button onClick={() => navigator.clipboard.writeText(voteUrl)}>Copy Link</button>
      <button onClick={() => downloadQR(voteUrl, 'voting-qr.png')}>Download QR</button>
    </div>

       <label
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    width: 'fit-content',
    alignSelf: 'center'
  }}
>
    <input
      type="checkbox"
      checked={!!event?.show_voting_qr}
      onChange={(e) =>
       toggleQrSetting('show_voting_qr', e.target.checked)
      }
    />
    Show on TV
  </label>
</div>
      
    <div>
      <h3>People's Choice</h3>
      <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }}
>
      <button onClick={() => navigator.clipboard.writeText(peoplesChoiceUrl)}>Copy Link</button>
      <button onClick={() => downloadQR(peoplesChoiceUrl, 'peoples-choice-qr.png')}>Download QR</button>
    </div>
      
  <label
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    width: 'fit-content',
    alignSelf: 'center'
  }}
>
    <input
      type="checkbox"
      checked={!!event?.show_peoples_choice_qr}
      onChange={(e) =>
       toggleQrSetting('show_peoples_choice_qr', e.target.checked)
      }
    />
    Show on TV
  </label>
</div>

    <div>
      <h3>Check-In</h3>
      <div
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }}
>
      <button onClick={() => navigator.clipboard.writeText(checkinUrl)}>Copy Link</button>
      <button onClick={() => downloadQR(checkinUrl, 'checkin-qr.png')}>Download QR</button>
    </div>

      <label
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    width: 'fit-content',
    alignSelf: 'center'
  }}
>
  <input
    type="checkbox"
    checked={!event?.show_checkin_qr}
    onChange={(e) =>
      toggleQrSetting('show_checkin_qr', e.target.checked)
    }
  />
  <span>Show on TV</span>
</label>
      </div>
  </div>
    </>
)}
</div>
<div className="card">
  <h2
  style={{ cursor: 'pointer' }}
  onClick={() => setShowCheckinSettings(!showCheckinSettings)}
>
  📍 Check-In Settings {showCheckinSettings ? '▲' : '▼'}
</h2>
{showCheckinSettings && (
  <>
  <label style={{ display: 'block', marginBottom: 12 }}>
    <input
      type="checkbox"
      checked={event?.checkin_required ?? false}
      onChange={(e) => toggleCheckinRequired(e.target.checked)}
    />
    {' '}Require check-in before People&apos;s Choice voting
  </label>

  <button className="secondary" onClick={useCurrentLocationForCheckin}>
    Use My Current Location
  </button>

  <p className="small">
    Current venue location:{' '}
    {event?.venue_lat && event?.venue_lng
      ? `${event.venue_lat.toFixed(5)}, ${event.venue_lng.toFixed(5)}`
      : 'Not set'}
  </p>

  <p className="small">
    Check-in radius: {event?.checkin_radius_meters || 150} meters
  </p>
  </>
  )}
    </div>

<div className="card">
  <h2>📍 Check-In Stats</h2>

  <p>
    <strong>Checked In:</strong> {checkinCount}
  </p>

  <p>
    <strong>People’s Choice Votes:</strong> {peoplesChoiceResults.reduce((sum, p) => sum + p.votes, 0)}
  </p>

  <p>
    <strong>Participation:</strong>{' '}
    {checkinCount > 0
      ? `${Math.round((peoplesChoiceResults.reduce((sum, p) => sum + p.votes, 0) / checkinCount) * 100)}%`
      : '0%'}
  </p>
</div>
      
<div className="grid">
             </div>

<div className="card">
  <h2 style={{ color: '#38bdf8' }}>✅ Completed Tonight</h2>

  {performances.filter((p) => p.status === 'completed').length > 0 ? (
    performances
      .filter((p) => p.status === 'completed')
      .map((p) => (
        <div className="leaderboard-row" key={p.id}>
          <div>
            <strong>{p.singer_name}</strong>
            <div className="small">
              {p.song_title}
              {p.artist ? ` by ${p.artist}` : ''}
            </div>
          </div>
        </div>
      ))
  ) : (
    <p className="small">No completed songs yet.</p>
  )}
</div>    
      
      <div className="card">
        <h2 style={{ color: '#38bdf8' }}>
  🏆 Leaderboard
</h2>
        {leaderboard.map((p, index) => (
          <div className="leaderboard-row" key={p.singer_name}>
          <div>
  <strong>
    #{index + 1} {p.singer_name}
  </strong>
</div>

<div>
 {p.averageScore.toFixed(2)} ⭐
<div className="small">
  TB: {((p.tiebreakerScore || 0) / p.performances).toFixed(2)}
</div>
</div>
     
          </div>
        ))}
      </div>
   
      <div className="card">
  <h2 style={{ color: '#c2410c' }}>
    🎉 People's Choice
  </h2>

  {peoplesChoiceResults.length === 0 ? (
    <p className="small">No votes yet.</p>
  ) : (
    peoplesChoiceResults.map((row, index) => (
      <div className="leaderboard-row" key={row.singer_name}>
        <div>
          <strong>
            #{index + 1} {row.singer_name}
          </strong>
        </div>

        <div>
          {row.votes} vote{row.votes !== 1 ? 's' : ''}
        </div>
      </div>
    ))
  )}
</div>
              
      <div
  style={{
    marginTop: 40,
    display: 'flex',
    justifyContent: 'center',
    gap: 40,
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    paddingTop: 20
  }}
>
  <div style={{ textAlign: 'center' }}>
    {signupUrl && <QRCodeSVG value={signupUrl} size={60} />}
    <div style={{ color: '#38bdf8', fontSize: 12 }}>
      Signup
    </div>
  </div>

<div style={{ textAlign: 'center' }}>
  {peoplesChoiceUrl && <QRCodeSVG value={peoplesChoiceUrl} size={60} />}
  <div style={{ color: '#facc15', fontSize: 12 }}>
    People's Choice
  </div>
</div>
    
  <div style={{ textAlign: 'center' }}>
    {voteUrl && <QRCodeSVG value={voteUrl} size={60} />}
    <div style={{ color: '#c2410c', fontSize: 12 }}>
      Vote
    </div>
  </div>
</div>
    </main>
  );
    }
