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
    width: 320,
    maxWidth: 320,
    minHeight: '100vh',
    margin: "0 auto",
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 32%), linear-gradient(180deg, #020617, #0f172a)',
        color: 'white',
        padding: 14,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      
     <div
  key={current?.id || 'waiting'}
  style={{
    background: 'linear-gradient(135deg, #0ea5e9, #f97316)',
  borderRadius: 26,
  padding: 24,
  minHeight: 235,
  marginBottom: 18,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  boxShadow: '0 15px 35px rgba(0,0,0,.35)',
  animation: 'popIn 0.45s ease-out',       
}}
      >
   <div
  style={{
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 18,
  }}
>
  NOW SINGING
</div>

<div
  style={{
    fontSize: 46,
    textAlign: 'center',
    marginBottom: 8,
  }}
>
  🎤
</div>

<div
  style={{
    fontSize:
      (current?.singer_name || 'Waiting').length > 16
        ? 40
        : (current?.singer_name || 'Waiting').length > 11
        ? 48
        : 64,
    fontWeight: 900,
    textAlign: 'center',
    lineHeight: 1.02,
    textTransform: 'uppercase',
    wordBreak: 'break-word',
  }}
>
  {current?.singer_name || 'Waiting'}
</div>

<div
  style={{
    marginTop: 22,
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.2,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minHeight: 52,
    padding: '0 8px',
  }}
>
  {current?.song_title || ''}
</div>

<div
  style={{
    marginTop: 8,
    fontSize: 17,
    fontWeight: 500,
    opacity: 0.65,
    textAlign: 'center',
    letterSpacing: 0.3,
  }}
>
  {current?.artist || ''}
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

<style jsx global>{`
  @keyframes popIn {
    0% {
      opacity: 0;
      transform: translateY(18px) scale(0.96);
      filter: brightness(1.25);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: brightness(1);
    }
  }
`}</style>
    
  </main>
  );
}
