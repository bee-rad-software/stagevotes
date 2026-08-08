'use client';

import { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Heart,
  LoaderCircle,
  MapPin,
  Mic2,
  QrCode,
  Rocket,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { createStageVotesEvent } from '@/lib/events/createStageVotesEvent';

type LaunchFirstShowStepProps = {
  accountId: string;
  venueId: string;
  venueName: string;
};

function suggestedShowName() {
  const dayName = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(new Date());

  const weekendDays = ['Friday', 'Saturday'];

  return weekendDays.includes(dayName)
    ? `${dayName} Night Karaoke`
    : `${dayName} Karaoke`;
}

function wait(milliseconds: number) {
  return new Promise((resolve) =>
    window.setTimeout(resolve, milliseconds)
  );
}

export default function LaunchFirstShowStep({
  accountId,
  venueId,
  venueName,
}: LaunchFirstShowStepProps) {
  const router = useRouter();

  const initialShowName = useMemo(
    () => suggestedShowName(),
    []
  );

  const [showName, setShowName] =
    useState(initialShowName);

  const [judgingEnabled, setJudgingEnabled] =
    useState(true);

  const [peoplesChoiceEnabled, setPeoplesChoiceEnabled] =
    useState(true);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] =
    useState(false);

  const [launchStage, setLaunchStage] = useState(0);

  async function launchShow() {
    if (isLoading) return;

    setMessage('');

    if (!showName.trim()) {
      setMessage('Please enter a show name.');
      return;
    }

    setIsLoading(true);
setLaunchStage(1);

try {
  const result = await createStageVotesEvent({
        accountId,
        venueId,
        venueName,
        name: showName,
        judgingEnabled,
        categories: judgingEnabled
          ? ['Overall Performance']
          : [],
        tiebreakerCategory: judgingEnabled
          ? 'Overall Performance'
          : undefined,
        showSignupQR: true,
        showVotingQR: judgingEnabled,
        showPeoplesChoiceQR: peoplesChoiceEnabled,
      });

      setLaunchStage(2);
await wait(350);

setLaunchStage(3);
await wait(350);

setLaunchStage(4);
await wait(500);

window.localStorage.removeItem(
  'stagevotes_host_onboarding'
);

router.push(`/host/${result.eventId}`);
    } catch (error) {
      console.error(
        'First show creation failed:',
        error
      );

      setMessage(
  error instanceof Error
    ? error.message
    : 'We could not create your first show.'
);

setLaunchStage(0);
setIsLoading(false);
    }
  }

if (launchStage > 0) {
  return (
    <div className="onboarding-step onboarding-launching-step">
      <div className="onboarding-launching-icon">
        <Rocket size={38} />
      </div>

      <div className="onboarding-eyebrow">
        Preparing StageVotes
      </div>

      <h1>Launching your first show</h1>

      <p className="onboarding-lead">
        We&apos;re getting everything ready for your
        karaoke night.
      </p>

      <div className="onboarding-launch-progress">
        <LaunchProgressItem
          label="Creating your event"
          complete={launchStage > 1}
          active={launchStage === 1}
        />

        <LaunchProgressItem
          label="Setting up voting"
          complete={launchStage > 2}
          active={launchStage === 2}
        />

        <LaunchProgressItem
          label="Preparing QR codes"
          complete={launchStage > 3}
          active={launchStage === 3}
        />

        <LaunchProgressItem
          label="Opening Host Dashboard"
          complete={false}
          active={launchStage === 4}
        />
      </div>

      <div className="onboarding-launch-progress-track">
        <div
          className="onboarding-launch-progress-fill"
          style={{
            width: `${launchStage * 25}%`,
          }}
        />
      </div>
    </div>
  );
}

  return (
    <div className="onboarding-step">
      <div className="onboarding-first-show-hero">
        <div className="onboarding-first-show-icon">
          <Rocket size={30} />
        </div>

        <div>
          <div className="onboarding-eyebrow">
            Final step
          </div>

          <h1>Launch your first show</h1>

          <p className="onboarding-lead">
            Everything is ready.

Launch your first karaoke show in under 30 seconds.
          </p>
        </div>
      </div>

      <div className="onboarding-first-show-layout">
        <section className="onboarding-first-show-card">
          <div className="onboarding-field">
            <label htmlFor="first-show-name">
              Show name
            </label>

            <div className="onboarding-input-wrap">
              <Mic2 size={19} />

              <input
                id="first-show-name"
                type="text"
                value={showName}
                onChange={(event) => {
                  setShowName(event.target.value);

                  if (message) {
                    setMessage('');
                  }
                }}
                autoFocus
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="onboarding-first-show-venue">
            <CheckCircle2 size={20} />

            <div>
              <span>Venue Ready</span>
              <strong>{venueName}</strong>
            </div>

            <CheckCircle2 size={20} />
          </div>

          <div className="onboarding-first-show-options">
            <ShowOption
              icon={Award}
              title="Judge scoring"
              description="Use Overall Performance as the first scoring category."
              checked={judgingEnabled}
              onChange={setJudgingEnabled}
            />

            <ShowOption
              icon={Heart}
              title="People’s Choice"
              description="Let the audience vote for their favorite singer."
              checked={peoplesChoiceEnabled}
              onChange={setPeoplesChoiceEnabled}
            />
          </div>

          {message && (
            <div
              className="onboarding-message onboarding-message-error"
              role="alert"
            >
              {message}
            </div>
          )}

          <button
  type="button"
  className="onboarding-submit-button onboarding-first-show-submit"
  onClick={launchShow}
  disabled={isLoading}
>
            {isLoading ? (
              <>
                <LoaderCircle
                  size={18}
                  className="onboarding-button-spinner"
                />
                Creating your show...
              </>
            ) : (
              <>
                <Rocket size={18} />
                Launch My First Show
              </>
            )}
          </button>

        <p className="onboarding-first-show-help">
  You can change your show name, voting settings,
  QR codes, and everything else later.
</p>

        </section>

        <aside className="onboarding-first-show-preview">
          <div className="onboarding-first-show-preview-badge">
            SHOW READY
          </div>

          <h2>{showName || 'Your First Show'}</h2>

          <div className="onboarding-first-show-status">
  <span className="onboarding-live-dot" />

  <span>Ready to launch</span>
</div>

<div className="onboarding-first-show-preview-venue">
  <MapPin size={15} />
  {venueName}
</div>

          <PreviewRow
            icon={Mic2}
            label="Singer signup"
            value="Enabled"
          />

          <PreviewRow
            icon={Award}
            label="Judge scoring"
            value={
              judgingEnabled
                ? 'Overall Performance'
                : 'Off'
            }
          />

          <PreviewRow
            icon={Heart}
            label="People’s Choice"
            value={
              peoplesChoiceEnabled
                ? 'Enabled'
                : 'Off'
            }
          />

          <PreviewRow
            icon={QrCode}
            label="QR codes"
            value="Created automatically"
          />

          <p>
            You can customize categories, QR settings,
            and display options after the show opens.
          </p>
        </aside>
      </div>
    </div>
  );
}

type ShowOptionProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ShowOption({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: ShowOptionProps) {
  return (
    <button
      type="button"
      className={`onboarding-first-show-option ${
        checked ? 'is-selected' : ''
      }`}
      onClick={() => onChange(!checked)}
    >
      <span className="onboarding-first-show-option-icon">
        <Icon size={20} />
      </span>

      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <span className="onboarding-first-show-switch">
        <span />
      </span>
    </button>
);
}

function LaunchProgressItem({
  label,
  complete,
  active,
}: {
  label: string;
  complete: boolean;
  active: boolean;
}) {
  return (
    <div
      className={`onboarding-launch-progress-item ${
        complete ? 'is-complete' : ''
      } ${active ? 'is-active' : ''}`}
    >
      <span>
        {complete ? (
          <CheckCircle2 size={19} />
        ) : active ? (
          <LoaderCircle
            size={19}
            className="onboarding-button-spinner"
          />
        ) : (
          <span className="onboarding-launch-empty-dot" />
        )}
      </span>

      <strong>{label}</strong>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="onboarding-first-show-preview-row">
      <Icon size={17} />

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}