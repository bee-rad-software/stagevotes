'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function KaraFunDisplay() {
  const params = useParams();
  const eventId = params.eventId;

  const [event, setEvent] = useState(null);
  const [performances, setPerformances] = useState([]);

  const signupUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/signup/${eventId}`
      : '';

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel(`karafun-display-${eventId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function loadAll() {
    await Promise.all([loadEvent(), loadPerformances()]);
  }

  async function loadEvent() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

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

  const current = performances.find(
    (p) => p.id === event?.current_performance_id
  );

  const rotatedQueue = useMemo(() => {
    const singerFirstOrder = new Map();
    const singerSongCounts = new Map();

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
          songNumber,
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

  return (
    <main
      style={{
        width: '100vw',
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 32%), linear-gradient(180deg, #020617, #0f172a)',
        color: 'white',
        padding: 20,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
     <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  }}
>
  <img
    src="/stagevotes-logo.png"
    alt="StageVotes"
    style={{
      height: 42,
      width: "auto",
    }}
  />

  <div
    style={{
      fontSize: 11,
      color: "#94a3b8",
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
    }}
  >
    LIVE DISPLAY
  </div>
</div>
      
      <div
        style={{
          background: 'linear-gradient(135deg, #0ea5e9, #f97316)',
          borderRadius: 22,
          padding: 18,
          marginBottom: 14,
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4 }}>
          NOW SINGING
        </div>

        <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8 }}>
          🎤 {current?.singer_name || 'Waiting...'}
        </div>

        <div style={{ fontSize: 16, opacity: 0.9, marginTop: 6 }}>
          {current?.song_title || 'Song will appear here'}
          {current?.artist ? ` — ${current.artist}` : ''}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid rgba(148,163,184,0.25)',
          borderRadius: 22,
          padding: 18,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: '#38bdf8',
            fontWeight: 900,
            letterSpacing: 1.4,
            marginBottom: 10,
          }}
        >
          UP NEXT
        </div>

        {upcoming.length === 0 ? (
          <div style={{ fontSize: 20, color: '#cbd5e1' }}>
            No singers waiting
          </div>
        ) : (
          upcoming.map((p, index) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 21,
                fontWeight: 800,
                padding: '8px 0',
                borderBottom:
                  index < upcoming.length - 1
                    ? '1px solid rgba(148,163,184,0.18)'
                    : 'none',
              }}
            >
              <span style={{ color: '#f97316', minWidth: 28 }}>
                {index + 1}.
              </span>
              <span>{p.singer_name}</span>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 22,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 14,
            padding: 10,
            width: 116,
            height: 116,
            margin: '0 auto 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {signupUrl && <QRCodeSVG value={signupUrl} size={96} />}
        </div>

        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Scan to Join
        </div>

        <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
          Add your song from your phone
        </div>
      </div>
    </main>
  );
}
