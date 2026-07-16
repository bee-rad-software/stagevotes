'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import AppQRCode from '@/components/AppQRCode';

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

 const activeQueue = performances
  .filter(
    (p) => p.status !== "completed" && p.status !== "skipped"
  )
  .sort((a, b) => {
    const roundDiff = (a.round || 1) - (b.round || 1);
    if (roundDiff !== 0) return roundDiff;

    return (a.queue_order || 0) - (b.queue_order || 0);
  });

const upcoming = activeQueue
  .filter((p) => p.id !== event?.current_performance_id)
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
  style={{
    position: 'relative',
    marginBottom: 18,
  }}
>
  <div
    style={{
      position: 'absolute',
      inset: -18,
      borderRadius: 42,
      background:
        'radial-gradient(circle at 70% 75%, rgba(249,115,22,.45), transparent 60%), radial-gradient(circle at 25% 20%, rgba(56,189,248,.35), transparent 55%)',
      opacity: 1,
filter: 'blur(50px)',
      animation: 'glowPulse 8s ease-in-out infinite',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  />

{/* Spotlights */}
<div
  style={{
    position: 'absolute',
    top: -160,
    left: 30,
    width: 140,
    height: 500,
    background:
      'linear-gradient(to bottom, rgba(255,255,255,.28), rgba(255,255,255,0))',
    clipPath: 'polygon(45% 0%,55% 0%,100% 100%,0% 100%)',
    filter: 'blur(10px)',
    transformOrigin: 'top center',
    animation: 'beamLeft 8s ease-in-out infinite',
    pointerEvents: 'none',
    zIndex: 2,
  }}
/>

<div
  style={{
    position: 'absolute',
    top: -160,
    right: 30,
    width: 140,
    height: 500,
    background:
      'linear-gradient(to bottom, rgba(255,255,255,.22), rgba(255,255,255,0))',
    clipPath: 'polygon(45% 0%,55% 0%,100% 100%,0% 100%)',
    filter: 'blur(10px)',
    transformOrigin: 'top center',
    animation: 'beamRight 10s ease-in-out infinite',
    pointerEvents: 'none',
    zIndex: 2,
  }}
/>

<div
  style={{
    position: 'absolute',
    top: -120,
    left: -180,
    width: 140,
    height: 520,
    background:
      'linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent)',
    transform: 'rotate(28deg)',
    animation: 'shineSweep 8s ease-in-out infinite',
    pointerEvents: 'none',
    zIndex: 2,
  }}
/>

  <div
    key={current?.id || 'waiting'}
    style={{
      background: 'linear-gradient(135deg, #38bdf8 0%, #60c5ff 22%, #fb923c 62%, #f97316 82%, #ea580c 100%)',
      backgroundSize: '180% 180%',
      animation: 'gradientShift 18s ease-in-out infinite, popIn 0.8s cubic-bezier(0.22,1,0.36,1)',
      position: 'relative',
      zIndex: 1,
      borderRadius: 26,
      padding: 24,
      minHeight: 235,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 15px 35px rgba(0,0,0,.35)',
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

<motion.div
  animate={{ y: [0, -6, 0] }}
  transition={{
    duration: 2.2,
    repeat: Infinity,
    ease: "easeInOut",
  }}
  style={{
    fontSize: 46,
    textAlign: 'center',
    marginBottom: 8,
  }}
>
  🎤
</motion.div>

<motion.div
  key={current?.id || 'waiting-singer'}
  initial={{ opacity: 0, x: 35, scale: 0.96 }}
  animate={{ opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, x: -35, scale: 0.96 }}
  transition={{
  duration: 0.75,
  ease: [0.22, 1, 0.36, 1],
}}
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
</motion.div>

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
           <motion.div
  key={p.id}
  layout
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -16 }}
  transition={{
    duration: 0.35,
    ease: "easeOut",
  }}
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
            </motion.div>
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
          <AppQRCode value={signupUrl} size={96} />
        </div>

        <div style={{ fontSize: 20, fontWeight: 900 }}>
          Scan to Join
        </div>

        <div style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4 }}>
          Add your song from your phone
        </div>
      </div>

<style jsx global>{`
 
 @keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
 
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

@keyframes shineSweep {
  0% {
    transform: translateX(-220px) rotate(28deg);
    opacity: 0;
  }

  10% {
    opacity: 0.9;
  }

  45% {
    transform: translateX(520px) rotate(28deg);
    opacity: 0.9;
  }

  60% {
    opacity: 0;
  }

  100% {
    transform: translateX(520px) rotate(28deg);
    opacity: 0;
  }
}

@keyframes beamLeft {
  0%   { transform: rotate(-12deg); opacity:.18; }
  50%  { transform: rotate(8deg); opacity:.38; }
  100% { transform: rotate(-12deg); opacity:.18; }
}

@keyframes beamRight {
  0%   { transform: rotate(12deg); opacity:.14; }
  50%  { transform: rotate(-8deg); opacity:.32; }
  100% { transform: rotate(12deg); opacity:.14; }
}

`}</style>
    
  </main>
  );
}
