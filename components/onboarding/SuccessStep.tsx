'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

type CheckoutDetails = {
  status: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
  accountId: string | null;
  subscriptionId: string | null;
};

type SuccessStepProps = {
  sessionId: string;
  onVerified: (data: {
    accountId: string;
  }) => void;
};

export default function SuccessStep({
  sessionId,
  onVerified,
}: SuccessStepProps) {
  const [details, setDetails] =
    useState<CheckoutDetails | null>(null);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadCheckout() {
      try {
        const response = await fetch(
          `/api/stripe/checkout-session?session_id=${encodeURIComponent(
            sessionId
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'We could not verify your checkout.'
          );
        }

        if (!isCancelled) {
          setDetails(data);

          if (data.accountId) {
            onVerified({
              accountId: data.accountId,
            });
          }
        }
      } catch (error) {
        console.error(
          'Checkout verification failed:',
          error
        );

        if (!isCancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'We could not verify your checkout.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCheckout();

    return () => {
      isCancelled = true;
    };
  }, [sessionId, onVerified]);

  if (isLoading) {
    return (
      <div className="onboarding-step onboarding-complete-step">
        <LoaderCircle
          className="onboarding-spinner"
          size={46}
        />

        <div className="onboarding-eyebrow">
          Verifying checkout
        </div>

        <h1>Finishing your setup</h1>

        <p className="onboarding-lead">
          We&apos;re confirming your trial and preparing
          your StageVotes account.
        </p>
      </div>
    );
  }

  if (message || !details?.accountId) {
    return (
      <div className="onboarding-step">
        <div className="onboarding-eyebrow">
          Checkout verification
        </div>

        <h1>We need one more moment</h1>

        <p className="onboarding-lead">
          {message ||
            'We could not confirm the StageVotes account connected to this checkout.'}
        </p>
      </div>
    );
  }

  return null;
}