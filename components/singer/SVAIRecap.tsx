'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SVAIRecap({ eventId, kind, audience = 'singer', revision = '' }: {
  eventId: string; kind: 'show' | 'judge'; audience?: 'host' | 'singer'; revision?: string;
}) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    setAnswer(''); setError(''); setBusy(false);
    return () => { requestRef.current?.abort(); requestRef.current = null; };
  }, [eventId, kind, audience, revision]);
  async function generate() {
    if (requestRef.current) return;
    const controller = new AbortController(); requestRef.current = controller;
    setBusy(true); setError('');
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in to generate your recap.');
      if (controller.signal.aborted) return;
      const response = await fetch('/api/recaps', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, kind, audience }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.answer !== 'string') throw new Error(payload.error || 'Recap unavailable.');
      if (requestRef.current === controller) setAnswer(payload.answer);
    } catch (e) {
      if (requestRef.current === controller) setError(controller.signal.aborted ? 'Recap took too long. Please try again.'
        : e instanceof Error ? e.message : 'Recap unavailable.');
    } finally {
      clearTimeout(timer);
      if (requestRef.current === controller) { requestRef.current = null; setBusy(false); }
    }
  }
  return <details style={{ margin: '16px 0', padding: 16, border: '1px solid #334155', borderRadius: 14, background: '#0f172a' }}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, color: '#7dd3fc' }}>
      ✨ {kind === 'judge' ? 'AI judge feedback recap' : 'AI show recap'}
    </summary>
    <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{kind === 'judge'
      ? 'Turn written judge feedback into strengths and practical ideas. The original notes remain the source of truth.'
      : 'Create a short recap from the recorded songs and participation.'}</p>
    <button type="button" className="sv-secondary-button" disabled={busy} onClick={generate}>
      {busy ? 'Writing recap…' : answer ? 'Refresh recap' : 'Generate recap'}
    </button>
    {error && <p role="alert">{error}</p>}
    {answer && <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.65, marginTop: 14 }}>{answer}</div>}
    {answer && <p style={{ color: '#94a3b8', fontSize: 12 }}>AI summary of recorded information. Review alongside the original records.</p>}
  </details>;
}
