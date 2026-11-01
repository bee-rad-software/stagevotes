'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildRotationQueue } from '@/lib/rotationQueue';
import styles from './StageBackdrop.module.css';
import NextSingerSpotlight from './NextSingerSpotlight';
import {selectSpotlightSinger} from '@/lib/stageSpotlight';
import {stageEntranceLine} from '@/lib/stageEntranceLines';
import {allowsPartyRotation} from '@/lib/stageViewPolicy';
import {useStageDisplayBridge} from '@/hooks/useStageDisplayBridge';
import {useStageLyricsSignal} from '@/hooks/useStageLyricsSignal';
import HalloweenParty from './HalloweenParty';
import StageShoutoutTicker from '@/components/shoutouts/StageShoutoutTicker';

export type StageBadge = { id: string; singer: string; title: string; icon: string };
export type StageEvent = { id: string; name: string; venue: string | null; account_id?: string | null; current_performance_id: string | null; is_show_ended: boolean; signups_open?: boolean | null; show_signup_qr?: boolean };
export type StageSinger = { id: string; singer_name: string; duet_partner_name?: string | null; song_title: string; artist: string | null; status: string; round?: number | null; queue_order?: number | null; manual_queue_order?: number | null; created_at?: string | null; singer_profile_id?: string | null; photo_url?: string | null };
const themes = ['classic', 'halloween', 'neon', 'country', 'holiday'] as const;
type StageTheme = typeof themes[number];
const themeNames: Record<StageTheme, string> = { classic: 'Classic', halloween: 'Halloween', neon: 'Neon Night', country: 'Country Night', holiday: 'Holiday' };
const nameOf = (singer: StageSinger) => singer.duet_partner_name ? singer.singer_name + ' & ' + singer.duet_partner_name : singer.singer_name;

function StageBadgeToast({badge,eventId}:{badge:StageBadge|undefined;eventId:string|undefined}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    setVisible(Boolean(badge));
    if(!badge)return;
    const timer=window.setTimeout(()=>setVisible(false),8000);
    return()=>window.clearTimeout(timer);
  },[badge?.id,eventId]);
  if(!visible||!badge)return null;
  return <div className={styles.badgeCelebration} role="status" aria-label="Latest badge earned tonight">
    <span className={styles.badgeIcon} aria-hidden="true">{badge.icon}</span><div><span className={styles.badgeLabel}>BADGE EARNED TONIGHT</span><strong>{badge.singer}</strong><span>{badge.title}</span></div>
  </div>;
}

function Avatar({ singer, large = false }: { singer: StageSinger; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [singer.photo_url]);
  return <span className={large ? styles.largeAvatar : styles.avatar}>
    {singer.photo_url && !failed ? <img src={singer.photo_url} alt="" onError={() => setFailed(true)} /> : singer.singer_name.trim().slice(0, 1).toUpperCase() || '♪'}
  </span>;
}

export default function StageBackdrop({ event, singers, logo, origin, ready, error, badges = [] }: {
  event: StageEvent | null; singers: StageSinger[]; logo: string; origin: string; ready: boolean; error: string; badges?: StageBadge[];
}) {
  const [theme, setTheme] = useState<StageTheme>('classic');
  useEffect(() => {
    setTheme('classic');
    if (!event?.id) return;
    try {
      const saved = localStorage.getItem('stage-theme:' + event.id);
      if (themes.includes(saved as StageTheme)) setTheme(saved as StageTheme);
    } catch { /* The display still works without saved preferences. */ }
  }, [event?.id]);
  const chooseTheme = (value: string) => {
    if (!themes.includes(value as StageTheme)) return;
    setTheme(value as StageTheme);
    try { if (event?.id) localStorage.setItem('stage-theme:' + event.id, value); } catch { /* Keep the choice for this session. */ }
  };
  const [partyEnabled,setPartyEnabled]=useState(true);
  const [votingDeadline,setVotingDeadline]=useState('');
  useEffect(()=>{setVotingDeadline('');setPartyEnabled(true);if(!event?.id)return;try{setVotingDeadline(localStorage.getItem('stage-vote-deadline:'+event.id)||'');setPartyEnabled(localStorage.getItem('stage-halloween-party:'+event.id)!=='off');}catch{}},[event?.id]);
  const [native, setNative] = useState(false);
  const [filled, setFilled] = useState(false);
  const [displays, setDisplays] = useState<{ id: string; label: string; width: number; height: number; current: boolean }[]>([]);
  const [displayId, setDisplayId] = useState('');
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
    if (result) { setFilled(false);setAutoWindowHandoff(false);betweenSongs.current=false; }
  };
  const fillTV = async (targetId=displayId) => {
    if (!native) {
      throw new Error('Fill TV requires the desktop app.');
    }
    try {
      const result = await (window as any).stagevotesDesktop.fillStageTV(targetId);
      if (result) setFilled(true);
    } catch { throw new Error('Unable to fill this display. Try reopening Stage Mode.'); }
  };
  const [autoWindowHandoff,setAutoWindowHandoff]=useState(false);
  const autoHandoffRef=useRef(false);autoHandoffRef.current=autoWindowHandoff;
  const betweenSongs=useRef(false);
  const lastPlayedId=useRef<string|null>(null);
  const [singerSpotlight,setSingerSpotlight]=useState(true);
  useEffect(()=>{setSingerSpotlight(true);try{if(event?.id)setSingerSpotlight(localStorage.getItem('stage-singer-spotlight:'+event.id)!=='off');}catch{}},[event?.id]);
  const [view, setView] = useState<'lyrics' | 'next' | 'welcome' | 'break' | 'announcement'>('lyrics');
  const [announcement, setAnnouncement] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [guides, setGuides] = useState(false);
  useStageLyricsSignal(event?.id,()=>{
    lastPlayedId.current=event?.current_performance_id||null;betweenSongs.current=false;setView('lyrics');setEditingAnnouncement(false);setGuides(false);setEntranceId(null);
    if(autoHandoffRef.current)void (window as any).stagevotesDesktop?.setStagePresentation?.('lyrics');
  },()=>{
    if(!autoHandoffRef.current)return;
    betweenSongs.current=true;setView('break');setEditingAnnouncement(false);setGuides(false);setEntranceId(null);
    void (window as any).stagevotesDesktop?.setStagePresentation?.('front');
  });
  useEffect(()=>{setAutoWindowHandoff(false);betweenSongs.current=false;return()=>{void (window as any).stagevotesDesktop?.setStagePresentation?.('manual');};},[event?.id]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      if(e.key==='Escape'){void (window as any).stagevotesDesktop?.restoreStageWindow?.().then((result:any)=>{if(result){setFilled(false);setAutoWindowHandoff(false);betweenSongs.current=false;}}).catch(()=>{});}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  const current = singers.find(row => row.id === event?.current_performance_id && !['completed', 'skipped', 'removed'].includes(row.status));
  const upcoming = buildRotationQueue(singers.filter(row => row.status !== 'removed'), event?.current_performance_id).filter(row => row.id !== current?.id).slice(0, 5);
  const next = upcoming[0];
  const ended = Boolean(event?.is_show_ended);
  // The host's Start Show selects a current performance. Completed songs keep
  // a later gap from being mistaken for the beginning of a new show.
  const beforeShow = ready && Boolean(event) && !ended && !current && !singers.some(row => row.status === 'completed');
  const previousBeforeShow = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready || !event) return;
    if (previousBeforeShow.current === true && !beforeShow && !ended) setView('lyrics');
    previousBeforeShow.current = beforeShow;
  }, [ready, event?.id, beforeShow, ended]);
  const entranceEvent = useRef<string | null>(null);
  const lastPerformance = useRef<string | null | undefined>(undefined);
  const entranceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [entranceId, setEntranceId] = useState<string | null>(null);
  const [entranceTurn,setEntranceTurn]=useState(0);
  useEffect(() => {
    if (!ready || !event) return;
    const id = !ended ? event.current_performance_id : null;
    // Seed the initial view without announcing a performance already underway.
    if (lastPerformance.current === undefined || entranceEvent.current !== event.id) {
      entranceEvent.current = event.id;
      lastPlayedId.current=event.current_performance_id;
      setEntranceTurn(0);
      if (entranceTimer.current) clearTimeout(entranceTimer.current);
      setEntranceId(null);
      lastPerformance.current = id;
      return;
    }
    if (lastPerformance.current === id) return;
    lastPerformance.current = id;
    if (id) { if(!betweenSongs.current)setView('lyrics'); setEditingAnnouncement(false); setEntranceTurn(turn=>turn+1); }
    if (entranceTimer.current) clearTimeout(entranceTimer.current);
    setEntranceId(betweenSongs.current?null:id);
    if (id) entranceTimer.current = setTimeout(() => setEntranceId(null), 5000);
  }, [ready, event?.id, event?.current_performance_id, ended]);
  useEffect(() => () => { if (entranceTimer.current) clearTimeout(entranceTimer.current); }, []);
  const entrance = !ended && current?.id === entranceId ? current : null;
  const showBreak = !ended && view === 'break';
  const showAnnouncement = !ended && view === 'announcement' && Boolean(announcement);
  const showWelcome = !ended && (view === 'welcome' || (beforeShow && view === 'lyrics' && !guides));
  const showNext = !ended && !guides && !showWelcome && !showBreak && !showAnnouncement && (view === 'next' || !current);
  const showQr = !ended && event?.show_signup_qr === true && event?.signups_open !== false && Boolean(origin);
  const signupUrl = event?.account_id ? origin + '/go/' + event.account_id + '/signup' : origin + '/signup/' + event?.id;
  const partyActive=theme==='halloween'&&partyEnabled&&ready&&Boolean(event)&&!ended&&!showAnnouncement&&allowsPartyRotation(view,Boolean(current),guides);
  const spotlight=selectSpotlightSinger(singers,event?.current_performance_id,lastPlayedId.current,betweenSongs.current);
  const spotlightIntro=stageEntranceLine(theme,betweenSongs.current&&spotlight?.id===current?.id?entranceTurn:entranceTurn+1);
  const stageName = event?.venue || event?.name || 'StageVotes';

  useStageDisplayBridge(event?.id,{
    view,theme,partyEnabled,singerSpotlight,votingDeadline,announcement,guides,autoWindowHandoff,native,filled,displayId,displays,
    handoffSupported:native&&typeof (window as any).stagevotesDesktop?.setStagePresentation==='function',
  },async command=>{
    const save=(key:string,value:string)=>{try{if(event)localStorage.setItem(key+event.id,value);}catch{}};
    const showMode=(mode:typeof view)=>{
      betweenSongs.current=false;setView(mode);setEditingAnnouncement(false);setEntranceId(null);
      if(autoHandoffRef.current)void (window as any).stagevotesDesktop?.setStagePresentation?.(mode==='lyrics'?'lyrics':'front');
    };
    switch(command.type){
      case 'theme':chooseTheme(command.value);break;
      case 'view':showMode(command.value);setGuides(false);break;
      case 'announcement':setGuides(false);setAnnouncement(command.value.trim());showMode(command.value.trim()?'announcement':'lyrics');break;
      case 'deadline':setVotingDeadline(command.value);save('stage-vote-deadline:',command.value);break;
      case 'flag':
        if(command.key==='partyEnabled'){setPartyEnabled(command.value);save('stage-halloween-party:',command.value?'on':'off');}
        if(command.key==='singerSpotlight'){setSingerSpotlight(command.value);save('stage-singer-spotlight:',command.value?'on':'off');}
        if(command.key==='guides'){setGuides(command.value);showMode('lyrics');}
        if(command.key==='autoWindowHandoff'){
          const desktop=(window as any).stagevotesDesktop;
          if(!desktop?.setStagePresentation)return 'Window handoff requires the updated desktop app.';
          setAutoWindowHandoff(command.value);betweenSongs.current=false;
          await desktop.setStagePresentation(command.value&&view!=='lyrics'?'front':'manual');
        }
        break;
      case 'fill':
        if(!native)return 'Fill TV requires the desktop app. Resize this browser window manually.';
        if(!displays.some(d=>d.id===command.displayId))return 'Choose an available TV or monitor.';
        setDisplayId(command.displayId);await fillTV(command.displayId);break;
      case 'restore':await restore();break;
      case 'close':await (window as any).stagevotesDesktop?.closeStageWindow?.();break;
    }
  });

  return <main className={styles.screen} data-theme={theme}>
    <div className={styles.aurora} aria-hidden="true" /><div className={styles.floor} aria-hidden="true" />
    {theme === 'halloween' && <svg className={styles.halloweenArt} viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="spooky-moon"><stop stopColor="#ffcc85" stopOpacity=".38" /><stop offset="1" stopColor="#ff9b36" stopOpacity="0" /></radialGradient>
        <linearGradient id="spooky-hills" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#3b1854" /><stop offset="1" stopColor="#140d22" /></linearGradient>
      </defs>
      <circle cx="1390" cy="95" r="250" fill="url(#spooky-moon)" />
      <g fill="none" stroke="#e5b7f8" strokeOpacity=".26" strokeWidth="2">
        <path d="M0 0 L0 200 M0 0 L55 190 M0 0 L115 155 M0 0 L165 105 M0 0 L200 50" />
        <path d="M0 45 Q15 35 28 48 Q36 30 52 37 Q60 20 77 22 M0 90 Q24 78 50 95 Q65 66 92 74 Q107 48 130 52 M0 135 Q38 119 76 143 Q96 101 136 110 Q155 75 181 78" />
        <path d="M1600 0 L1600 200 M1600 0 L1545 190 M1600 0 L1485 155 M1600 0 L1435 105 M1600 0 L1400 50" />
        <path d="M1600 45 Q1585 35 1572 48 Q1564 30 1548 37 Q1540 20 1523 22 M1600 90 Q1576 78 1550 95 Q1535 66 1508 74 Q1493 48 1470 52" />
      </g>
      <g fill="#bd8bd3" fillOpacity=".35">
        <path d="M1210 120 q-20-18-36-4 q18-2 17 13 q12-8 19 6 q7-14 19-6 q-1-15 17-13 q-16-14-36 4z" />
        <path d="M1310 190 q-16-15-29-3 q14-1 14 10 q9-5 15 5 q6-10 15-5 q0-11 14-10 q-13-12-29 3z" />
        <path d="M1120 185 q-13-12-24-3 q12-1 12 9 q8-5 12 4 q5-9 13-4 q0-10 12-9 q-11-9-25 3z" />
      </g>
      <path fill="url(#spooky-hills)" fillOpacity=".38" d="M0 820 Q130 730 290 820 Q370 855 480 820 Q660 780 820 850 Q1010 800 1170 850 Q1390 770 1600 830 L1600 900 L0 900Z" />
      <g transform="translate(38 790)" fill="#fa923c" fillOpacity=".36">
        <ellipse cx="58" cy="63" rx="43" ry="35"/><ellipse cx="58" cy="63" rx="19" ry="35" fill="#ffc078" fillOpacity=".15"/><path d="M55 29 q2-20 13-21 q-4 13-3 23z" fill="#8db886"/>
        <path d="M37 56 l10-7 3 11z M67 60 l3-11 10 7z M39 72 q19 20 39 0 q-3 19-19 19 q-16 0-20-19" fill="#100c19" />
      </g>
    </svg>}
    <header className={styles.header}>
      {native && !filled && <div className={styles.dragHandle} title="Drag Stage Mode to your TV" aria-hidden="true" />}
      <div className={styles.identity}>
        {showBreak ? <div className={styles.songCopy}><span className={styles.kicker}>INTERMISSION</span><h1>Taking a short break</h1></div> : current && !ended ? <><Avatar singer={current} /><div className={styles.songCopy}><span className={styles.kicker}>{stageEntranceLine(theme,entranceTurn)}</span><h1>{nameOf(current)}</h1><p>{current.song_title}{current.artist ? ' · ' + current.artist : ''}</p></div></>
          : <div className={styles.songCopy}><span className={styles.kicker}>STAGEVOTES PRESENTS</span><h1>{ended ? 'Thanks for singing!' : event?.name || 'Getting the stage ready'}</h1></div>}
      </div>
      <div className={styles.brand}><img src={logo || '/icon-512.png'} alt={logo ? stageName + ' logo' : 'StageVotes'} /><div><strong>{stageName}</strong><span>{ended ? 'SHOW COMPLETE' : 'KARAOKE NIGHT'}</span></div></div>
    </header>
    <aside className={styles.sidebar} aria-label="Next five singers">
      {entrance ? <div className={styles.entrance} key={entrance.id} role="status"><span className={styles.kicker}>{stageEntranceLine(theme,entranceTurn)}</span><Avatar singer={entrance} large /><h2>{nameOf(entrance)}</h2><p>{entrance.song_title}</p>{entrance.artist && <span className={styles.artist}>{entrance.artist}</span>}<button type="button" onClick={() => setEntranceId(null)}>Show queue</button></div> : <><div className={styles.queueTitle}><span className={styles.kicker}>COMING UP</span><strong>Next on stage</strong></div>
      <div className={styles.queue}>
        {!ended && upcoming.map((singer, index) => <article key={singer.id} className={styles.queueItem}><span className={styles.queueNumber}>{String(index + 1).padStart(2, '0')}</span><Avatar singer={singer} /><div><span className={styles.kicker}>{index === 0 ? 'UP NEXT' : 'SINGER ' + (index + 1)}</span><h2>{nameOf(singer)}</h2><p>{singer.song_title}</p></div></article>)}
        {(!upcoming.length || ended) && <p className={styles.footerMessage}>{ended ? 'See you next time.' : event?.signups_open === false ? 'Signups closed · Enjoy the show' : 'Good songs. Great company.'}</p>}
      </div>
      </>}
      {!ended && <StageBadgeToast badge={badges[0]} eventId={event?.id}/>}
      {showQr ? <div className={styles.join}><div className={styles.qr}><QRCodeSVG value={signupUrl} size={150} marginSize={4} /></div><div><strong>YOUR TURN?</strong><span>Scan to sing</span></div></div> : <span className={styles.powered}>POWERED BY STAGEVOTES</span>}
    </aside>
    <section className={styles.lyricSpace} aria-label={showNext || showWelcome || showBreak || showAnnouncement || ended ? 'Stage announcements' : 'Clear area for the separate KaraFun lyrics window'}>
      {event&&<HalloweenParty nextSinger={singerSpotlight?spotlight:undefined} intro={spotlightIntro} eventId={event.id} enabled={theme==='halloween'&&partyEnabled&&!ended} active={partyActive} origin={origin} songs={singers.filter(s=>s.status==='completed').length} badges={badges} deadline={votingDeadline}/>}
      {!partyActive&&(!ready ? <p className={styles.message}>Setting the stage…</p> : !event ? <div className={styles.message}><h2>Show unavailable</h2><p>Check the show link or reconnect to StageVotes.</p></div> : ended ? <div className={styles.intermission}><span className={styles.kicker}>THAT’S A WRAP</span><h2>What a night.</h2><p>Thanks for sharing the stage.</p></div> : showAnnouncement ? <div className={styles.welcome} role="status"><span className={styles.welcomeEyebrow}>A MESSAGE FROM YOUR HOST</span><h2 className={styles.announcementText}>{announcement}</h2></div> : showBreak&&singerSpotlight&&spotlight ? <NextSingerSpotlight singer={spotlight} intro={spotlightIntro}/> : showBreak ? <div className={styles.welcome}><span className={styles.welcomeEyebrow}>INTERMISSION</span><h2>Taking a short break</h2><p>Karaoke will be back soon. {event.signups_open === false ? 'Enjoy the show!' : showQr ? 'Scan the code to join the queue.' : 'Ask your host how to join the queue.'}</p></div> : showWelcome ? <div className={styles.welcome}>
        <span className={styles.welcomeEyebrow}>{stageName} PRESENTS</span>
        <h2>{beforeShow ? 'Karaoke starts soon!' : 'Ready for your next song?'}</h2>
        <p>{event.signups_open === false ? 'Singer signups are closed. Enjoy the show!' : showQr ? 'Ready to take the stage? Scan the code to join the queue.' : 'Ready to take the stage? Ask your host how to join the queue.'}</p>
        {event.signups_open !== false && <div className={styles.welcomeSteps}><span><b>01</b> Pick a song</span><span><b>02</b> Join the queue</span><span><b>03</b> Get ready to sing</span></div>}
      </div> : showNext&&singerSpotlight&&spotlight ? <NextSingerSpotlight singer={spotlight} intro={spotlightIntro}/> : showNext ? <div className={styles.intermission} key={next?.id || 'open'}>
        <span className={styles.kicker}>{next ? 'UP NEXT' : 'THE STAGE IS YOURS'}</span>
        {next ? <><Avatar singer={next} large /><h2>{nameOf(next)}</h2><p>{next.song_title}</p><span className={styles.artist}>{next.artist}</span></> : <><h2>{current ? 'Enjoy the show.' : 'Your next song starts here.'}</h2><p>{event.signups_open === false ? 'Singer signups are closed.' : 'Choose a song. Make a memory.'}</p></>}
      </div> : guides ? <div className={styles.guides}><span>KaraFun lyrics go here</span><small>Move the transparent lyrics window inside this area. Hide guides from the host’s Lyrics display controls.</small></div> : null)}
    </section>
    {event && <StageShoutoutTicker eventId={event.id} active={Boolean(current) && !ended} />}
    {error && <div role="status" className={styles.connection}>{error}</div>}

  </main>;
}
