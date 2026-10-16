'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { trialReminderCopy, type TrialReminderInfo } from '@/lib/trialReminder';
import styles from './SVTrialReminder.module.css';

export default function SVTrialReminder() {
  const pathname = usePathname();
  const hostPage = pathname === '/' || /^\/(account|tournament-director|analytics|history)(\/|$)/.test(pathname);
  const [info, setInfo] = useState<TrialReminderInfo | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hostPage) return;
    let disposed = false;
    let running = false;
    async function refresh() {
      if (running) return;
      running = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (!disposed) setInfo(null); return; }
        const response = await fetch('/api/stripe/trial-status', {
          headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store',
        });
        if (!response.ok) { if (!disposed) setInfo(null); return; }
        const data = await response.json();
        if (!disposed) { setInfo(data.reminder); setNow(Date.now()); }
      } catch { if (!disposed) setInfo(null); }
      finally { running = false; }
    }
    const focus = () => { if (document.visibilityState === 'visible') void refresh(); };
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 300_000);
    window.addEventListener('focus', focus);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [hostPage]);

  async function openBilling() {
    if (!info || busy) return;
    setBusy(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again to manage your subscription.');
      const response = await fetch(info.state === 'expired' ? '/api/stripe/checkout' : '/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Unable to open billing. Try Account → Manage Subscription.');
      window.location.assign(data.url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to open billing.');
      setBusy(false);
    }
  }

  const copy = info ? trialReminderCopy(info, now) : null;
  if (!hostPage || !info || !copy) return null;
  const endDate = new Date(info.trialEndsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return <section className={`${styles.card} ${copy.tone === 'urgent' ? styles.urgent : ''}`} aria-label="StageVotes trial reminder">
    <div className={styles.icon}><CalendarClock size={22} /></div>
    <div className={styles.content}>
      <div className={styles.eyebrow}>{info.state === 'expired' ? 'CONTINUE YOUR SHOWS' : `TRIAL ENDS ${endDate.toUpperCase()}`}</div>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
    <button type="button" className={styles.action} onClick={() => void openBilling()} disabled={busy}>
      {busy ? 'Opening billing…' : copy.button}<ArrowRight size={16} />
    </button>
  </section>;
}
