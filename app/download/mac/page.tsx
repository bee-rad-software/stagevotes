'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type DownloadState =
  | 'checking'
  | 'signed-out'
  | 'subscription-required'
  | 'downloading'
  | 'error';

export default function MacDownloadPage() {
  const [state, setState] =
    useState<DownloadState>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    startDownload();
  }, []);

  async function startDownload() {
    setState('checking');
    setMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setState('signed-out');
      return;
    }

    setState('downloading');

    try {
      const response = await fetch(
        '/api/download?platform=mac',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        setState('signed-out');
        return;
      }

      if (response.status === 403) {
        setMessage(
          result.error ||
            'An active StageVotes subscription is required.'
        );
        setState('subscription-required');
        return;
      }

      if (!response.ok || !result.url) {
        throw new Error(
          result.error ||
            'Unable to prepare the download.'
        );
      }

      window.location.assign(result.url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to prepare the download.'
      );
      setState('error');
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f7f7f7',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          boxShadow:
            '0 18px 50px rgba(0, 0, 0, 0.12)',
        }}
      >
        <h1
          style={{
            color: '#f97316',
            fontSize: '36px',
            marginBottom: '12px',
          }}
        >
          StageVotes for Mac
        </h1>

        {state === 'checking' && (
          <p>Checking your StageVotes account…</p>
        )}

        {state === 'downloading' && (
          <>
            <p>Your download is starting…</p>
            <p
              style={{
                color: '#666666',
                fontSize: '14px',
              }}
            >
              Keep this page open until the download begins.
            </p>
          </>
        )}

        {state === 'signed-out' && (
          <>
            <p>
              Sign in to verify your StageVotes
              subscription and download the Mac app.
            </p>
            <a
              href="/login?next=/download/mac"
              style={primaryButtonStyle}
            >
              Sign In
            </a>
            <a
              href="/pricing"
              style={secondaryButtonStyle}
            >
              View Plans
            </a>
          </>
        )}

        {state === 'subscription-required' && (
          <>
            <p>{message}</p>
            <a
              href="/pricing"
              style={primaryButtonStyle}
            >
              Start Subscription
            </a>
            <a
              href="/account"
              style={secondaryButtonStyle}
            >
              View Account
            </a>
          </>
        )}

        {state === 'error' && (
          <>
            <p>{message}</p>
            <button
              type="button"
              onClick={startDownload}
              style={{
                ...primaryButtonStyle,
                border: 0,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </>
        )}
      </section>
    </main>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  margin: '18px 8px 0',
  padding: '12px 22px',
  borderRadius: '999px',
  background: '#f97316',
  color: '#ffffff',
  fontWeight: 700,
  textDecoration: 'none',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: '#111111',
};