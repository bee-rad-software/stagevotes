'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState } from 'react';
import { supabase, EventRow, PerformanceRow, VoteRow } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function DisplayPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [performances, setPerformances] = useState<PerformanceRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);

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
      .channel(`display-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, loadEvent)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances', filter: `event_id=eq.${eventId}` }, loadPerformances)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `event_id=eq.${eventId}` }, loadVotes)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function loadAll() {
    await Promise.all([loadEvent(), loadPerformances(), loadVotes()]);
  }

  async function loadEvent() {
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
    setEvent(data);
  }

  async function loadPerformances() {
    const { data } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId)
      .order('queue_order', { ascending: true });

    setPerformances(data || []);
  }

  async function loadVotes() {
    const { data } = await supabase.from('votes').select('*').eq('event_id', eventId);
    setVotes(data || []);
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

const upcoming = rotatedQueue
  .filter((p) => p.id !== event?.current_performance_id && p.status !== 'completed')
  .slice(0, 5);
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
      .filter((p) => p.voteCount > 0)
      .sort((a, b) => b.avg - a.avg || b.voteCount - a.voteCount)
      .slice(0, 5);
  }, [performances, votes]);

  return (
  <main
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050510 0%, #111827 45%, #312e81 100%)',
      color: 'white',
      padding: '32px',
      fontFamily: 'Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    <div style={{ position: 'fixed', bottom: 24, left: 24, textAlign: 'center' }}>
      <div style={{ background: 'white', padding: 10, borderRadius: 14 }}>
        {signupUrl && <QRCodeSVG value={signupUrl} size={125} />}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>SIGN UP</div>
    </div>

    <div style={{ position: 'fixed', bottom: 24, right: 24, textAlign: 'center' }}>
      <div style={{ background: 'white', padding: 10, borderRadius: 14 }}>
        {voteUrl && <QRCodeSVG value={voteUrl} size={125} />}
      </div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900 }}>VOTE</div>
    </div>

    <header style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ fontSize: 26, letterSpacing: 5, color: '#facc15', fontWeight: 900 }}>
        KARAOKE CONTEST LIVE
      </div>
      <div style={{ fontSize: 22, opacity: 0.75 }}>
        {event?.name}{event?.venue ? ` • ${event.venue}` : ''}
      </div>
    </header>

    <section
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        gap: 24,
        alignItems: 'stretch'
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          padding: 24
        }}
      >
        <h2 style={{ fontSize: 34, marginTop: 0 }}>🏆 Top Scores</h2>

        {leaderboard.length > 0 ? (
          leaderboard.slice(0, 5).map((p, index) => (
            <div
              key={p.id}
              style={{
                padding: '16px 0',
                borderBottom: '1px solid rgba(255,255,255,0.15)'
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900 }}>
                {index + 1}. {p.singer_name}
              </div>
              <div style={{ fontSize: 24, color: '#facc15', fontWeight: 900 }}>
                {p.avg.toFixed(2)} ⭐
              </div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 26 }}>No votes yet.</p>
        )}
      </div>

      <div
        style={{
          background: 'rgba(0,0,0,0.35)',
          border: '2px solid rgba(250,204,21,0.5)',
          borderRadius: 32,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(250,204,21,0.15)'
        }}
      >
        <div style={{ fontSize: 40, color: '#facc15', fontWeight: 900, letterSpacing: 4 }}>
          🎤 NOW SINGING
        </div>

        {current ? (
          <>
            <h1 style={{ fontSize: 92, margin: '28px 0 10px', textTransform: 'uppercase' }}>
              {current.singer_name}
            </h1>

            <div style={{ fontSize: 44, opacity: 0.95 }}>
              {current.song_title}
              {current.artist ? ` by ${current.artist}` : ''}
            </div>

            <div
              style={{
                marginTop: 34,
                display: 'inline-block',
                padding: '14px 34px',
                borderRadius: 999,
                background: event?.is_voting_open ? '#16a34a' : '#6b7280',
                fontSize: 30,
                fontWeight: 900
              }}
            >
              {event?.is_voting_open ? 'VOTING OPEN' : 'VOTING CLOSED'}
            </div>
          </>
        ) : (
          <h1 style={{ fontSize: 60 }}>Waiting for first singer...</h1>
        )}
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          padding: 24
        }}
      >
        <h2 style={{ fontSize: 34, marginTop: 0 }}>⏭ Up Next</h2>

        {upcoming.length > 0 ? (
          upcoming.slice(0, 5).map((p, index) => (
            <div
              key={p.id}
              style={{
                padding: '16px 0',
                borderBottom: '1px solid rgba(255,255,255,0.15)'
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900 }}>
                {index + 1}. {p.singer_name}
              </div>
              <div style={{ fontSize: 22, opacity: 0.75 }}>{p.song_title}</div>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 26 }}>No singers waiting.</p>
        )}
      </div>
    </section>
  </main>
);
}
