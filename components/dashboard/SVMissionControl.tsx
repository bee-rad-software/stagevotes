'use client';

import type React from 'react';
import { Play, Pause, Square, UserPlus, SkipForward, Vote, Monitor, Trophy, Radio, ChevronDown, MoreHorizontal } from 'lucide-react';
import styles from './SVMissionControl.module.css';

type Props = {
  onStartShow?: () => void;
  onEndShow?: () => void;
  onAddSinger?: () => void;
  onToggleVoting?: () => void;
  onOpenDisplay?: () => void;
  onAwards?: () => void;
  onConnectKaraFun?: () => void;
  onPlayKaraFun?: () => void;
  onPauseKaraFun?: () => void;
  onSkipKaraFun?: () => void;
  karafunPauseReady?: boolean;
  karafunSkipReady?: boolean;
  karafunControlPending?: 'pause' | 'skip' | null;
  karafunControlError?: string;
  karafunPlaybackReady?: boolean;
  karafunPlayPending?: boolean;
  karafunPlayError?: string;
  karafunDisplayOpen?: boolean;
  onOpenKaraFunDisplay?: () => void;
  karafunConnecting?: boolean;
karafunConnectionError?: string;
karafunPlayerOnline?: boolean;

  judgingEnabled?: boolean;
  votingOpen?: boolean;
  hasCurrentSinger?: boolean;
  showStarted?: boolean;
  karafunConnected?: boolean;

  currentSingerName?: string;
  nextSingerName?: string;
};

export default function SVMissionControl(p: Props) {
  const busy = p.karafunPlayPending || Boolean(p.karafunControlPending);
  const pausing = Boolean(p.karafunPauseReady || p.karafunControlPending === 'pause');
  const connected = p.karafunConnected && p.karafunPlayerOnline;
  const error = p.karafunConnectionError || p.karafunPlayError || p.karafunControlError;
  const closeMenu = (e: React.MouseEvent<HTMLButtonElement>, action?: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    action?.();
  };
  return <section className={styles.panel} aria-label="Show controls">
    <div className={styles.top}>
      <div className={styles.heading}><h2>Run the show</h2><p>{p.currentSingerName ? `Current: ${p.currentSingerName} · Next: ${p.nextSingerName || 'No one waiting'}` : 'Ready for your first singer'}</p></div>
      <div className={styles.actions}>
        {!p.showStarted && <button type="button" className={styles.primary} onClick={p.onStartShow}>
          <Play size={19}/>Start Show
        </button>}
        <button type="button" onClick={p.onAddSinger}><UserPlus size={18}/>Add Singer</button>
      </div>
    </div>
    <div className={styles.player}>
      <div className={styles.connection}><Radio size={17}/><strong>KaraFun</strong><span className={connected ? styles.online : styles.offline}>{p.karafunConnecting ? 'Connecting…' : connected ? 'Connected' : p.karafunConnected ? 'Player offline' : 'Not connected'}</span></div>
      <div className={styles.actions}>
        <button type="button" className={styles.playback} onClick={pausing ? p.onPauseKaraFun : p.onPlayKaraFun} disabled={busy || (pausing ? !p.karafunPauseReady : !p.karafunPlaybackReady)} title={pausing ? 'Pause the current KaraFun song' : 'Play the matching song for the current singer'}>
          {pausing ? <Pause size={18}/> : <Play size={18}/>}{p.karafunPlayPending ? 'Starting…' : p.karafunControlPending === 'pause' ? 'Pausing…' : pausing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={p.onSkipKaraFun} disabled={!p.karafunSkipReady || busy} title="Skip the KaraFun track after checking the next singer and required judge ballots"><SkipForward size={18}/>{p.karafunControlPending === 'skip' ? 'Skipping…' : 'Skip Song'}</button>
        <button type="button" className={styles.quiet} onClick={p.onConnectKaraFun} disabled={p.karafunConnecting}>{p.karafunConnected ? 'Disconnect' : 'Connect'}</button>
      </div>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {p.karafunConnected && !p.karafunPlayerOnline && <p className={styles.notice} role="status">Open the KaraFun player to use playback controls.</p>}
    <div className={styles.utilities}>
      {p.judgingEnabled && <button type="button" role="switch" aria-checked={Boolean(p.votingOpen)} onClick={p.onToggleVoting} disabled={!p.hasCurrentSinger} title="Open or close judging for the current singer"><Vote size={17}/>Voting: {p.votingOpen ? 'Open' : 'Closed'}</button>}
      <details className={styles.menu} name="show-control-menu"><summary><Monitor size={17}/>Displays<ChevronDown size={14}/></summary><div className={styles.menuItems}>
        <button type="button" onClick={e => closeMenu(e,p.onOpenDisplay)}>Open TV Display</button>
        <button type="button" onClick={e => closeMenu(e,p.onOpenKaraFunDisplay)}>{p.karafunDisplayOpen ? 'Close' : 'Open'} KaraFun Display</button>
      </div></details>
      {p.judgingEnabled && <details className={styles.menu} name="show-control-menu"><summary><MoreHorizontal size={18}/>More actions<ChevronDown size={14}/></summary><div className={styles.menuItems}>
        <button type="button" onClick={e => closeMenu(e,p.onAwards)}><Trophy size={17}/>Awards</button>
      </div></details>}
      {p.onEndShow && <button type="button" className={styles.endShow} onClick={p.onEndShow}>
        <Square size={16} aria-hidden="true"/>End Show
      </button>}
    </div>
  </section>;
}
