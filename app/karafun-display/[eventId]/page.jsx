'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import AppQRCode from '@/components/AppQRCode';
import {
  buildRotationQueue,
} from '@/lib/rotationQueue';

export default function KaraFunDisplay() {
  const params = useParams();
  const eventId = params.eventId;

  const [event, setEvent] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [profilePhotos, setProfilePhotos] = useState({});

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

  const performanceRows = data || [];

  setPerformances(performanceRows);

  const { data: profiles } = await supabase
    .from('singer_profiles')
    .select(
      'id, stage_name, display_name, photo_url'
    );

  const nextPhotos = {};

  (profiles || []).forEach((profile) => {
    if (!profile.photo_url) {
      return;
    }

    nextPhotos[profile.id] =
      profile.photo_url;

    const stageName =
      profile.stage_name
        ?.trim()
        .toLowerCase();

    const displayName =
      profile.display_name
        ?.trim()
        .toLowerCase();

    if (stageName) {
      nextPhotos[`name:${stageName}`] =
        profile.photo_url;
    }

    if (displayName) {
      nextPhotos[`name:${displayName}`] =
        profile.photo_url;
    }
  });

  setProfilePhotos(nextPhotos);
}

  const current = performances.find(
    (p) => p.id === event?.current_performance_id
  );

const activeQueue =
  buildRotationQueue(
    performances,
    event?.current_performance_id
  );

const upcoming = activeQueue
  .filter((p) => p.id !== event?.current_performance_id)
  .slice(0, 5);

function SingerAvatar({
  performance,
  size = 48,
}) {
  const singerKey =
    performance?.singer_name
      ?.trim()
      .toLowerCase();

  const photoUrl =
    (
      performance?.singer_profile_id
        ? profilePhotos[
            performance.singer_profile_id
          ]
        : ''
    ) ||
    (
      singerKey
        ? profilePhotos[
            `name:${singerKey}`
          ]
        : ''
    ) ||
    '';

  const initial =
    performance?.singer_name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || '?';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          border:
            '2px solid rgba(255,255,255,.35)',
          boxShadow:
            '0 6px 18px rgba(0,0,0,.28)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: size * 0.4,
        background:
          'linear-gradient(135deg,#38bdf8,#f97316)',
        color: 'white',
        border:
          '2px solid rgba(255,255,255,.25)',
      }}
    >
      {initial}
    </div>
  );
}
  useEffect(() => {
 let hideTimer;

  const showCursor = () => {
    document.body.style.cursor = 'default';

    clearTimeout(hideTimer);

    hideTimer = setTimeout(() => {
      document.body.style.cursor = 'none';
    }, 2500);
  };

  window.addEventListener('mousemove', showCursor);

  showCursor();

  return () => {
    window.removeEventListener(
      'mousemove',
      showCursor
    );

    clearTimeout(hideTimer);

    document.body.style.cursor = 'default';
  };
}, []);

  return (
  <main
    className="kf-display"
    onDoubleClick={async () => {
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // Browser may block fullscreen.
        }
      }
    }}
  >
    <div className="kf-ambient kf-ambient-blue" />
    <div className="kf-ambient kf-ambient-orange" />

    <div className="kf-stage-light kf-stage-light-left" />
    <div className="kf-stage-light kf-stage-light-right" />

    <header className="kf-header">
      <div className="kf-brand">
        <div className="kf-brand-mark">
          SV
        </div>

        <div>
          <div className="kf-brand-name">
            STAGEVOTES
          </div>

          <div className="kf-brand-subtitle">
            KARAOKE LIVE
          </div>
        </div>
      </div>

      <div className="kf-live-pill">
        <span className="kf-live-dot" />
        LIVE
      </div>
    </header>

    <section className="kf-layout">
      <AnimatePresence mode="wait">
        <motion.section
          key={current?.id || 'waiting'}
          className="kf-now"
          initial={{
            opacity: 0,
            scale: 0.985,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            scale: 1.015,
          }}
          transition={{
            duration: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="kf-now-glow" />

          <div className="kf-now-content">
            <div className="kf-kicker">
              NOW SINGING
            </div>

            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="kf-avatar-shell"
            >
              <div className="kf-avatar-glow" />

              <SingerAvatar
  performance={current}
  size={78}
/>
            </motion.div>

            <motion.h1
              key={
                current?.singer_name ||
                'waiting'
              }
              initial={{
                opacity: 0,
                y: 18,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.08,
                duration: 0.5,
              }}
              className="kf-singer"
            >
              {current?.singer_name ||
                'Waiting'}
            </motion.h1>

            {current?.song_title && (
              <div className="kf-song">
                {current.song_title}
              </div>
            )}

            {current?.artist && (
              <div className="kf-artist">
                {current.artist}
              </div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      <aside className="kf-side">
        <section className="kf-up-next">
          <div className="kf-section-heading">
            <span>UP NEXT</span>

            <span className="kf-section-count">
              {upcoming.length}
            </span>
          </div>

          <div className="kf-queue">
            {upcoming.length === 0 ? (
              <div className="kf-empty">
                <div className="kf-empty-icon">
                  🎤
                </div>

                <div>
                  <strong>
                    The stage is open
                  </strong>

                  <span>
                    Scan below to join the
                    rotation.
                  </span>
                </div>
              </div>
            ) : (
              upcoming.map(
                (performance, index) => (
                  <motion.div
                    key={performance.id}
                    layout
                    initial={{
                      opacity: 0,
                      x: 30,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.05,
                    }}
                    className={
                      index === 0
                        ? 'kf-queue-row kf-queue-row-next'
                        : 'kf-queue-row'
                    }
                  >
                    <div className="kf-position">
                      {index + 1}
                    </div>

                    <SingerAvatar
                      performance={
                        performance
                      }
                      size={
  index === 0
    ? 42
    : 32
}
                    />

                    <div className="kf-queue-copy">
                      <div className="kf-queue-singer">
                        {
                          performance.singer_name
                        }
                      </div>

                      <div className="kf-queue-song">
                        {
                          performance.song_title
                        }
                      </div>
                    </div>

                    {index === 0 && (
                      <div className="kf-next-chip">
                        NEXT
                      </div>
                    )}
                  </motion.div>
                )
              )
            )}
          </div>
        </section>

        <section className="kf-join">
          <div className="kf-join-copy">
            <div className="kf-kicker kf-kicker-blue">
              WANT TO SING?
            </div>

            <div className="kf-join-title">
              Join the rotation
            </div>

            <div className="kf-join-description">
              Scan with your phone and add
              your song.
            </div>
          </div>

          <div className="kf-qr">
            <AppQRCode
              value={signupUrl}
              size={92}
            />
          </div>
        </section>
      </aside>
    </section>

    <footer className="kf-footer">
      <span>
        Powered by StageVotes
      </span>

      <span className="kf-footer-hint">
        Double-click anywhere for fullscreen
      </span>
    </footer>

    <style jsx global>{`
      html,
      body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #020617;
      }

      body {
        overscroll-behavior: none;
      }

      * {
        box-sizing: border-box;
      }

      .kf-display {
  position: relative;
  width: min(430px, 100vw);
  height: 100vh;
  min-height: 100vh;
  margin-left: auto;
margin-right: 0;
        overflow: hidden;
        color: white;
        background:
          radial-gradient(
            circle at 18% 20%,
            rgba(56, 189, 248, 0.14),
            transparent 34%
          ),
          radial-gradient(
            circle at 82% 70%,
            rgba(249, 115, 22, 0.12),
            transparent 32%
          ),
          linear-gradient(
            145deg,
            #020617 0%,
            #07101f 48%,
            #020617 100%
          );
        font-family:
          Arial,
          Helvetica,
          sans-serif;
        display: grid;
        grid-template-rows:
          auto minmax(0, 1fr) auto;
        padding: clamp(20px, 2vw, 38px);
      }

      .kf-ambient {
        position: absolute;
        border-radius: 50%;
        filter: blur(100px);
        pointer-events: none;
        opacity: 0.4;
      }

      .kf-ambient-blue {
        width: 38vw;
        height: 38vw;
        top: -20vw;
        left: -12vw;
        background: #38bdf8;
      }

      .kf-ambient-orange {
        width: 34vw;
        height: 34vw;
        right: -13vw;
        bottom: -16vw;
        background: #f97316;
      }

      .kf-stage-light {
        position: absolute;
        top: -30vh;
        width: 22vw;
        height: 105vh;
        pointer-events: none;
        opacity: 0.12;
        filter: blur(16px);
        background:
          linear-gradient(
            to bottom,
            rgba(255,255,255,0.7),
            rgba(255,255,255,0)
          );
        clip-path:
          polygon(
            47% 0%,
            53% 0%,
            100% 100%,
            0% 100%
          );
      }

      .kf-stage-light-left {
        left: 8vw;
        transform: rotate(-12deg);
        animation:
          kfBeamLeft 10s
          ease-in-out infinite;
      }

      .kf-stage-light-right {
        right: 8vw;
        transform: rotate(12deg);
        animation:
          kfBeamRight 12s
          ease-in-out infinite;
      }

      .kf-header {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom:
          clamp(16px, 2vh, 28px);
      }

      .kf-brand {
        display: flex;
        align-items: center;
        gap: 13px;
      }

      .kf-brand-mark {
        width: 46px;
        height: 46px;
        border-radius: 13px;
        display: grid;
        place-items: center;
        font-size: 15px;
        font-weight: 950;
        letter-spacing: -0.5px;
        background:
          linear-gradient(
            135deg,
            #38bdf8,
            #f97316
          );
        box-shadow:
          0 8px 26px
          rgba(0, 0, 0, 0.35);
      }

      .kf-brand-name {
        font-size:
          clamp(15px, 1.2vw, 22px);
        font-weight: 950;
        letter-spacing: 0.16em;
      }

      .kf-brand-subtitle {
        margin-top: 3px;
        color: #64748b;
        font-size:
          clamp(8px, 0.65vw, 11px);
        font-weight: 900;
        letter-spacing: 0.2em;
      }

      .kf-live-pill {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 14px;
        border-radius: 999px;
        font-size:
          clamp(11px, 0.8vw, 14px);
        font-weight: 900;
        letter-spacing: 0.1em;
        background:
          rgba(34, 197, 94, 0.11);
        border:
          1px solid
          rgba(34, 197, 94, 0.35);
        color: #86efac;
      }

      .kf-live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow:
          0 0 14px #22c55e;
        animation:
          kfPulse 1.8s infinite;
      }

     .kf-layout {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

      .kf-now {
  position: relative;
  min-height: 0;
  flex: 0 0 275px;
  overflow: hidden;
  border-radius: 32px;
  display: grid;
  place-items: center;
  padding: 18px;
        background:
          linear-gradient(
            135deg,
            rgba(56,189,248,0.94)
            0%,
            rgba(59,130,246,0.84)
            23%,
            rgba(249,115,22,0.92)
            68%,
            rgba(234,88,12,0.96)
            100%
          );
        box-shadow:
          0 35px 100px
          rgba(0,0,0,0.42);
      }

      .kf-now::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(
            115deg,
            transparent 15%,
            rgba(255,255,255,0.09)
            42%,
            transparent 62%
          );
        animation:
          kfShimmer 10s
          ease-in-out infinite;
        pointer-events: none;
      }

      .kf-now-glow {
        position: absolute;
        width: 55%;
        aspect-ratio: 1;
        border-radius: 50%;
        top: -28%;
        left: -12%;
        background:
          rgba(255,255,255,0.16);
        filter: blur(90px);
      }

      .kf-now-content {
        position: relative;
        z-index: 3;
        width: min(100%, 950px);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .kf-kicker {
        font-size:
          clamp(11px, 0.9vw, 16px);
        font-weight: 950;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color:
          rgba(255,255,255,0.88);
      }

      .kf-kicker-blue {
        color: #38bdf8;
      }

     .kf-avatar-shell {
  position: relative;
  width: 82px;
  height: 82px;
  margin: 10px 0 6px;
  display: grid;
  place-items: center;
}

      .kf-avatar-glow {
        position: absolute;
        inset: -12px;
        border-radius: 50%;
        background:
          rgba(255,255,255,0.28);
        filter: blur(22px);
        animation:
          kfGlow 3s
          ease-in-out infinite;
      }

      .kf-singer {
        margin: 0;
        max-width: 100%;
        font-size: 64px;
        font-weight: 950;
        letter-spacing: -0.055em;
        line-height: 0.9;
        text-transform: uppercase;
        text-wrap: balance;
        text-shadow:
          0 10px 35px
          rgba(0,0,0,0.2);
      }

      .kf-song {
        margin-top: 12px;
        max-width: 90%;
        font-size: 24px;
        font-weight: 900;
        line-height: 1.05;
        text-wrap: balance;
      }

      .kf-artist {
        margin-top: 5px;
font-size: 16px;
        font-weight: 650;
        color:
          rgba(255,255,255,0.7);
      }

      .kf-side {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

      .kf-up-next,
      .kf-join {
        position: relative;
        overflow: hidden;
        background:
          rgba(15,23,42,0.72);
        border:
          1px solid
          rgba(148,163,184,0.16);
        box-shadow:
          0 30px 70px
          rgba(0,0,0,0.28);
        backdrop-filter: blur(22px);
      }

     .kf-up-next {
  flex: 0 0 345px;
  height: 345px;
  min-height: 345px;
  overflow: hidden;
}

      .kf-section-heading {
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        margin-bottom: 8px;
        color: #38bdf8;
        font-size:
          clamp(12px, 0.9vw, 16px);
        font-weight: 950;
        letter-spacing: 0.18em;
      }

      .kf-section-count {
        display: grid;
        place-items: center;
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        border-radius: 999px;
        background:
          rgba(56,189,248,0.12);
      }

      .kf-queue {
  display: grid;
  gap: 2px;
}

      .kf-queue-row {
  position: relative;
  display: grid;
  grid-template-columns:
    24px auto minmax(0,1fr)
    auto;
  align-items: center;
  gap: 7px;
  padding: 3px 5px;
  border-radius: 12px;
  transition:
    background 0.2s ease;
}

      .kf-queue-row-next {
  padding: 4px 5px;
        background:
          linear-gradient(
            90deg,
            rgba(56,189,248,0.13),
            rgba(56,189,248,0.025)
          );
        border:
          1px solid
          rgba(56,189,248,0.2);
      }

      .kf-position {
        color: #f97316;
        font-size:
          clamp(18px, 1.35vw, 25px);
        font-weight: 950;
      }

      .kf-queue-copy {
        min-width: 0;
      }

      .kf-queue-singer {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size:
          clamp(18px, 1.45vw, 28px);
        font-weight: 950;
      }

      .kf-queue-song {
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #94a3b8;
        font-size:
          clamp(11px, 0.9vw, 16px);
        font-weight: 650;
      }

      .kf-next-chip {
        padding: 6px 8px;
        border-radius: 999px;
        background:
          rgba(56,189,248,0.12);
        color: #38bdf8;
        font-size: 10px;
        font-weight: 950;
        letter-spacing: 0.1em;
      }

      .kf-empty {
        display: flex;
        gap: 14px;
        align-items: center;
        padding: 18px 4px;
        color: #cbd5e1;
      }

      .kf-empty-icon {
        font-size: 34px;
      }

      .kf-empty strong,
      .kf-empty span {
        display: block;
      }

      .kf-empty strong {
        font-size: 18px;
      }

      .kf-empty span {
        margin-top: 5px;
        color: #64748b;
        font-size: 13px;
      }

      .kf-join {
        border-radius: 26px;
        padding:
          clamp(18px, 1.6vw, 26px);
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        gap: 18px;
      }

      .kf-join-copy {
        min-width: 0;
      }

      .kf-join-title {
        margin-top: 8px;
        font-size:
          clamp(20px, 1.65vw, 30px);
        font-weight: 950;
      }

      .kf-join-description {
        margin-top: 6px;
        max-width: 260px;
        color: #94a3b8;
        font-size:
          clamp(11px, 0.8vw, 14px);
        line-height: 1.4;
      }

      .kf-qr {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        padding: 10px;
        border-radius: 16px;
        background: white;
        box-shadow:
          0 12px 36px
          rgba(0,0,0,0.35);
      }

      .kf-footer {
        position: relative;
        z-index: 10;
        display: flex;
        justify-content:
          space-between;
        align-items: center;
        padding-top:
          clamp(12px, 1.5vh, 20px);
        color: #475569;
        font-size:
          clamp(9px, 0.7vw, 12px);
        font-weight: 700;
        letter-spacing: 0.04em;
      }

      .kf-footer-hint {
        opacity: 0.65;
      }

      @keyframes kfPulse {
        0%, 100% {
          opacity: 0.6;
          transform: scale(0.9);
        }

        50% {
          opacity: 1;
          transform: scale(1.15);
        }
      }

      @keyframes kfGlow {
        0%, 100% {
          opacity: 0.45;
          transform: scale(0.95);
        }

        50% {
          opacity: 0.85;
          transform: scale(1.08);
        }
      }

      @keyframes kfShimmer {
        0% {
          transform:
            translateX(-45%);
        }

        50% {
          transform:
            translateX(45%);
        }

        100% {
          transform:
            translateX(-45%);
        }
      }

      @keyframes kfBeamLeft {
        0%, 100% {
          transform: rotate(-12deg);
        }

        50% {
          transform: rotate(4deg);
        }
      }

      @keyframes kfBeamRight {
        0%, 100% {
          transform: rotate(12deg);
        }

        50% {
          transform: rotate(-4deg);
        }
      }

    `}</style>
  </main>
);
}