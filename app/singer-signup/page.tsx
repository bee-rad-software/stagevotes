'use client';

import {
  Suspense,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  LoaderCircle,
  Mic2,
  Sparkles,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default function SingerSignupPage() {
  return (
    <Suspense fallback={<SingerSignupLoading />}>
      <SingerSignupContent />
    </Suspense>
  );
}

function SingerSignupLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#07111f',
        color: '#ffffff',
      }}
    >
      Loading...
    </main>
  );
}

function SingerSignupContent() {
  const searchParams = useSearchParams();

  const eventId = searchParams.get('event');

  const [displayName, setDisplayName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSignup() {
    setMessage('');

    const cleanName = displayName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setMessage('Enter your singer name.');
      return;
    }

    if (!cleanEmail) {
      setMessage('Enter your email address.');
      return;
    }

    if (password.length < 6) {
      setMessage(
        'Your password must be at least 6 characters.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error(
          'We could not create your singer account.'
        );
      }

      const { error: profileError } =
        await supabase
          .from('singer_profiles')
          .upsert(
            {
              user_id: data.user.id,
              display_name: cleanName,
              stage_name: cleanName,
            },
            {
              onConflict: 'user_id',
            }
          );

      if (profileError) {
        throw profileError;
      }

      window.localStorage.setItem(
        'karavote_singer_name',
        cleanName
      );

      if (eventId) {
        window.location.href =
          `/signup/${eventId}`;
      } else {
        window.location.href =
          '/my-stage';
      }
    } catch (error) {
      console.error(
        'Singer signup failed:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create your singer profile.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="sv-singer-auth-page">
      <section className="sv-singer-auth-card">
        <div className="sv-singer-auth-icon">
          <Mic2 size={30} />
        </div>

        <div className="sv-mobile-kicker">
          Free singer profile
        </div>

        <h1>Make StageVotes yours</h1>

        <p className="sv-singer-auth-lead">
          Save your karaoke history, stats,
          achievements, and favorite songs wherever
          you sing.
        </p>

        <div className="sv-singer-auth-benefits">
          <div>
            <Sparkles size={17} />
            Keep your performance history
          </div>

          <div>
            <Sparkles size={17} />
            Build lifetime stats
          </div>

          <div>
            <Sparkles size={17} />
            Earn achievements and badges
          </div>
        </div>

        <div className="sv-singer-auth-fields">
          <label>
            Singer name

            <input
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value
                )
              }
              placeholder="What should we call you?"
              autoComplete="name"
            />
          </label>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Create a password"
              autoComplete="new-password"
            />
          </label>
        </div>

        {message && (
          <p className="sv-mobile-message">
            {message}
          </p>
        )}

        <button
          type="button"
          className="sv-singer-auth-submit"
          onClick={handleSignup}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <LoaderCircle
                size={18}
                className="onboarding-button-spinner"
              />
              Creating profile...
            </>
          ) : (
            <>
              Create My Singer Profile
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <button
          type="button"
          className="sv-singer-auth-signin"
          onClick={() => {
            const suffix = eventId
              ? `?event=${eventId}`
              : '';

            window.location.href =
              `/singer-login${suffix}`;
          }}
        >
          Already have a profile? Sign in
        </button>
      </section>
    </main>
  );
}