'use client';

import { FormEvent, useState } from 'react';
import {
  Building2,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type VenueStepProps = {
  accountId: string;
  onComplete: (data: {
    venueId: string;
    venueName: string;
    city: string;
    state: string;
    timezone: string;
  }) => void;
};

export default function VenueStep({
  accountId,
  onComplete,
}: VenueStepProps) {
  const [venueName, setVenueName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [timezone, setTimezone] = useState(() => {
  if (typeof Intl === 'undefined') {
    return 'America/Chicago';
  }

  const detectedTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supportedTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
  ];

  return supportedTimezones.includes(detectedTimezone)
    ? detectedTimezone
    : 'America/Chicago';
});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

function clearMessage() {
  if (message) {
    setMessage('');
  }
}

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) return;

    setMessage('');

    const cleanVenueName = venueName.trim();
    const venueSlug = `${createSlug(cleanVenueName)}-${crypto
  .randomUUID()
  .slice(0, 8)}`;
    const cleanCity = city.trim();
    const cleanState = state.trim().toUpperCase();

    if (!cleanVenueName) {
  setMessage('Please enter your venue name.');
  return;
}

if (!cleanCity) {
  setMessage('Please enter the venue city.');
  return;
}

if (!cleanState) {
  setMessage('Please enter the venue state.');
  return;
}

if (cleanState.length !== 2) {
  setMessage(
    'Please enter the two-letter state abbreviation.'
  );
  return;
}

const cleanPostalCode = postalCode.trim();

if (
  cleanPostalCode &&
  !/^\d{5}(-\d{4})?$/.test(cleanPostalCode)
) {
  setMessage(
    'Please enter a valid ZIP code, such as 72756.'
  );
  return;
}

    if (!accountId) {
      setMessage(
        'Your StageVotes account could not be found. Please return to the account step.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: venue,
        error,
      } = await supabase
        .from('venues')
       .insert({
  account_id: accountId,
  name: cleanVenueName,
  slug: venueSlug,
  street_address: addressLine1.trim() || null,
  city: cleanCity,
  state: cleanState,
  postal_code: cleanPostalCode || null,
  timezone,
})
        .select('id, name, city, state, timezone')
        .single();

      if (error) {
        throw error;
      }

      if (!venue) {
        throw new Error(
          'The venue was not created. Please try again.'
        );
      }

      onComplete({
        venueId: venue.id,
        venueName: venue.name,
        city: venue.city ?? cleanCity,
        state: venue.state ?? cleanState,
        timezone: venue.timezone ?? timezone,
      });
   } catch (error) {
  console.error(
    'StageVotes venue creation failed:',
    error
  );

  const supabaseError =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? error
      : null;

  if (
    supabaseError &&
    supabaseError.code === '23505'
  ) {
    setMessage(
      'This venue already exists on your StageVotes account.'
    );
  } else {
    setMessage(
      error instanceof Error
        ? error.message
        : 'We could not create your venue. Please try again.'
    );
  }

  setIsLoading(false);
}
  }

  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">
        Venue setup
      </div>

      <h1>Add your first venue</h1>

      <p className="onboarding-lead">
        Set up the first location where you&apos;ll use
        StageVotes. You can add more venues later.
      </p>

      <form
        className="onboarding-form"
        onSubmit={handleSubmit}
      >
        <div className="onboarding-field">
          <label htmlFor="onboarding-venue-name">
            Venue name
          </label>

          <div className="onboarding-input-wrap">
            <Building2 size={19} />

            <input
              id="onboarding-venue-name"
              autoFocus
              type="text"
              value={venueName}
              onChange={(event) => {
  setVenueName(event.target.value);
  clearMessage();
}}
              placeholder="Enter your venue name"
              autoComplete="organization"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="onboarding-field">
          <label htmlFor="onboarding-address">
            Street address
          </label>

          <div className="onboarding-input-wrap">
            <MapPin size={19} />

            <input
              id="onboarding-address"
              type="text"
              value={addressLine1}
              onChange={(event) =>{
                setAddressLine1(event.target.value);
                clearMessage();
              }}
              placeholder="Optional"
              autoComplete="street-address"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="onboarding-form-grid">
          <div className="onboarding-field">
            <label htmlFor="onboarding-city">
              City
            </label>

            <div className="onboarding-input-wrap">
              <Navigation size={19} />

              <input
                id="onboarding-city"
                type="text"
                value={city}
                onChange={(event) => {
  setCity(event.target.value);
  clearMessage();
}}
                placeholder="City"
                autoComplete="address-level2"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="onboarding-field">
            <label htmlFor="onboarding-state">
              State
            </label>

            <div className="onboarding-input-wrap">
              <input
                id="onboarding-state"
                type="text"
                value={state}
                onChange={(event) =>{ 
                  setState(event.target.value);
                  clearMessage();
                }}
                placeholder="State"
                autoComplete="address-level1"
                maxLength={2}
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="onboarding-form-grid">
          <div className="onboarding-field">
            <label htmlFor="onboarding-postal-code">
              ZIP code
            </label>

            <div className="onboarding-input-wrap">
              <input
                id="onboarding-postal-code"
                type="text"
                value={postalCode}
                onChange={(event) =>{
                  setPostalCode(event.target.value);
                  clearMessage();
                }}
                placeholder="ZIP code"
                autoComplete="postal-code"
                inputMode="numeric"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="onboarding-field">
            <label htmlFor="onboarding-timezone">
              Time zone
            </label>

            <div className="onboarding-input-wrap">
              <Clock3 size={19} />

              <select
                id="onboarding-timezone"
                value={timezone}
                onChange={(event) =>{
                  setTimezone(event.target.value);
                  clearMessage();
                }}
                disabled={isLoading}
              >
                <option value="America/New_York">
                  Eastern Time
                </option>

                <option value="America/Chicago">
                  Central Time
                </option>

                <option value="America/Denver">
                  Mountain Time
                </option>

                <option value="America/Los_Angeles">
                  Pacific Time
                </option>

                <option value="America/Phoenix">
                  Arizona Time
                </option>

                <option value="America/Anchorage">
                  Alaska Time
                </option>

                <option value="Pacific/Honolulu">
                  Hawaii Time
                </option>
              </select>
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
          type="submit"
          className="onboarding-submit-button"
          disabled={isLoading}
        >
          {isLoading ? (
  <>
    <LoaderCircle
      size={18}
      className="onboarding-button-spinner"
    />
    Creating your venue...
  </>
) : (
  'Save Venue and Continue'
)}
        </button>
      </form>
    </div>
  );
}