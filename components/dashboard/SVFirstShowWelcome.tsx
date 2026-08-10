'use client';

import {
  CheckCircle2,
  Monitor,
  QrCode,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

type SVFirstShowWelcomeProps = {
  onDismiss: () => void;
  onOpenDisplay: () => void;
  onShareSignupQr: () => void;
  onAddSinger: () => void;

  displayComplete: boolean;
  audienceComplete: boolean;
  singerComplete: boolean;
};

export default function SVFirstShowWelcome({
  onDismiss,
  onOpenDisplay,
  onShareSignupQr,
  onAddSinger,
  displayComplete,
  audienceComplete,
  singerComplete
}: SVFirstShowWelcomeProps) {

const setupComplete =
  displayComplete &&
  audienceComplete &&
  singerComplete;

 const hasCelebratedRef = useRef(false);

useEffect(() => {
  if (!setupComplete) return;
  if (hasCelebratedRef.current) return;

  hasCelebratedRef.current = true;

  confetti({
    particleCount: 70,
    spread: 70,
    origin: {
      y: 0.65,
    },
  });
}, [setupComplete]); 

  if (setupComplete) {
  return (
    <section className="sv-first-show-welcome sv-first-show-welcome-complete">
      <div className="sv-first-show-welcome-complete-icon">
        <CheckCircle2 size={34} />
      </div>

      <div className="sv-first-show-welcome-eyebrow">
        First-show setup complete
      </div>

      <h2>You&apos;re ready to host!</h2>

      <p>
        Your TV Display, audience access, and singer
        queue are ready to go. You&apos;ve completed
        the StageVotes first-show setup.
      </p>

      <div className="sv-first-show-complete-summary">
        <div>
          <CheckCircle2 size={18} />
          TV Display ready
        </div>

        <div>
          <CheckCircle2 size={18} />
          Audience access ready
        </div>

        <div>
          <CheckCircle2 size={18} />
          First singer added
        </div>
      </div>

      <button
        type="button"
        className="sv-first-show-welcome-button sv-first-show-finish-button"
        onClick={onDismiss}
      >
        Finish Setup
      </button>
    </section>
  );
}

  return (
    <section className="sv-first-show-welcome">
      <button
        type="button"
        className="sv-first-show-welcome-close"
        onClick={onDismiss}
        aria-label="Dismiss welcome"
      >
        <X size={18} />
      </button>

      <div className="sv-first-show-welcome-icon">
        <Sparkles size={28} />
      </div>

      <div>
        <div className="sv-first-show-welcome-eyebrow">
          Your first show is live
        </div>

        <h2>Welcome to StageVotes!</h2>

        <p>
          Everything is ready. Here are the three things
          I&apos;d do next to get your karaoke night
          rolling.
        </p>
      </div>

      <div className="sv-first-show-welcome-steps">
        <WelcomeAction
  icon={Monitor}
  number="1"
  title="Open the TV Display"
  description="Put the live queue, QR codes, and show activity on the big screen."
  onClick={onOpenDisplay}
  complete={displayComplete}
/>

<WelcomeAction
  icon={QrCode}
  number="2"
  title="Share your Signup QR"
  description="Let singers scan and join the queue from their phones."
  onClick={onShareSignupQr}
  complete={audienceComplete}
/>

<WelcomeAction
  icon={UserPlus}
  number="3"
  title="Add your first singer"
  description="You can also add someone manually from the Host Dashboard."
  onClick={onAddSinger}
  complete={singerComplete}
/>
      </div>

      <div className="sv-first-show-welcome-footer">
        <div>
          <CheckCircle2 size={18} />
          You can change show settings at any time.
        </div>

        <button
          type="button"
          className="sv-first-show-welcome-button"
          onClick={onDismiss}
        >
          Got It
        </button>
      </div>
    </section>
  );
}

function WelcomeAction({
  icon: Icon,
  number,
  title,
  description,
  onClick,
  complete = false,
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
  onClick?: () => void;
  complete?: boolean;
}) {
  return (
  <button
    type="button"
    className="sv-first-show-welcome-action"
    onClick={onClick}
    disabled={!onClick}
  >
   <div
  className={`sv-first-show-welcome-action-number ${
    complete ? 'is-complete' : ''
  }`}
>
  {complete ? '✓' : number}
</div>

    <div className="sv-first-show-welcome-action-icon">
      <Icon size={21} />
    </div>

    <div>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  </button>
);
}