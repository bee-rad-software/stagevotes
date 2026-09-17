'use client';

import type { CSSProperties } from 'react';
import {
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';

type Props = {
  singerName: string;
  songTitle: string;
  venueName: string;
  hasProfile: boolean;
  onSave: () => void;
  onDismiss: () => void;
};

const confettiPieces = Array.from(
  { length: 42 },
  (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    delay: `${(index % 9) * 0.12}s`,
    duration: `${2.4 + (index % 5) * 0.25}s`,
    color: [
      '#f97316',
      '#facc15',
      '#38bdf8',
      '#22c55e',
      '#ffffff',
    ][index % 5],
    rotate: `${(index * 47) % 360}deg`,
  })
);

export default function SVFirstPerformanceCelebration({
  singerName,
  songTitle,
  venueName,
  hasProfile,
  onSave,
  onDismiss,
}: Props) {
  return (
    <div
      className="sv-achievement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      <div className="sv-achievement-spotlight" />

      <div className="sv-achievement-confetti">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            style={
              {
                left: piece.left,
                background: piece.color,
                animationDelay: piece.delay,
                animationDuration:
                  piece.duration,
                transform: `rotate(${piece.rotate})`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <button
        type="button"
        className="sv-achievement-close"
        onClick={onDismiss}
        aria-label="Close achievement"
      >
        <X size={22} />
      </button>

      <section className="sv-achievement-card">
        <div className="sv-achievement-kicker">
          <Sparkles size={16} />
          Achievement unlocked
        </div>

        <div className="sv-achievement-badge">
          <div className="sv-achievement-badge-ring">
            🎤
          </div>
        </div>

        <h1 id="achievement-title">
          First Performance
        </h1>

        <p className="sv-achievement-headline">
          You officially took the stage
          {singerName
            ? `, ${singerName}`
            : ''}
          !
        </p>

        <div className="sv-achievement-details">
          <strong>{songTitle}</strong>
          <span>{venueName}</span>
        </div>

        <div className="sv-achievement-progress">
          <div className="sv-achievement-progress-copy">
            <span>Your karaoke journey</span>
            <strong>1 performance</strong>
          </div>

          <div className="sv-achievement-progress-track">
            <div />
          </div>

          <p>
            24 more performances until
            <strong> ⭐ Regular Performer</strong>
          </p>
        </div>

        {!hasProfile && (
          <div className="sv-achievement-claim-copy">
            <strong>
              This badge belongs to you.
            </strong>

            <span>
              Save it to My Stage and keep
              building your karaoke story.
            </span>
          </div>
        )}

        <button
          type="button"
          className="sv-achievement-primary"
          onClick={onSave}
        >
          {hasProfile
            ? 'View My Stage'
            : 'Save to My Stage'}

          <ArrowRight size={18} />
        </button>

        <button
          type="button"
          className="sv-achievement-secondary"
          onClick={onDismiss}
        >
          Keep enjoying the show
        </button>
      </section>

      <style>{`
        .sv-achievement-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
justify-content: center;
align-items: flex-start;
overflow-x: hidden;
overflow-y: auto;
padding:
  max(72px, calc(env(safe-area-inset-top) + 56px))
  20px
  max(28px, env(safe-area-inset-bottom));
          color: #fff;
          background:
            radial-gradient(circle at 50% 25%, rgba(249,115,22,.28), transparent 32%),
            radial-gradient(circle at 50% 70%, rgba(56,189,248,.16), transparent 38%),
            linear-gradient(160deg, #020617 0%, #071426 55%, #140b18 100%);
          animation: svAchievementFade .35s ease-out;
        }

        .sv-achievement-spotlight {
          position: absolute;
          top: -35%;
          width: 70vw;
          height: 120vh;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,.18),
            transparent 70%
          );
          clip-path: polygon(46% 0, 54% 0, 100% 100%, 0 100%);
          filter: blur(18px);
          opacity: .45;
          animation: svSpotlight 2.8s ease-in-out infinite alternate;
        }

        .sv-achievement-confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .sv-achievement-confetti span {
          position: absolute;
          top: -30px;
          width: 9px;
          height: 18px;
          border-radius: 3px;
          animation-name: svConfettiFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .sv-achievement-close {
          position: absolute;
          top: max(18px, env(safe-area-inset-top));
          right: 18px;
          z-index: 3;
          display: grid;
          width: 44px;
          height: 44px;
          place-items: center;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 50%;
          color: #fff;
          background: rgba(15,23,42,.68);
        }

        .sv-achievement-card {
          position: relative;
          z-index: 2;
          width: min(100%, 430px);
          padding: 30px 24px 24px;
          text-align: center;
          border: 1px solid rgba(249,115,22,.4);
          border-radius: 30px;
          background:
            linear-gradient(
              160deg,
              rgba(15,23,42,.96),
              rgba(20,13,28,.94)
            );
          box-shadow:
            0 30px 90px rgba(0,0,0,.62),
            0 0 55px rgba(249,115,22,.17);
          animation: svAchievementRise .55s cubic-bezier(.2,.9,.25,1.2);
        }

        .sv-achievement-kicker {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          color: #facc15;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .sv-achievement-badge {
          display: grid;
          place-items: center;
          margin: 22px auto 16px;
        }

        .sv-achievement-badge-ring {
          display: grid;
          width: 116px;
          height: 116px;
          place-items: center;
          border: 4px solid #fb923c;
          border-radius: 50%;
          font-size: 54px;
          background:
            radial-gradient(
              circle,
              rgba(249,115,22,.3),
              rgba(15,23,42,.96) 68%
            );
          box-shadow:
            0 0 0 10px rgba(249,115,22,.1),
            0 0 45px rgba(249,115,22,.45);
          animation: svBadgePulse 1.6s ease-in-out infinite;
        }

        .sv-achievement-card h1 {
          margin: 0;
          font-size: clamp(34px, 10vw, 52px);
          line-height: .98;
          letter-spacing: -.045em;
        }

        .sv-achievement-headline {
          margin: 14px 0 0;
          color: #cbd5e1;
          font-size: 17px;
          line-height: 1.5;
        }

        .sv-achievement-details {
          display: grid;
          gap: 4px;
          margin-top: 18px;
          padding: 15px;
          border: 1px solid rgba(56,189,248,.18);
          border-radius: 17px;
          background: rgba(2,6,23,.42);
        }

        .sv-achievement-details strong {
          font-size: 17px;
        }

        .sv-achievement-details span {
          color: #7dd3fc;
          font-size: 13px;
          font-weight: 700;
        }

        .sv-achievement-progress {
          margin-top: 18px;
          text-align: left;
        }

        .sv-achievement-progress-copy {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #94a3b8;
          font-size: 12px;
        }

        .sv-achievement-progress-copy strong {
          color: #fff;
        }

        .sv-achievement-progress-track {
          height: 8px;
          margin-top: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(148,163,184,.16);
        }

        .sv-achievement-progress-track div {
          width: 4%;
          height: 100%;
          min-width: 12px;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #facc15,
            #f97316
          );
          animation: svProgressGrow .8s .35s both;
        }

        .sv-achievement-progress p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 12px;
        }

        .sv-achievement-progress p strong {
          color: #facc15;
        }

        .sv-achievement-claim-copy {
          display: grid;
          gap: 5px;
          margin-top: 20px;
          color: #cbd5e1;
          font-size: 13px;
          line-height: 1.45;
        }

        .sv-achievement-claim-copy strong {
          color: #fff;
          font-size: 16px;
        }

        .sv-achievement-primary,
        .sv-achievement-secondary {
          width: 100%;
          border-radius: 15px;
          font-weight: 900;
        }

        .sv-achievement-primary {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          margin-top: 20px;
          padding: 15px 18px;
          border: 0;
          color: #fff;
          background: linear-gradient(
            90deg,
            #f97316,
            #fb923c
          );
          box-shadow: 0 12px 30px rgba(249,115,22,.3);
        }

        .sv-achievement-secondary {
          margin-top: 9px;
          padding: 11px;
          border: 0;
          color: #94a3b8;
          background: transparent;
        }

        @keyframes svAchievementFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes svAchievementRise {
          from {
            opacity: 0;
            transform: translateY(35px) scale(.88);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes svBadgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.06);
          }
        }

        @keyframes svSpotlight {
          from { transform: rotate(-5deg); }
          to { transform: rotate(5deg); }
        }

        @keyframes svConfettiFall {
          0% {
            transform: translateY(-5vh) rotate(0);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: .15;
          }
        }

        @keyframes svProgressGrow {
          from { width: 0; }
          to { width: 4%; }
        }

        @media (max-height: 720px) {
          .sv-achievement-card {
            padding: 22px 20px 18px;
          }

          .sv-achievement-badge-ring {
            width: 88px;
            height: 88px;
            font-size: 42px;
          }

          .sv-achievement-card h1 {
            font-size: 34px;
          }

          .sv-achievement-details,
          .sv-achievement-progress {
            margin-top: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sv-achievement-overlay *,
          .sv-achievement-overlay *::before,
          .sv-achievement-overlay *::after {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}