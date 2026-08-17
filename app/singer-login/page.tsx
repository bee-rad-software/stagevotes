'use client';

import { useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  LoaderCircle,
  LogIn,
  Mic2,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

export default function SingerLoginPage() {
  return (
    <Suspense fallback={<SingerLoginLoading />}>
      <SingerLoginContent />
    </Suspense>
  );
}

function SingerLoginLoading() {
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

function SingerLoginContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] =
    useState(false);

  async function handleLogin() {
    setMessage('');

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage('Enter your email address.');
      return;
    }

    if (!password) {
      setMessage('Enter your password.');
      return;
    }

    setSubmitting(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        throw error;
      }

      if (eventId) {
        window.location.href =
          `/signup/${eventId}`;
      } else {
        window.location.href =
          '/my-stage';
      }
    } catch (error) {
      console.error(
        'Singer login failed:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to sign in.'
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
          Singer sign in
        </div>

        <h1>Welcome back</h1>

        <p className="sv-singer-auth-lead">
          Sign in to your StageVotes profile and pick
          up right where you left off.
        </p>

        <div
          className="sv-singer-auth-fields"
          style={{ marginTop: 24 }}
        >
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
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
                setPassword(event.target.value)
              }
              placeholder="Your password"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleLogin();
                }
              }}
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
          onClick={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <LoaderCircle
                size={18}
                className="onboarding-button-spinner"
              />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={18} />
              Sign In
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
              `/singer-signup${suffix}`;
          }}
        >
          New to StageVotes? Create a free profile
        </button>
      </section>
    </main>
  );
}