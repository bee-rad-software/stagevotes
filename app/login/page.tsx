'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] =
    useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) return;

    setMessage('');

    if (!email.trim() || !password) {
      setMessage(
        'Enter your email address and password.'
      );
      return;
    }

    setIsLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 18px',
        color: 'white',
        background:
          'radial-gradient(circle at 15% 12%,rgba(56,189,248,.16),transparent 30%), radial-gradient(circle at 85% 85%,rgba(249,115,22,.14),transparent 32%), linear-gradient(145deg,#020617 0%,#0f172a 48%,#111827 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(120deg,transparent 20%,rgba(255,255,255,.025) 48%,transparent 75%)',
        }}
      />

      <section
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          overflow: 'hidden',
          borderRadius: 28,
          padding: '30px 28px 28px',
          background:
            'linear-gradient(160deg,rgba(15,23,42,.96),rgba(15,23,42,.82))',
          border:
            '1px solid rgba(148,163,184,.18)',
          boxShadow:
            '0 28px 80px rgba(0,0,0,.55), 0 0 42px rgba(56,189,248,.08)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background:
              'radial-gradient(circle,rgba(56,189,248,.13),transparent 70%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Image
              src="/stagevotes-logo.png"
              alt="StageVotes"
              width={270}
              height={150}
              priority
              style={{
                width: 'min(230px,75vw)',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>

          <div
            style={{
              marginTop: 2,
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(28px,7vw,38px)',
                lineHeight: 1.08,
                fontWeight: 950,
                letterSpacing: '-.035em',
              }}
            >
              Welcome back
            </h1>

            <p
              style={{
                margin: '10px auto 0',
                maxWidth: 340,
                color: '#94a3b8',
                fontSize: 15,
                lineHeight: 1.55,
              }}
            >
              Log in to manage your shows, track
              your journey, and own the stage.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            style={{
              display: 'grid',
              gap: 18,
              marginTop: 28,
            }}
          >
            <div>
              <label
                htmlFor="email"
                style={labelStyle}
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                inputMode="email"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <label
                  htmlFor="password"
                  style={labelStyle}
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  style={{
                    color: '#7dd3fc',
                    fontSize: 13,
                    fontWeight: 800,
                    textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              <div
                style={{
                  position: 'relative',
                }}
              >
                <input
                  id="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={{
                    ...inputStyle,
                    paddingRight: 82,
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 10,
                    transform: 'translateY(-50%)',
                    minHeight: 36,
                    padding: '0 10px',
                    border: 0,
                    borderRadius: 10,
                    color: '#cbd5e1',
                    background: 'transparent',
                    fontSize: 12,
                    fontWeight: 850,
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {message && (
              <div
                role="alert"
                style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  color: '#fecaca',
                  background:
                    'rgba(239,68,68,.11)',
                  border:
                    '1px solid rgba(248,113,113,.24)',
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                minHeight: 56,
                marginTop: 2,
                border: 0,
                borderRadius: 15,
                color: 'white',
                background: isLoading
                  ? 'rgba(249,115,22,.55)'
                  : 'linear-gradient(135deg,#f97316,#fb923c)',
                boxShadow: isLoading
                  ? 'none'
                  : '0 14px 30px rgba(249,115,22,.24)',
                fontSize: 16,
                fontWeight: 950,
                cursor: isLoading
                  ? 'not-allowed'
                  : 'pointer',
                transition:
                  'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
              }}
            >
              {isLoading
                ? 'Logging in...'
                : 'Log In'}
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '26px 0 22px',
            }}
          >
            <div style={dividerStyle} />

            <span
              style={{
                color: '#64748b',
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '.12em',
                whiteSpace: 'nowrap',
              }}
            >
              NEW TO STAGEVOTES?
            </span>

            <div style={dividerStyle} />
          </div>

          <Link
            href="/signup"
            style={{
              minHeight: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 15,
              color: '#7dd3fc',
              background:
                'rgba(56,189,248,.08)',
              border:
                '1px solid rgba(56,189,248,.28)',
              fontSize: 15,
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Create an Account
          </Link>

          <p
            style={{
              margin: '22px 0 0',
              color: '#64748b',
              fontSize: 12,
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            Karaoke nights made easier for hosts,
            singers, judges, and fans.
          </p>
        </div>
      </section>
    </main>
  );
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  color: '#cbd5e1',
  fontSize: 13,
  fontWeight: 850,
} as const;

const inputStyle = {
  width: '100%',
  minHeight: 50,
  boxSizing: 'border-box',
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,.22)',
  outline: 'none',
  color: 'white',
  background: 'rgba(2,6,23,.58)',
  fontSize: 16,
  fontFamily: 'inherit',
} as const;

const dividerStyle = {
  flex: 1,
  height: 1,
  background:
    'linear-gradient(90deg,transparent,rgba(148,163,184,.22),transparent)',
} as const;