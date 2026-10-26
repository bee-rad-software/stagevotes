'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildRotationQueue } from '@/lib/rotationQueue';
import styles from './StageBackdrop.module.css';

export type StageEvent = { id: string; name: string; venue: string | null; account_id?: string | null; current_performance_id: string | null; is_show_ended: boolean; signups_open?: boolean | null; show_signup_qr?: boolean };
export type StageSinger = { id: string; singer_name: string; duet_partner_name?: string | null; song_title: string; artist: string | null; status: string; round?: number | null; queue_order?: number | null; manual_queue_order?: number | null; created_at?: string | null; singer_profile_id?: string | null; photo_url?: string | null };
const nameOf = (singer: StageSinger) => singer.duet_partner_name ? singer.singer_name + ' & ' + singer.duet_partner_name : singer.singer_name;

function Avatar({ singer, large = false }: { singer: StageSinger; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [singer.photo_url]);
  return <span className={large ? styles.largeAvatar : styles.avatar}>
    {singer.photo_url && !failed ? <img src={singer.photo_url} alt="" onError={() => setFailed(true)} /> : singer.singer_name.trim().slice(0, 1).toUpperCase() || '♪'}
  </span>;
}

export default function StageBackdrop({ event, singers, logo, origin, ready, error }: {
  event: StageEvent | null; singers: StageSinger[]; logo: string; origin: string; ready: boolean; error: string;
}) {
  const [native, setNative] = useState(false);
  const [filled, setFilled] = useState(false);
  const [displays, setDisplays] = useState<{ id: string; label: string; width: number; height: number; current: boolean }[]>([]);
  const [displayId, setDisplayId] = useState('');
  const [windowHint, setWindowHint] = useState('');
  useEffect(() => {
    const desktop = (window as any).stagevotesDesktop;
    if (!desktop?.listStageDisplays) return;
    desktop.listStageDisplays().then((state: any) => {
      if (!state) return;
      setNative(true); setFilled(state.filled); setDisplays(state.displays);
      setDisplayId(state.displays.find((display: any) => display.current)?.id || state.displays[0]?.id || '');
    }).catch(() => {});
  }, []);
  const restore = async () => {
    const result = await (window as any).stagevotesDesktop?.restoreStageWindow?.();
    if (result) setFilled(false);
  };
  const fillTV = async () => {
    if (!native) {
      setWindowHint('Fill TV needs the updated desktop app. For now, resize this window to fill the TV; avoid macOS fullscreen.');
      return;
    }
    try {
      const result = await (window as any).stagevotesDesktop.fillStageTV(displayId);
      if (result) setFilled(true);
    } catch { setWindowHint('Unable to fill this display. Try reopening Stage Mode.'); }
  };
  const [view, setView] = useState<'lyrics' | 'next'>('lyrics');
  const [guides, setGuides] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => { setToolsVisible(true); clearTimeout(timer); timer = setTimeout(() => setToolsVisible(false), 5000); };
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        void (window as any).stagevotesDesktop?.restoreStageWindow?.().then((result: any) => { if (result) setFilled(false); }).catch(() => {});
      }
      if (e.key.toLowerCase() === 'l') setView('lyrics');
      if (e.key.toLowerCase() === 'n') setView('next');
      if (e.key.toLowerCase() === 'g') setGuides(value => !value);
      wake();
    };
    wake(); window.addEventListener('pointermove', wake); window.addEventListener('keydown', key);
    return () => { clearTimeout(timer); window.removeEventListener('pointermove', wake); window.removeEventListener('keydown', key); };
  }, []);
  const current = singers.find(row => row.id === event?.current_performance_id && !['completed', 'skipped', 'removed'].includes(row.status));
  const upcoming = buildRotationQueue(singers.filter(row => row.status !== 'removed'), event?.current_performance_id).filter(row => row.id !== current?.id).slice(0, 5);
  const next = upcoming[0];
  const ended = Boolean(event?.is_show_ended);
  const entranceEvent = useRef<string | null>(null);
  const lastPerformance = useRef<string | null | undefined>(undefined);
  const entranceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entranceId, setEntranceId] = useState<string | null>(null);
  useEffect(() => {
    if (!ready || !event) return;
    const id = !ended ? event.current_performance_id : null;
    // Seed the initial view without announcing a performance already underway.
    if (lastPerformance.current === undefined || entranceEvent.current !== event.id) {
      entranceEvent.current = event.id;
      if (entranceTimer.current) clearTimeout(entranceTimer.current);
      setEntranceId(null);
      lastPerformance.current = id;
      return;
    }
    if (lastPerformance.current === id) return;
    lastPerformance.current = id;
    if (entranceTimer.current) clearTimeout(entranceTimer.current);
    setEntranceId(id);
    if (id) entranceTimer.current = setTimeout(() => setEntranceId(null), 5000);
  }, [ready, event?.id, event?.current_performance_id, ended]);
  useEffect(() => () => { if (entranceTimer.current) clearTimeout(entranceTimer.current); }, []);
  const entrance = !ended && current?.id === entranceId ? current : null;
  const showNext = !ended && (view === 'next' || !current);
  const showQr = !ended && event?.show_signup_qr === true && event?.signups_open !== false && Boolean(origin);
  const signupUrl = event?.account_id ? origin + '/go/' + event.account_id + '/signup' : origin + '/signup/' + event?.id;
  const stageName = event?.venue || event?.name || 'StageVotes';

  return <main className={styles.screen}>
    <div className={styles.aurora} aria-hidden="true" /><div className={styles.floor} aria-hidden="true" />
    <header className={styles.header}>
      {native && !filled && <div className={styles.dragHandle} title="Drag Stage Mode to your TV" aria-hidden="true" />}
      <div className={styles.identity}>
        {current && !ended ? <><Avatar singer={current} /><div className={styles.songCopy}><span className={styles.kicker}>ON STAGE</span><h1>{nameOf(current)}</h1><p>{current.song_title}{current.artist ? ' · ' + current.artist : ''}</p></div></>
          : <div className={styles.songCopy}><span className={styles.kicker}>STAGEVOTES PRESENTS</span><h1>{ended ? 'Thanks for singing!' : event?.name || 'Getting the stage ready'}</h1></div>}
      </div>
      <div className={styles.brand}><img src={logo || '/icon-512.png'} alt={logo ? stageName + ' logo' : 'StageVotes'} /><div><strong>{stageName}</strong><span>{ended ? 'SHOW COMPLETE' : 'KARAOKE NIGHT'}</span></div></div>
    </header>
    <aside className={styles.sidebar} aria-label="Next five singers">
      {entrance ? <div className={styles.entrance} key={entrance.id} role="status"><span className={styles.kicker}>YOU’RE UP!</span><Avatar singer={entrance} large /><h2>{nameOf(entrance)}</h2><p>{entrance.song_title}</p>{entrance.artist && <span className={styles.artist}>{entrance.artist}</span>}<button type="button" onClick={() => setEntranceId(null)}>Show queue</button></div> : <><div className={styles.queueTitle}><span className={styles.kicker}>COMING UP</span><strong>Next on stage</strong></div>
      <div className={styles.queue}>
        {!ended && upcoming.map((singer, index) => <article key={singer.id} className={styles.queueItem}><span className={styles.queueNumber}>{String(index + 1).padStart(2, '0')}</span><Avatar singer={singer} /><div><span className={styles.kicker}>{index === 0 ? 'UP NEXT' : 'SINGER ' + (index + 1)}</span><h2>{nameOf(singer)}</h2><p>{singer.song_title}</p></div></article>)}
        {(!upcoming.length || ended) && <p className={styles.footerMessage}>{ended ? 'See you next time.' : event?.signups_open === false ? 'Signups closed · Enjoy the show' : 'Good songs. Great company.'}</p>}
      </div>
      </>}
      {showQr ? <div className={styles.join}><div className={styles.qr}><QRCodeSVG value={signupUrl} size={150} marginSize={4} /></div><div><strong>YOUR TURN?</strong><span>Scan to sing</span></div></div> : <span className={styles.powered}>POWERED BY STAGEVOTES</span>}
    </aside>
    <section className={styles.lyricSpace} aria-label={showNext || ended ? 'Stage announcements' : 'Clear area for the separate KaraFun lyrics window'}>
      {!ready ? <p className={styles.message}>Setting the stage…</p> : !event ? <div className={styles.message}><h2>Show unavailable</h2><p>Check the show link or reconnect to StageVotes.</p></div> : ended ? <div className={styles.intermission}><span className={styles.kicker}>THAT’S A WRAP</span><h2>What a night.</h2><p>Thanks for sharing the stage.</p></div> : showNext ? <div className={styles.intermission} key={next?.id || 'open'}>
        <span className={styles.kicker}>{next ? 'UP NEXT' : 'THE STAGE IS YOURS'}</span>
        {next ? <><Avatar singer={next} large /><h2>{nameOf(next)}</h2><p>{next.song_title}</p><span className={styles.artist}>{next.artist}</span></> : <><h2>{current ? 'Enjoy the show.' : 'Your next song starts here.'}</h2><p>{event.signups_open === false ? 'Singer signups are closed.' : 'Choose a song. Make a memory.'}</p></>}
      </div> : guides ? <div className={styles.guides}><span>KaraFun lyrics go here</span><small>Move the transparent lyrics window inside this area. Press G to hide guides.</small></div> : null}
    </section>
    {error && <div role="status" className={styles.connection}>{error}</div>}
    <nav aria-label="Stage display controls" className={styles.tools + (toolsVisible ? '' : ' ' + styles.hiddenTools)}>
      <button type="button" aria-pressed={view === 'lyrics'} onClick={() => setView('lyrics')}>Lyrics · L</button>
      <button type="button" aria-pressed={view === 'next'} onClick={() => setView('next')}>Up Next · N</button>
      <button type="button" aria-pressed={guides} onClick={() => { setView('lyrics'); setGuides(value => !value); }}>Guides · G</button>
      {native && <select aria-label="TV display" value={displayId} onChange={e => setDisplayId(e.target.value)}>{displays.map(display => <option key={display.id} value={display.id}>{display.label} · {display.width}×{display.height}</option>)}</select>}
      <button type="button" onClick={() => { void fillTV(); }}>Fill TV</button>
      {native && filled && <button type="button" onClick={() => { void restore(); }}>Restore · Esc</button>}
      {native && <button type="button" onClick={() => { void (window as any).stagevotesDesktop.closeStageWindow(); }}>Close</button>}
      {windowHint && <p className={styles.windowHint} role="status">{windowHint}</p>}
    </nav>
  </main>;
}
