'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

const ONBOARDING_STORAGE_KEY =
  'stagevotes_host_onboarding';

const TOTAL_ONBOARDING_STEPS = 5;

export type HostOnboardingData = {
  userId: string;
  accountId: string;
  email: string;
  accountName: string;
  venueId?: string;
  venueName?: string;
  city?: string;
  state?: string;
  timezone?: string;
};

type SavedOnboardingState = {
  currentStep: number;
  hostData: HostOnboardingData | null;
};

type VenueOnboardingData = {
  venueId: string;
  venueName: string;
  city: string;
  state: string;
  timezone: string;
};

export function useHostOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);

  const [hostData, setHostData] =
    useState<HostOnboardingData | null>(null);

  const [hasLoadedSavedState, setHasLoadedSavedState] =
    useState(false);

  const [checkoutSessionId, setCheckoutSessionId] =
    useState<string | null>(null);

const [checkoutVerified, setCheckoutVerified] =
  useState(false);

  const [onboardingFinished, setOnboardingFinished] =
    useState(false);

  // Restore saved onboarding progress.
  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(
        ONBOARDING_STORAGE_KEY
      );

      if (!savedValue) {
        return;
      }

      const savedState = JSON.parse(
        savedValue
      ) as SavedOnboardingState;

      if (
        typeof savedState.currentStep === 'number' &&
        savedState.currentStep >= 0 &&
        savedState.currentStep <
          TOTAL_ONBOARDING_STEPS
      ) {
        setCurrentStep(savedState.currentStep);
      }

      if (savedState.hostData) {
        setHostData(savedState.hostData);
      }
    } catch (error) {
      console.error(
        'Could not restore StageVotes onboarding:',
        error
      );

      window.localStorage.removeItem(
        ONBOARDING_STORAGE_KEY
      );
    } finally {
      setHasLoadedSavedState(true);
    }
  }, []);

  // Detect a successful return from Stripe.
  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search
    );

    const checkoutStatus =
      searchParams.get('checkout');

    const sessionId =
      searchParams.get('session_id');

    if (
      checkoutStatus === 'success' &&
      sessionId
    ) {
      setCheckoutSessionId(sessionId);
      setCurrentStep(4);
    }
  }, []);

  // Save progress after the initial restore finishes.
  useEffect(() => {
    if (
      !hasLoadedSavedState ||
      onboardingFinished
    ) {
      return;
    }

    const savedState: SavedOnboardingState = {
      currentStep,
      hostData,
    };

    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify(savedState)
    );
  }, [
    currentStep,
    hostData,
    hasLoadedSavedState,
    onboardingFinished,
  ]);

  const goForward = useCallback(() => {
    setCurrentStep((step) =>
      Math.min(
        step + 1,
        TOTAL_ONBOARDING_STEPS - 1
      )
    );
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep((step) =>
      Math.max(step - 1, 0)
    );
  }, []);

  const completeAccount = useCallback(
    (data: HostOnboardingData) => {
      setHostData(data);
      setCurrentStep(2);
    },
    []
  );

  const completeVenue = useCallback(
    (venueData: VenueOnboardingData) => {
      setHostData((current) =>
        current
          ? {
              ...current,
              ...venueData,
            }
          : current
      );

      setCurrentStep(3);
    },
    []
  );

  const returnToPlan = useCallback(() => {
    setCheckoutSessionId(null);
    setCurrentStep(3);
  }, []);

const finishOnboarding = useCallback(
  (data: { accountId: string }) => {
    setCheckoutVerified(true);

    setHostData((current) =>
      current
        ? {
            ...current,
            accountId: data.accountId,
          }
        : current
    );
  },
  []
);

 return {
  currentStep,
  hostData,
  hasLoadedSavedState,
  checkoutSessionId,
  checkoutVerified,
  isFirstStep: currentStep === 0,
  isLastStep:
    currentStep === TOTAL_ONBOARDING_STEPS - 1,
  goForward,
  goBack,
  completeAccount,
  completeVenue,
  returnToPlan,
  finishOnboarding,
};
}