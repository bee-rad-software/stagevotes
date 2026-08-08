// app/onboarding/page.tsx

'use client';

import Image from 'next/image';

import AccountStep from '@/components/onboarding/AccountStep';
import PlanStep from '@/components/onboarding/PlanStep';
import SuccessStep from '@/components/onboarding/SuccessStep';
import VenueStep from '@/components/onboarding/VenueStep';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import { useHostOnboarding } from '@/hooks/useHostOnboarding';
import LaunchFirstShowStep from '@/components/onboarding/LaunchFirstShowStep';

const steps = [
  {
    id: 'welcome',
    label: 'Welcome',
  },
  {
    id: 'account',
    label: 'Account',
  },
  {
    id: 'venue',
    label: 'Venue',
  },
  {
    id: 'plan',
    label: 'Plan',
  },
  {
    id: 'complete',
    label: 'Complete',
  },
];

export default function OnboardingPage() {
  const onboarding = useHostOnboarding();

 const {
  currentStep,
  hostData,
  hasLoadedSavedState,
  checkoutSessionId,
  checkoutVerified,
  completeAccount,
  completeVenue,
  returnToPlan,
  finishOnboarding,
  goForward,
  goBack,
} = onboarding;

  if (!hasLoadedSavedState) {
    return (
      <main className="onboarding-page">
        <section className="onboarding-shell">
          <div className="onboarding-card">
            <div className="onboarding-loading-state">
              Loading your setup...
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-page">
      <div className="onboarding-background-glow onboarding-background-glow-one" />

      <div className="onboarding-background-glow onboarding-background-glow-two" />

      <section className="onboarding-shell">
        <div className="onboarding-brand">
          <Image
            src="/icon-512.png"
            alt="StageVotes"
            width={84}
            height={84}
            priority
            className="onboarding-logo"
          />

          <div>
            <div className="onboarding-brand-name">
              StageVotes
            </div>

            <div className="onboarding-brand-tagline">
              Run unforgettable karaoke nights.
            </div>
          </div>
        </div>

        <div className="onboarding-progress">
          <div className="onboarding-progress-header">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>

            <span>
              {steps[currentStep].label}
            </span>
          </div>

          <div className="onboarding-progress-track">
            <div
              className="onboarding-progress-fill"
              style={{
                width: `${
                  ((currentStep + 1) /
                    steps.length) *
                  100
                }%`,
              }}
            />
          </div>

          <div className="onboarding-progress-labels">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`onboarding-progress-label ${
                  index <= currentStep
                    ? 'is-active'
                    : ''
                }`}
              >
                <span
  className={`onboarding-progress-dot ${
    index < currentStep
      ? 'is-complete'
      : ''
  }`}
>
  {index < currentStep
    ? '✓'
    : index + 1}
</span>

                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-card">
          {currentStep === 0 && <WelcomeStep />}

          {currentStep === 1 && (
            <AccountStep
              onComplete={completeAccount}
            />
          )}

          {currentStep === 2 && hostData && (
            <VenueStep
              accountId={hostData.accountId}
              onComplete={completeVenue}
            />
          )}

          {currentStep === 3 && hostData && (
            <PlanStep
              accountId={hostData.accountId}
              email={hostData.email}
            />
          )}

          {currentStep === 4 &&
  checkoutSessionId &&
  !checkoutVerified && (
    <SuccessStep
      sessionId={checkoutSessionId}
      onVerified={finishOnboarding}
    />
  )}

{currentStep === 4 &&
  checkoutVerified &&
  hostData?.venueId &&
  hostData?.venueName && (
    <LaunchFirstShowStep
      accountId={hostData.accountId}
      venueId={hostData.venueId}
      venueName={hostData.venueName}
    />
  )}

          {currentStep === 4 &&
            !checkoutSessionId && (
              <CheckoutRequired
                onReturnToPlan={returnToPlan}
              />
            )}

           {currentStep === 4 &&
  checkoutVerified &&
  (!hostData?.venueId ||
    !hostData?.venueName) && (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">
        Venue required
      </div>

      <h1>We could not load your venue</h1>

      <p className="onboarding-lead">
        Return to the Venue step and confirm your first
        venue before launching your show.
      </p>

      <button
        type="button"
        className="onboarding-submit-button"
        onClick={() => {
          window.localStorage.removeItem(
            'stagevotes_host_onboarding'
          );

          window.location.href = '/onboarding';
        }}
        style={{
          width: '100%',
          marginTop: 28,
        }}
      >
        Restart Onboarding
      </button>
    </div>
  )} 

          {currentStep === 0 && (
            <div className="onboarding-actions">
              <button
                type="button"
                className="onboarding-button onboarding-button-primary"
                onClick={goForward}
              >
                Start My Free Trial
              </button>
            </div>
          )}

          {currentStep >= 1 && currentStep <= 3 && (
  <div className="onboarding-back-row">
    <button
      type="button"
      className="onboarding-button onboarding-button-secondary"
      onClick={goBack}
    >
      Back
    </button>
  </div>
)}
        </div>

        <p className="onboarding-footer">
          Already have an account?{' '}
          <a href="/login">
            Sign in to StageVotes
          </a>
        </p>
      </section>
    </main>
  );
}

function CheckoutRequired({
  onReturnToPlan,
}: {
  onReturnToPlan: () => void;
}) {
  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">
        Checkout required
      </div>

      <h1>Finish activating your trial</h1>

      <p className="onboarding-lead">
        Return to the Plan step and complete secure
        Stripe checkout to activate your StageVotes
        trial.
      </p>

      <button
        type="button"
        className="onboarding-submit-button"
        onClick={onReturnToPlan}
        style={{
          width: '100%',
          marginTop: 28,
        }}
      >
        Return to Plan
      </button>
    </div>
  );
}