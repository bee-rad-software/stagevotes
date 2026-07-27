'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [showPassword, setShowPassword] =
    useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'error' | 'success'
  >('success');
  const [isLoading, setIsLoading] =
    useState(false);

  async function handleUpdatePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) return;

    setMessage('');

    if (password.length < 6) {
      setMessageType('error');
      setMessage(
        'Your password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessageType('error');
      setMessage(
        'Passwords do not match.'
      );
      return;
    }

    setIsLoading(true);

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      setMessageType('error');
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setMessageType('success');
    setMessage(
      'Password updated successfully! You can now log in.'
    );

    setIsLoading(false);
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
      <section
        style={{
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
            '0 28px 80px rgba(0,0,0,.55),0 0 42px rgba(56,189,248,.08)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Image
            src="/stagevotes-logo.png"
            alt="StageVotes"
            width={230}
            height={150}
            priority
            style={{
              width: 'min(230px,75vw)',
              height: 'auto',
            }}
          />

          <h1
            style={{
              marginTop: 18,
              fontSize:
                'clamp(28px,7vw,38px)',
              fontWeight: 950,
            }}
          >
            Choose a new password
          </h1>

          <p
            style={{
              color: '#94a3b8',
              lineHeight: 1.6,
              marginTop: 10,
            }}
          >
            Create a secure password for your
            StageVotes account.
          </p>
        </div>

        <form
          onSubmit={handleUpdatePassword}
          style={{
            display: 'grid',
            gap: 18,
            marginTop: 28,
          }}
        >
          <div>
            <label style={labelStyle}>
              New Password
            </label>

            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>
              Confirm Password
            </label>

            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              style={inputStyle}
              required
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            style={{
              background: 'transparent',
              color: '#7dd3fc',
              border: 0,
              cursor: 'pointer',
              justifySelf: 'start',
              padding: 0,
              fontWeight: 800,
            }}
          >
            {showPassword
              ? 'Hide Passwords'
              : 'Show Passwords'}
          </button>

          {message && (
            <div
              style={{
                padding: 14,
                borderRadius: 14,
                color:
                  messageType === 'error'
                    ? '#fecaca'
                    : '#bbf7d0',
                background:
                  messageType === 'error'
                    ? 'rgba(239,68,68,.12)'
                    : 'rgba(34,197,94,.12)',
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={primaryButtonStyle}
          >
            {isLoading
              ? 'Updating...'
              : 'Update Password'}
          </button>
        </form>

        <div
          style={{
            marginTop: 26,
            textAlign: 'center',
          }}
        >
          <Link
            href="/login"
            style={{
              color: '#7dd3fc',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            Back to Log In
          </Link>
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
  border:
    '1px solid rgba(148,163,184,.22)',
  color: 'white',
  background: 'rgba(2,6,23,.58)',
  fontSize: 16,
} as const;

const primaryButtonStyle = {
  minHeight: 52,
  border: 0,
  borderRadius: 15,
  color: 'white',
  background:
    'linear-gradient(135deg,#f97316,#fb923c)',
  fontSize: 16,
  fontWeight: 950,
  cursor: 'pointer',
} as const;