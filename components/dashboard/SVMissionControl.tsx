'use client';
import { useKaraFunVisible } from './KaraFunVisibility';

import Link from 'next/link';
import type React from 'react';
import { TriangleAlert, Play, Pause, Square, UserPlus, SkipForward, Vote, Monitor, Trophy, Radio, ChevronDown, MoreHorizontal, QrCode } from 'lucide-react';
import styles from './SVMissionControl.module.css';

type Props = {
  phonePlayback?: React.ReactNode;
  onStartShow?: () => void;
  onEndShow?: () => void;
  onToggleShowPause?: () => void;
  showPaused?: boolean;
  pauseBusy?: boolean;
  onAddSinger?: () => void;
  onToggleVoting?: () => void;
  onOpenDisplay?: () => void;
  onCloseDisplay?: () => void;
  onCloseStageDisplay?: () => void;
  onOpenStageDisplay?: () => void;
  onAwards?: () => void;
  onConnectKaraFun?: () => void;
  karaokeSettingsHref?: string;
  signupQrHref?: string;
  onPlayKaraFun?: () => void;
  onPauseKaraFun?: () => void;
  onSkipKaraFun?: () => void;
  karafunPauseReady?: boolean;
  karafunSkipReady?: boolean;
  karafunControlPending?: 'pause' | 'skip' | null;
  karafunControlError?: string;
  karafunPlaybackReady?: boolean;
  karafunPlayHint?: string;
  karafunPlayPending?: boolean;
  karafunPlayError?: string;
  karafunDisplayOpen?: boolean;
  onOpenKaraFunDisplay?: () => void;
  karafunConnecting?: boolean;
  karafunConnectionLost?: boolean;
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
  const showKaraFun = useKaraFunVisible();
  const busy = p.karafunPlayPending || Boolean(p.karafunControlPending);
  const pausing = Boolean(p.karafunPauseReady || p.karafunControlPending === 'pause');
  const connected = p.karafunConnected && p.karafunPlayerOnline;
  const error = p.karafunConnectionError || p.karafunPlayError || p.karafunControlError;
  const closeMenu = (e: React.MouseEvent<HTMLButtonElement>, action?: () => void) => {
    e.currentTarget.closest('details')?.removeAttribute('open');
    action?.();
  };
  return <section className={styles.panel} aria-label="Show controls">
    {showKaraFun && p.karafunConnectionLost && (
      <div className={styles.connectionLost}>
        <TriangleAlert size={24} aria-hidden="true" />
        <div role="alert">
          <strong>KaraFun is disconnected</strong>
          <p>{p.karafunConnecting
            ? 'Reconnecting to KaraFun…'
            : p.karafunConnectionError || 'Check that KaraFun is open and remote control is enabled, then reconnect.'}</p>
        </div>
        {!p.karafunConnecting && p.onConnectKaraFun && (
          <button type="button" onClick={p.onConnectKaraFun}>Reconnect</button>
        )}
      </div>
    )}
    <div className={styles.top}>
      <div className={styles.heading}><h2>Run the show</h2><p>{p.currentSingerName ? `Current: ${p.currentSingerName} · Next: ${p.nextSingerName || 'No one waiting'}` : 'Ready for your first singer'}</p></div>
      <div className={styles.actions}>
        {p.signupQrHref && <Link className={styles.signupQr} href={p.signupQrHref} target="_blank" rel="noreferrer"><QrCode size={18}/>Signup QR</Link>}
        {!p.showStarted && <button type="button" className={styles.primary} onClick={p.onStartShow}>
          <Play size={19}/>Start Show
        </button>}
        <button type="button" onClick={p.onAddSinger}><UserPlus size={18}/>Add Singer</button>
      </div>
    </div>
    {showKaraFun && <div className={styles.player}>
      <div className={styles.connection}><Radio size={17}/><strong>KaraFun</strong><span className={connected ? styles.online : styles.offline}>{p.karafunConnecting ? 'Connecting…' : connected ? 'Connected' : p.karafunConnected ? 'Player offline' : 'Not connected'}</span></div>
      <div className={styles.actions}>
        <button type="button" className={styles.playback} onClick={pausing ? p.onPauseKaraFun : p.onPlayKaraFun} disabled={busy || (pausing ? !p.karafunPauseReady : !p.karafunPlaybackReady)} title={pausing ? 'Pause the current KaraFun song' : 'Play the matching song for the current singer'}>
          {pausing ? <Pause size={18}/> : <Play size={18}/>}{p.karafunPlayPending ? 'Starting…' : p.karafunControlPending === 'pause' ? 'Pausing…' : pausing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={p.onSkipKaraFun} disabled={!p.karafunSkipReady || busy} title="Skip the KaraFun track after checking the next singer and required judge ballots"><SkipForward size={18}/>{p.karafunControlPending === 'skip' ? 'Skipping…' : 'Skip Song'}</button>
        <button type="button" className={styles.quiet} onClick={p.onConnectKaraFun} disabled={p.karafunConnecting}>{connected ? 'Disconnect' : p.karafunConnected ? 'Retry connection' : 'Connect'}</button>
      </div>
    </div>}
    {showKaraFun && connected && !busy && !pausing && !p.karafunPlaybackReady && p.karafunPlayHint && (
      <p className={styles.notice} role="status">{p.karafunPlayHint}</p>
    )}
    {showKaraFun && p.karaokeSettingsHref && <p className={styles.notice}><a href={p.karaokeSettingsHref} target="_blank" rel="noreferrer">KaraFun settings for this show ↗</a> · Save the channel there, then refresh this show before connecting.</p>}
    {showKaraFun && error && (!p.karafunConnectionLost || !p.karafunConnectionError) && <p className={styles.error} role="alert">{error}</p>}
    {showKaraFun && !p.karafunConnectionLost && !p.karafunConnecting && p.karafunConnected && !p.karafunPlayerOnline && <p className={styles.notice} role="status">Bring KaraFun to the front and confirm remote control is enabled, then click Retry connection.</p>}
    <div className={styles.utilities}>
      {p.phonePlayback}
      {p.judgingEnabled && <button type="button" role="switch" aria-checked={Boolean(p.votingOpen)} onClick={p.onToggleVoting} disabled={!p.hasCurrentSinger} title="Open or close judging for the current singer"><Vote size={17}/>Voting: {p.votingOpen ? 'Open' : 'Closed'}</button>}
      <details className={styles.menu} name="show-control-menu"><summary><Monitor size={17}/>Displays<ChevronDown size={14}/></summary><div className={styles.menuItems}>
        <button type="button" onClick={e => closeMenu(e,p.onCloseDisplay ?? p.onOpenDisplay)}>{p.onCloseDisplay ? 'Close' : 'Open'} TV Display</button>
        {p.onOpenStageDisplay && <button type="button" onClick={e => closeMenu(e,p.onCloseStageDisplay ?? p.onOpenStageDisplay)}>{p.onCloseStageDisplay ? 'Close' : 'Open'} Stage Mode · Lyrics backdrop</button>}
        <button type="button" onClick={e => closeMenu(e,p.onOpenKaraFunDisplay)}>{p.karafunDisplayOpen ? 'Close' : 'Open'} Sidebar Display</button>
      </div></details>
      {p.judgingEnabled && <details className={styles.menu} name="show-control-menu"><summary><MoreHorizontal size={18}/>More actions<ChevronDown size={14}/></summary><div className={styles.menuItems}>
        <button type="button" onClick={e => closeMenu(e,p.onAwards)}><Trophy size={17}/>Awards</button>
      </div></details>}
      {p.onToggleShowPause && p.showStarted && <button type="button" onClick={p.onToggleShowPause} disabled={p.pauseBusy}>
        {p.showPaused ? <Play size={16}/> : <Pause size={16}/>}{p.pauseBusy ? 'Saving…' : p.showPaused ? 'Resume Show' : 'Pause Show'}
      </button>}
      {p.onEndShow && <button type="button" className={styles.endShow} onClick={p.onEndShow}>
        <Square size={16} aria-hidden="true"/>End Show
      </button>}
    </div>
  </section>;
}
