'use client';

import { useEffect, useState } from 'react';
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
  const [view, setView] = useState<'lyrics' | 'next'>('lyrics');
  const [guides, setGuides] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => { setToolsVisible(true); clearTimeout(timer); timer = setTimeout(() => setToolsVisible(false), 5000); };
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key.toLowerCase() === 'l') setView('lyrics');
      if (e.key.toLowerCase() === 'n') setView('next');
      if (e.key.toLowerCase() === 'g') setGuides(value => !value);
      wake();
    };
    wake(); window.addEventListener('pointermove', wake); window.addEventListener('keydown', key);
    return () => { clearTimeout(timer); window.removeEventListener('pointermove', wake); window.removeEventListener('keydown', key); };
  }, []);
  const current = singers.find(row => row.id === event?.current_performance_id && !['completed', 'skipped', 'removed'].includes(row.status));
  const upcoming = buildRotationQueue(singers.filter(row => row.status !== 'removed'), event?.current_performance_id).filter(row => row.id !== current?.id).slice(0, 2);
  const next = upcoming[0];
  const ended = Boolean(event?.is_show_ended);
  const showNext = !ended && (view === 'next' || !current);
  const showQr = !ended && event?.show_signup_qr === true && event?.signups_open !== false && Boolean(origin);
  const signupUrl = event?.account_id ? origin + '/go/' + event.account_id + '/signup' : origin + '/signup/' + event?.id;
  const stageName = event?.venue || event?.name || 'StageVotes';

  return <main className={styles.screen} onDoubleClick={() => { if (!document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {}); }}>
    <div className={styles.aurora} aria-hidden="true" /><div className={styles.floor} aria-hidden="true" />
    <header className={styles.header}>
      <div className={styles.identity}>
        {current && !ended ? <><Avatar singer={current} /><div className={styles.songCopy}><span className={styles.kicker}>ON STAGE</span><h1>{nameOf(current)}</h1><p>{current.song_title}{current.artist ? ' · ' + current.artist : ''}</p></div></>
          : <div className={styles.songCopy}><span className={styles.kicker}>STAGEVOTES PRESENTS</span><h1>{ended ? 'Thanks for singing!' : event?.name || 'Getting the stage ready'}</h1></div>}
      </div>
      <div className={styles.brand}><img src={logo || '/icon-512.png'} alt={logo ? stageName + ' logo' : 'StageVotes'} /><div><strong>{stageName}</strong><span>{ended ? 'SHOW COMPLETE' : 'KARAOKE NIGHT'}</span></div></div>
    </header>
    <section className={styles.lyricSpace} aria-label={showNext || ended ? 'Stage announcements' : 'Clear area for the separate KaraFun lyrics window'}>
      {!ready ? <p className={styles.message}>Setting the stage…</p> : !event ? <div className={styles.message}><h2>Show unavailable</h2><p>Check the show link or reconnect to StageVotes.</p></div> : ended ? <div className={styles.intermission}><span className={styles.kicker}>THAT’S A WRAP</span><h2>What a night.</h2><p>Thanks for sharing the stage.</p></div> : showNext ? <div className={styles.intermission} key={next?.id || 'open'}>
        <span className={styles.kicker}>{next ? 'UP NEXT' : 'THE STAGE IS YOURS'}</span>
        {next ? <><Avatar singer={next} large /><h2>{nameOf(next)}</h2><p>{next.song_title}</p><span className={styles.artist}>{next.artist}</span></> : <><h2>{current ? 'Enjoy the show.' : 'Your next song starts here.'}</h2><p>{event.signups_open === false ? 'Singer signups are closed.' : 'Choose a song. Make a memory.'}</p></>}
      </div> : guides ? <div className={styles.guides}><span>KaraFun lyrics go here</span><small>Move the transparent lyrics window inside this area. Press G to hide guides.</small></div> : null}
    </section>
    <footer className={styles.footer}>
      <div className={styles.queue}>
        {!ended && upcoming.map((singer, index) => <article key={singer.id} className={styles.queueItem}><span className={styles.queueNumber}>{String(index + 1).padStart(2, '0')}</span><Avatar singer={singer} /><div><span className={styles.kicker}>{index === 0 ? 'UP NEXT' : 'THEN'}</span><h2>{nameOf(singer)}</h2><p>{singer.song_title}</p></div></article>)}
        {!upcoming.length && <p className={styles.footerMessage}>{ended ? 'See you next time.' : event?.signups_open === false ? 'Signups closed · Enjoy the show' : 'Good songs. Great company.'}</p>}
      </div>
      {showQr ? <div className={styles.join}><div><strong>YOUR TURN?</strong><span>Scan to sing</span></div><div className={styles.qr}><QRCodeSVG value={signupUrl} size={110} marginSize={4} /></div></div> : <span className={styles.powered}>POWERED BY STAGEVOTES</span>}
    </footer>
    {error && <div role="status" className={styles.connection}>{error}</div>}
    <nav aria-label="Stage display controls" className={styles.tools + (toolsVisible ? '' : ' ' + styles.hiddenTools)}>
      <button type="button" aria-pressed={view === 'lyrics'} onClick={() => setView('lyrics')}>Lyrics · L</button>
      <button type="button" aria-pressed={view === 'next'} onClick={() => setView('next')}>Up Next · N</button>
      <button type="button" aria-pressed={guides} onClick={() => { setView('lyrics'); setGuides(value => !value); }}>Guides · G</button>
      <button type="button" onClick={() => { if (!document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {}); else void document.exitFullscreen().catch(() => {}); }}>Fullscreen</button>
    </nav>
  </main>;
}
