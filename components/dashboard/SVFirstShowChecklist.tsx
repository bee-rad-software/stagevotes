'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, ExternalLink, MapPin, Monitor, Music2, Smartphone, Sparkles, Trophy } from 'lucide-react';
import styles from './SVFirstShowChecklist.module.css';
import { supabase } from '@/lib/supabase';

type Progress = { karaokeTest: boolean; skipKaraFun: boolean; signupTest: boolean; displayTest: boolean; collapsed: boolean };
const initial: Progress = { karaokeTest: false, skipKaraFun: false, signupTest: false, displayTest: false, collapsed: false };

export default function SVFirstShowChecklist({ accountId, venueCount }: { accountId: string; venueCount: number }) {
  const checklistId = useId();
  const [progress, setProgress] = useState<Progress>(initial);
  const [ready, setReady] = useState(false);
  const [hasShow, setHasShow] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [hasChannel, setHasChannel] = useState(false);
  const [error, setError] = useState('');
  const accountRef = useRef(accountId);

  useEffect(() => {
    accountRef.current = accountId;
    let active = true;
    setReady(false); setHasShow(false); setActiveEventId(null); setHasChannel(false); setError('');
    let saved = initial;
    let hasSavedProgress = false;
    try {
      const raw = JSON.parse(localStorage.getItem('stagevotes_first_show_' + accountId) || 'null');
      if (raw && typeof raw === 'object') { hasSavedProgress = true; saved = {
        karaokeTest: raw.karaokeTest === true, skipKaraFun: raw.skipKaraFun === true,
        signupTest: raw.signupTest === true, displayTest: raw.displayTest === true, collapsed: raw.collapsed === true,
      }; }
    } catch { /* Checklist remains usable without local storage. */ }
    setProgress(saved);
    async function load() {
      try {
        const [account, latest, current] = await Promise.all([
          supabase.from('accounts').select('karafun_channel').eq('id', accountId).maybeSingle(),
          supabase.from('events').select('id').eq('account_id', accountId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('events').select('id').eq('account_id', accountId).eq('is_show_ended', false)
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (!active) return;
        if (account.error || latest.error || current.error) {
          setError('Some setup checks are unavailable. You can still use the setup links.');
        } else {
          setHasChannel(Boolean(account.data?.karafun_channel));
          setHasShow(Boolean(latest.data?.id));
          if (!hasSavedProgress && latest.data?.id) setProgress({ ...initial, collapsed: true });
          setActiveEventId(current.data?.id || null);
        }
      } catch {
        if (active) setError('Setup checks are unavailable. You can still use the setup links.');
      } finally { if (active) setReady(true); }
    }
    void load();
    return () => { active = false; };
  }, [accountId]);

  function update(values: Partial<Progress>) {
    if (!ready || accountRef.current !== accountId) return;
    const next = { ...progress, ...values };
    setProgress(next);
    try { localStorage.setItem('stagevotes_first_show_' + accountId, JSON.stringify(next)); } catch {}
  }

  const completed = Number(venueCount > 0) + Number(hasShow)
    + Number(progress.karaokeTest || progress.skipKaraFun) + Number(progress.signupTest) + Number(progress.displayTest);
  const allDone = completed === 5;

  const checks = [venueCount > 0, hasShow, progress.karaokeTest || progress.skipKaraFun, progress.signupTest, progress.displayTest];

  // Once all setup steps are complete, keep the dashboard focused on the show.
  if (ready && allDone) return null;

  return <section className={styles.root} aria-label="First-show setup">
    <button type="button" className={styles.toggle} aria-expanded={!progress.collapsed} aria-controls={checklistId}
      disabled={!ready} onClick={() => update({ collapsed: !progress.collapsed })}>
      <span className={styles.heroIcon} aria-hidden="true"><Sparkles size={23} /></span>
      <span className={styles.heading}>
        <span className={styles.eyebrow}>Your first night, made simple</span>
        <span className={styles.title}>{allDone ? 'First-show setup complete' : 'Get ready for your first show'}</span>
      </span>
      <span className={styles.headerRight}>
        <span className={styles.progressCopy}><strong>{ready ? completed + ' of 5 ready' : 'Checking setup…'}</strong><span>{progress.collapsed ? 'Open checklist' : 'Collapse'}</span></span>
        <ChevronDown size={20} className={styles.chevron + (progress.collapsed ? '' : ' ' + styles.expanded)} aria-hidden="true" />
      </span>
    </button>
    <div className={styles.progressTrack} role="progressbar" aria-label="First-show setup progress" aria-valuemin={0} aria-valuemax={5}
      aria-valuenow={ready ? completed : undefined} aria-valuetext={ready ? completed + ' of 5 steps complete' : 'Checking setup'}>
      {checks.map((done, i) => <span key={i} className={styles.segment + (ready && done ? ' ' + styles.segmentDone : '')} />)}
    </div>
    {!progress.collapsed && <div id={checklistId} className={styles.body}>
      <p className={styles.intro}>A quick practice run now means a smoother night when singers arrive.</p>
      {error && <p className={styles.error} role="status">{error}</p>}
      <div className={styles.grid}>
        <SetupCard number={1} icon={<MapPin size={18} />} title="Add your venue" done={venueCount > 0} status={venueCount > 0 ? 'Added' : 'Start here'}>
          <p className={styles.description}>Set up the place where you will host your show.</p>
          <Link href="/my-venues" className={styles.action}>{venueCount > 0 ? 'Review venues' : 'Add a venue'}<ArrowRight size={14} /></Link>
        </SetupCard>
        <SetupCard number={2} icon={<CalendarDays size={18} />} title="Create a show" done={hasShow} status={hasShow ? 'Created' : 'To do'}>
          <p className={styles.description}>Choose your venue and show type. Use a practice show to try things out.</p>
          <Link href={activeEventId ? '/host/' + activeEventId : '/create'} className={styles.action}>{activeEventId ? 'Open current show' : 'Create a show'}<ArrowRight size={14} /></Link>
        </SetupCard>
        <SetupCard number={3} icon={<Music2 size={18} />} title="Test KaraFun" done={checks[2]} wide status={progress.skipKaraFun ? 'Manual playback' : progress.karaokeTest ? 'Tested' : 'Optional'}>
          <p className={styles.description}>{hasChannel ? 'Your channel is saved. ' : 'Save your remote link in Account settings. '}Keep KaraFun running, connect from Mission Control, then test play and pause with the correct song.</p>
          <div className={styles.actions}>
            <Link href="/account" className={styles.action}>KaraFun settings<ArrowRight size={14} /></Link>
            <a href="https://www.stagevotes.com/guides/karafun-setup" target="_blank" rel="noreferrer" className={styles.textLink}>Setup guide<ExternalLink size={13} /></a>
          </div>
          <div className={styles.checks}>
            <label className={styles.checkLabel}><input type="checkbox" checked={progress.karaokeTest} disabled={!ready || progress.skipKaraFun} onChange={e => update({ karaokeTest: e.target.checked })} /><span>I tested KaraFun playback</span></label>
            <label className={styles.checkLabel}><input type="checkbox" checked={progress.skipKaraFun} disabled={!ready} onChange={e => update({ skipKaraFun: e.target.checked, karaokeTest: false })} /><span>I am using another player or running playback manually</span></label>
          </div>
        </SetupCard>
        <SetupCard number={4} icon={<Smartphone size={18} />} title="Test singer signup" done={progress.signupTest} status={progress.signupTest ? 'Tested' : 'To do'}>
          <p className={styles.description}>Scan the singer QR code on a phone, add a test song, and check the host queue. Remove the entry afterward.</p>
          {activeEventId ? <a href={'/signup/' + activeEventId} target="_blank" rel="noreferrer" className={styles.action}>Open singer signup<ExternalLink size={13} /></a>
            : <p className={styles.hint}>To test signup, create or open a show. If you already tested it, check the box below.</p>}
          <div className={styles.checks}><label className={styles.checkLabel}><input type="checkbox" checked={progress.signupTest} disabled={!ready} onChange={e => update({ signupTest: e.target.checked })} /><span>I tested signup and checked the queue</span></label></div>
        </SetupCard>
        <SetupCard number={5} icon={<Monitor size={18} />} title="Test your show display" done={progress.displayTest} status={progress.displayTest ? 'Tested' : 'To do'}>
          <p className={styles.description}>Open the live display on your TV or external screen. Keep the host dashboard on your main screen.</p>
          {activeEventId ? <a href={'/display/' + activeEventId} target="_blank" rel="noreferrer" className={styles.action}>Open show display<ExternalLink size={13} /></a>
            : <p className={styles.hint}>To test the display, create or open a show. If you already tested it, check the box below.</p>}
          <div className={styles.checks}><label className={styles.checkLabel}><input type="checkbox" checked={progress.displayTest} disabled={!ready} onChange={e => update({ displayTest: e.target.checked })} /><span>I checked the display on my screen</span></label></div>
        </SetupCard>
      </div>
      <div className={styles.footer}><Trophy size={18} aria-hidden="true" /><p><strong>Running a competition?</strong> Test judge access and a complete ballot before the first scored performance.<a href="https://www.stagevotes.com/faq#judging" target="_blank" rel="noreferrer" className={styles.textLink}>Judging guide<ExternalLink size={12} /></a></p></div>
      {allDone && <p role="status" className={styles.success}><Check size={16} aria-hidden="true" />All five setup checks are complete. You can collapse this checklist anytime.</p>}
      <p className={styles.saved}>Your test confirmations are saved for this account on this device.</p>
    </div>}
  </section>;
}

function SetupCard({ number, icon, title, done, status, wide = false, children }: {
  number: number; icon: ReactNode; title: string; done: boolean; status: string; wide?: boolean; children: ReactNode;
}) {
  return <div className={[styles.card, done ? styles.done : '', wide ? styles.wide : ''].join(' ')}>
    <div className={styles.cardHeader}>
      <span className={styles.stepIcon} aria-hidden="true">{done ? <Check size={18} /> : icon}</span>
      <h3 className={styles.stepTitle}><span className={styles.stepNumber}>{String(number).padStart(2, '0')}</span>{title}</h3>
      <span className={styles.badge}>{status}</span>
    </div>
    {children}
  </div>;
}
