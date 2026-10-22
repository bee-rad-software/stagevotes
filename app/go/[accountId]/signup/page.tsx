'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { chooseSignupEvent } from '@/lib/chooseSignupEvent';

export default function StaticSignupRedirect() {
  const params = useParams();
  const router = useRouter();
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const [status, setStatus] = useState<'loading' | 'empty' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setStatus('loading');
    const timeout = setTimeout(() => {
      if (active) setStatus('error');
      controller.abort();
    }, 12000);

    async function resolve() {
      try {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)) {
          throw new Error('Invalid signup link.');
        }
        const [venueResult, eventResult] = await Promise.all([
          supabase.from('venues').select('current_event_id')
            .eq('account_id', accountId).not('current_event_id', 'is', null)
            .abortSignal(controller.signal),
          supabase.from('events').select('id,created_at,is_archived,is_show_ended')
            .eq('account_id', accountId)
            .not('is_archived', 'is', true).not('is_show_ended', 'is', true)
            .order('created_at', { ascending: false }).abortSignal(controller.signal),
        ]);
        if (eventResult.error) throw eventResult.error;
        // A missing venue pointer can fall back to the account's latest active show.
        const event = chooseSignupEvent(eventResult.data || [], (venueResult.data || []).map(v => v.current_event_id));
        if (!active || controller.signal.aborted) return;
        if (!event) { setStatus('empty'); return; }
        router.replace(`/signup/${event.id}`);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          console.error('Unable to open singer signup:', error);
          setStatus('error');
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    void resolve();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [accountId, router, attempt]);

  return (
    <main className="container">
      <div className="card" role="status">
        <h1>{status === 'loading' ? 'Opening singer signup…' : status === 'empty' ? 'No active show right now' : 'Unable to load signup'}</h1>
        <p>{status === 'loading' ? 'Finding this venue’s current show.' : status === 'empty'
          ? 'There isn’t an active show available through this link. Check with your host, or try again when the show opens.'
          : 'Please check your connection and try again. If this continues, ask your host for the show’s direct signup link.'}</p>
        {status !== 'loading' && <button type="button" className="btn" onClick={() => setAttempt(value => value + 1)}>Try again</button>}
      </div>
    </main>
  );
}
