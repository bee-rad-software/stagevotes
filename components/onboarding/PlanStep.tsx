'use client';

import { useState } from 'react';
import {
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { analyticsCheckoutContext, trackFunnel } from '@/lib/funnelAnalytics';
import { desktopPlatform } from '@/lib/desktopDownloadIntent';

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
  const [downloadPlatform] = useState(() =>
    typeof window === 'undefined'
      ? null
      : desktopPlatform(new URLSearchParams(window.location.search).get('download'))
  );

  async function startCheckout() {
    if (isLoading) return;

    setMessage('');
    setIsLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Please sign in again to start your trial.');
      }

      const analytics = await analyticsCheckoutContext();
      const response = await fetch(
        '/api/stripe/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            downloadPlatform,
            analytics,
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

      trackFunnel('begin_checkout', { platform: downloadPlatform || 'web' });
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
        Get full access to StageVotes for 14 days.
        No credit card required.
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
            <strong>14 days</strong>
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
          <PlanFeature label="No credit card required for your trial" />
        </div>

        <div className="onboarding-plan-assurance">
          <div>
            <ShieldCheck size={19} />
            Secure checkout powered by Stripe
          </div>

          <div>
            <CreditCard size={19} />
            No credit card required to start
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
          : 'Start My 14-Day Free Trial'}
      </button>

      <p className="onboarding-plan-note">
        New accounts receive 14 days free. No payment details are needed.
        Add a payment method in Account → Manage Subscription if you want
        to continue afterward; otherwise, your trial expires without a charge.
        Returning subscribers review the paid plan in Stripe.
      </p>
      {downloadPlatform && (
        <p className="onboarding-plan-note">
          After checkout, your {downloadPlatform === 'mac' ? 'Mac' : 'Windows'} download will start automatically.
        </p>
      )}
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
