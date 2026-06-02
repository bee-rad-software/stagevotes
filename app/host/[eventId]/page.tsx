'use client';

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

  const voteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/vote/${eventId}`
      : '';

  const signupUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/signup/${eventId}`
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
        loadPerformances
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` },
        loadVotes
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function loadAll() {
    await Promise.all([loadEvent(), loadPerformances(), loadVotes()]);
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

  async function loadVotes() {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId);

    if (error) {
      console.error(error.message);
      return;
    }

    setVotes(data || []);
  }

  async function addPerformance() {
    if (!singerName.trim() || !songTitle.trim()) {
      alert('Singer name and song title are required.');
      return;
    }

    const nextOrder = performances.length + 1;

    const { error } = await supabase.from('performances').insert({
      event_id: eventId,
      singer_name: singerName.trim(),
      song_title: songTitle.trim(),
      artist: artist.trim(),
      queue_order: nextOrder
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

  const current = performances.find((p) => p.id === event?.current_performance_id);

  const rotatedQueue = useMemo(() => {
    const singerFirstOrder = new Map<string, number>();
    const singerSongCounts = new Map<string, number>();

    const withRotation = performances
      .slice()
      .sort((a, b) => a.queue_order - b.queue_order)
      .map((p) => {
        const singerKey = p.singer_name.trim().toLowerCase();

        if (!singerFirstOrder.has(singerKey)) {
          singerFirstOrder.set(singerKey, p.queue_order);
        }

        const songNumber = (singerSongCounts.get(singerKey) || 0) + 1;
        singerSongCounts.set(singerKey, songNumber);

        return {
          ...p,
          singerFirstOrder: singerFirstOrder.get(singerKey) || p.queue_order,
          songNumber
        };
      });

    return withRotation.sort((a, b) => {
      if (a.songNumber !== b.songNumber) {
        return a.songNumber - b.songNumber;
      }

      return a.singerFirstOrder - b.singerFirstOrder;
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
  const leaderboard = useMemo(() => {
    return performances
      .map((p) => {
        const pv = votes.filter((v) => v.performance_id === p.id);
        const avg = pv.length > 0 ? pv.reduce((sum, v) => sum + v.score, 0) / pv.length : 0;

        return {
          ...p,
          avg,
          voteCount: pv.length
        };
      })
      .sort((a, b) => b.avg - a.avg || b.voteCount - a.voteCount);
  }, [performances, votes]);

  return (
    <main
  className="container"
  style={{
    maxWidth: 1400,
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
      background: event?.is_voting_open ? '#16a34a' : '#6b7280',
      color: 'white',
      fontWeight: 800
    }}
  >
    {event?.is_voting_open ? 'Voting Open' : 'Voting Closed'}
  </div>
</div>
      <div className="grid">
        <div className="card">
          <h2>Audience voting link</h2>
          <div className="qr-box">
            {voteUrl && <QRCodeSVG value={voteUrl} size={220} />}
          </div>
          <p className="small">{voteUrl}</p>
          <Link href={`/vote/${eventId}`}>
            <button className="secondary">Open Voting Page</button>
          </Link>
        </div>

        <div className="card">
          <h2>Singer signup link</h2>
          <div className="qr-box">
            {signupUrl && <QRCodeSVG value={signupUrl} size={220} />}
          </div>
          <p className="small">{signupUrl}</p>
          <Link href={`/signup/${eventId}`}>
            <button className="secondary">Open Signup Page</button>
          </Link>
        </div>
<div className="card">
  <h2>TV Display</h2>

  <p className="small">
    Open on a TV or projector
  </p>

  <button
  className="secondary"
  onClick={() => window.open(`/display/${eventId}`, '_blank')}
>
  Launch TV Display
</button>
</div>
        <div className="card">
          <h2>Now singing</h2>
          {current ? (
            <>
              <h3>{current.singer_name}</h3>
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
      </div>

      <div className="card">
        <h2>Add singer</h2>
        <label>Singer name</label>
        <input value={singerName} onChange={(e) => setSingerName(e.target.value)} />

        <label>Song title</label>
        <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />

        <label>Artist</label>
        <input value={artist} onChange={(e) => setArtist(e.target.value)} />

        <button onClick={addPerformance}>Add to Queue</button>
      </div>

      <div className="card">
        <h2>Queue</h2>
        {rotatedQueue.map((p) => (
          <div className="leaderboard-row" key={p.id}>
            <div>
             <strong>
  {p.singer_name} (Song #{p.songNumber})
</strong>
              <div className="small">
                {p.song_title}
                {p.artist ? ` by ${p.artist}` : ''}
              </div>
            </div>
            <button className="secondary" onClick={() => setCurrent(p.id)}>
              Make Current
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Leaderboard</h2>
        {leaderboard.map((p, index) => (
          <div className="leaderboard-row" key={p.id}>
            <div>
              <strong>
                #{index + 1} {p.singer_name}
              </strong>
              <div className="small">{p.song_title}</div>
            </div>
            <div>
              {p.avg.toFixed(2)} / 5 · {p.voteCount} votes
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
