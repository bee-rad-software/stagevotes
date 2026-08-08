'use client';

import { useState } from 'react';
import {
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type PlanStepProps = {
  accountId: string;
  email: string;
};

export default function PlanStep({
  accountId,
  email,
}: PlanStepProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] =
    useState(false);

  async function startCheckout() {
    if (isLoading) return;

    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(
        '/api/stripe/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            accountId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(
          data.error ||
            'We could not start checkout.'
        );
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(
        'StageVotes checkout failed:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'We could not start checkout. Please try again.'
      );

      setIsLoading(false);
    }
  }

  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">
        Choose your plan
      </div>

      <h1>Start your free trial</h1>

      <p className="onboarding-lead">
        Get full access to StageVotes for seven
        days. Cancel anytime.
      </p>

      <div className="onboarding-plan-card">
        <div className="onboarding-plan-badge">
          <Sparkles size={15} />
          StageVotes Host
        </div>

        <div className="onboarding-plan-heading">
          <div>
            <h2>Everything you need to run your show</h2>

            <p>
              Queue management, live voting, venue
              tools, displays, and show history.
            </p>
          </div>

          <div className="onboarding-plan-trial">
            <strong>7 days</strong>
            <span>free</span>
          </div>
        </div>

        <div className="onboarding-plan-features">
          <PlanFeature label="Unlimited singer signups" />
          <PlanFeature label="Live queue management" />
          <PlanFeature label="Judge and audience voting" />
          <PlanFeature label="People's Choice voting" />
          <PlanFeature label="TV display mode" />
          <PlanFeature label="Show history and reporting" />
          <PlanFeature label="Multiple venue support" />
          <PlanFeature label="Cancel anytime" />
        </div>

        <div className="onboarding-plan-assurance">
          <div>
            <ShieldCheck size={19} />
            Secure checkout powered by Stripe
          </div>

          <div>
            <CreditCard size={19} />
            Your trial begins after checkout
          </div>
        </div>
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
        className="onboarding-submit-button"
        onClick={startCheckout}
        disabled={isLoading}
      >
        {isLoading
          ? 'Opening secure checkout...'
          : 'Continue to Secure Checkout'}
      </button>

      <p className="onboarding-plan-note">
        You will review the subscription price before
        confirming your trial.
      </p>
    </div>
  );
}

function PlanFeature({
  label,
}: {
  label: string;
}) {
  return (
    <div className="onboarding-plan-feature">
      <span>
        <Check size={15} strokeWidth={3} />
      </span>

      {label}
    </div>
  );
}