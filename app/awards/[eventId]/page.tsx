'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { awardsPath } from '@/lib/awardsRoute';

export default function AwardsRedirect() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setMessage('');
    const timer = setTimeout(() => {
      if (active) setMessage('Unable to load awards. Check your connection and try again.');
      controller.abort();
    }, 12000);
    void (async () => {
      try {
        const { data, error } = await supabase.from('events')
          .select('competition_mode,is_show_ended').eq('id', params.eventId)
          .abortSignal(controller.signal).maybeSingle();
        if (!active || controller.signal.aborted) return;
        if (error) throw error;
        if (!data) { setMessage('This show could not be found.'); return; }
        if (!data.is_show_ended) {
          setMessage('End the show to finalize results before opening awards.');
          return;
        }
        router.replace(awardsPath(params.eventId, data.competition_mode));
      } catch {
        if (active && !controller.signal.aborted) setMessage('Unable to load awards. Please try again.');
      } finally { clearTimeout(timer); }
    })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [params.eventId, router, attempt]);
  return <main className="container"><section className="card" role="status">
    <h1>{message ? 'Awards' : 'Opening awards…'}</h1>
    <p>{message || 'Loading this show’s results.'}</p>
    {message && <><button className="btn" onClick={() => setAttempt(value => value + 1)}>Try again</button>
      <p><a href={`/host/${encodeURIComponent(params.eventId)}`}>Back to host dashboard</a></p></>}
  </section></main>;
}
