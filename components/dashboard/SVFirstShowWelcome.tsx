'use client';

import {
  CheckCircle2,
  Monitor,
  QrCode,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';

type SVFirstShowWelcomeProps = {
  onDismiss: () => void;
};

export default function SVFirstShowWelcome({
  onDismiss,
}: SVFirstShowWelcomeProps) {
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
        />

        <WelcomeAction
          icon={QrCode}
          number="2"
          title="Share your Signup QR"
          description="Let singers scan and join the queue from their phones."
        />

        <WelcomeAction
          icon={UserPlus}
          number="3"
          title="Add your first singer"
          description="You can also add someone manually from the Host Dashboard."
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
}: {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="sv-first-show-welcome-action">
      <div className="sv-first-show-welcome-action-number">
        {number}
      </div>

      <div className="sv-first-show-welcome-action-icon">
        <Icon size={21} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}