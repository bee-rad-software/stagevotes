'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Progress = { karaokeTest: boolean; skipKaraFun: boolean; signupTest: boolean; displayTest: boolean; collapsed: boolean };
const initial: Progress = { karaokeTest: false, skipKaraFun: false, signupTest: false, displayTest: false, collapsed: false };

export default function SVFirstShowChecklist({ accountId, venueCount }: { accountId: string; venueCount: number }) {
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
  const linkStyle = { color: '#7dd3fc', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 } as const;
  const rowStyle = { padding: '16px 0', borderTop: '1px solid #334155' } as const;

  return <section style={{ margin: '24px 0', padding: '20px 24px', border: '1px solid #334155', borderRadius: 18, background: '#0f172a', color: '#e2e8f0' }}>
    <button type="button" aria-expanded={!progress.collapsed} aria-controls="first-show-checklist"
      disabled={!ready} onClick={() => update({ collapsed: !progress.collapsed })}
      style={{ width: '100%', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', border: 0, background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0, flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 20 }}>{allDone ? '✓ First-show setup complete' : 'Get ready for your first show'}</strong>
      <span style={{ color: '#7dd3fc', fontWeight: 700 }}>{ready ? completed + '/5 · ' + (progress.collapsed ? 'Open checklist' : 'Collapse') : 'Checking setup…'}</span>
    </button>
    {!progress.collapsed && <div id="first-show-checklist">
      <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>A quick practice run before singers arrive. Test confirmations are saved for this account on this device.</p>
      {error && <p role="status">{error}</p>}
      <div style={rowStyle}>
        <strong>{venueCount > 0 ? '✓' : '1.'} Add your venue</strong>
        <p>Set up the venue where you will host your show.</p>
        <Link href="/my-venues" style={linkStyle}>{venueCount > 0 ? 'Review venues' : 'Add a venue'} →</Link>
      </div>
      <div style={rowStyle}>
        <strong>{hasShow ? '✓' : '2.'} Create a show</strong>
        <p>Choose your venue and whether this is casual karaoke or a judged event. Use a practice show for testing.</p>
        <Link href={activeEventId ? '/host/' + activeEventId : '/create'} style={linkStyle}>{activeEventId ? 'Open current show' : 'Create a show'} →</Link>
      </div>
      <div style={rowStyle}>
        <strong>{progress.karaokeTest || progress.skipKaraFun ? '✓' : '3.'} Test KaraFun (optional)</strong>
        <p>{hasChannel ? 'Your KaraFun channel is saved. ' : 'Save your KaraFun remote link in Account settings. '}Keep the player running, connect from Mission Control, and test the correct song’s play and pause controls.</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <Link href="/account" style={linkStyle}>KaraFun account settings →</Link>
          <a href="https://www.stagevotes.com/guides/karafun-setup" target="_blank" rel="noreferrer" style={linkStyle}>Setup guide ↗</a>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={progress.karaokeTest} disabled={!ready || progress.skipKaraFun}
            onChange={e => update({ karaokeTest: e.target.checked })} /> I tested KaraFun playback
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <input type="checkbox" checked={progress.skipKaraFun} disabled={!ready}
            onChange={e => update({ skipKaraFun: e.target.checked, karaokeTest: false })} /> I’m using another player or running playback manually
        </label>
      </div>
      <div style={rowStyle}>
        <strong>{progress.signupTest ? '✓' : '4.'} Test singer signup</strong>
        <p>Open the show’s singer QR code on a phone, add a test song, and confirm the singer appears in the host queue. Remove the test entry when finished.</p>
        {activeEventId ? <a href={'/signup/' + activeEventId} target="_blank" rel="noreferrer" style={linkStyle}>Open current singer signup ↗</a>
          : <p style={{ color: '#94a3b8' }}>Create or open an active show to test its singer signup.</p>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <input type="checkbox" checked={progress.signupTest} disabled={!ready || (!activeEventId && !progress.signupTest)}
            onChange={e => update({ signupTest: e.target.checked })} /> I tested signup and checked the host queue
        </label>
      </div>
      <div style={rowStyle}>
        <strong>{progress.displayTest ? '✓' : '5.'} Test your show display</strong>
        <p>Open the live display, move it to your TV or external screen, and confirm the queue is visible. Keep the host dashboard on your main screen.</p>
        {activeEventId ? <a href={'/display/' + activeEventId} target="_blank" rel="noreferrer" style={linkStyle}>Open current show display ↗</a> : null}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <input type="checkbox" checked={progress.displayTest} disabled={!ready || (!activeEventId && !progress.displayTest)}
            onChange={e => update({ displayTest: e.target.checked })} /> I checked the display on my screen
        </label>
      </div>
      <p style={{ color: '#94a3b8', lineHeight: 1.5 }}>Running a competition? Test judge access and a complete ballot before the first scored performance. <a href="https://www.stagevotes.com/faq#judging" target="_blank" rel="noreferrer" style={linkStyle}>Judging guide ↗</a></p>
      {allDone && <p role="status" style={{ color: '#86efac' }}>Your checklist is complete. You can collapse it and reopen it whenever you need the links.</p>}
    </div>}
  </section>;
}
