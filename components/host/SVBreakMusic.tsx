'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FolderOpen, Music2, Pause, Play, SkipForward, VolumeX } from 'lucide-react';
import { initialBreakMusicState, nextBreakTrack, updateBreakMusicState } from '@/lib/breakMusicState';
import styles from './SVBreakMusic.module.css';

export type BreakMusicHandle = { silence: () => Promise<void> };
type Props = { connected: boolean; online: boolean; playbackState: number | null; commandPending: boolean; ended: boolean };
type Track = { name: string; url: string };

const SVBreakMusic = forwardRef<BreakMusicHandle, Props>(function SVBreakMusic({ connected, online, playbackState, commandPending, ended }, ref) {
  const [desktop, setDesktop] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [shuffle, setShuffle] = useState(true);
  const [automatic, setAutomatic] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [between, setBetween] = useState(false);
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const filesInput = useRef<HTMLInputElement | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const tracksRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const frame = useRef(0);
  const cancelFade = useRef<(() => void) | null>(null);
  const machine = useRef(initialBreakMusicState);
  const manualHold = useRef(false);
  const options = useRef({ volume, shuffle, muted });
  const blocked = useRef(true);
  const intent = useRef(0);
  const wantsPlayback = useRef(false);
  const advance = useRef<() => void>(() => {});
  options.current = { volume, shuffle, muted };
  blocked.current = ended || commandPending || (connected && online && (playbackState === 4 || playbackState === 5));

  const fade = useCallback((target: number, duration = 500) => new Promise<void>(resolve => {
    window.clearTimeout(frame.current); cancelFade.current?.();
    const el = audio.current;
    if (!el) { resolve(); return; }
    cancelFade.current = resolve;
    const start = performance.now(), from = el.volume;
    const tick = (now: number) => {
      const fraction = Math.min(1, (now - start) / duration);
      el.volume = Math.max(0, Math.min(1, from + (target - from) * fraction));
      if (fraction < 1) frame.current = window.setTimeout(() => tick(performance.now()), 30);
      else { cancelFade.current = null; resolve(); }
    };
    frame.current = window.setTimeout(() => tick(performance.now()), 30);
  }), []);

  const stop = useCallback(async (immediate = false) => {
    wantsPlayback.current = false;
    const ticket = ++intent.current;
    if (!immediate) await fade(0);
    if (ticket !== intent.current) return;
    if (immediate) { window.clearTimeout(frame.current); cancelFade.current?.(); cancelFade.current = null; }
    audio.current?.pause();
    if (audio.current) audio.current.volume = 0;
  }, [fade]);

  useImperativeHandle(ref, () => ({ silence: async () => { blocked.current = true; await stop(); } }), [stop]);

  const start = useCallback(async (at = indexRef.current) => {
    const el = audio.current, track = tracksRef.current[at];
    if (!el || !track || blocked.current || options.current.muted) return;
    wantsPlayback.current = true;
    const ticket = ++intent.current;
    window.clearTimeout(frame.current); cancelFade.current?.(); cancelFade.current = null;
    setError('');
    if (el.getAttribute('src') !== track.url) { el.src = track.url; indexRef.current = at; setIndex(at); }
    el.volume = 0;
    try {
      await el.play();
      if (ticket !== intent.current || blocked.current || options.current.muted) { if (!wantsPlayback.current || ticket === intent.current) el.pause(); return; }
      await fade(options.current.volume);
    } catch { if (ticket === intent.current) { setPlaying(false); setError('Could not play this file. Select another track or press Play to try again.'); } }
  }, [fade]);

  advance.current = () => { void start(nextBreakTrack(indexRef.current, tracksRef.current.length, options.current.shuffle)); };

  useEffect(() => {
    if (!(window as Window & { stagevotesDesktop?: { isDesktop?: boolean } }).stagevotesDesktop?.isDesktop) return;
    setDesktop(true);
    const el = new Audio(); audio.current = el; el.volume = 0;
    const onPlay = () => setPlaying(true), onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); advance.current(); };
    const onError = () => { setPlaying(false); setError('This audio file could not be read. Try another MP3, WAV, or M4A file.'); };
    el.addEventListener('play', onPlay); el.addEventListener('pause', onPause); el.addEventListener('ended', onEnded); el.addEventListener('error', onError);
    return () => {
      ++intent.current; window.clearTimeout(frame.current); cancelFade.current?.(); cancelFade.current = null;
      el.pause(); el.removeAttribute('src'); el.load();
      el.removeEventListener('play', onPlay); el.removeEventListener('pause', onPause); el.removeEventListener('ended', onEnded); el.removeEventListener('error', onError);
      tracksRef.current.forEach(t => URL.revokeObjectURL(t.url)); tracksRef.current = []; audio.current = null;
    };
  }, []);

  useEffect(() => {
    const label = connected && online ? String(playbackState ?? 'unknown') : 'offline';
    setStatusHistory(previous => previous[previous.length - 1] === label ? previous : [...previous.slice(-7), label]);
  }, [connected, online, playbackState]);

  useEffect(() => {
    const was = machine.current;
    const next = updateBreakMusicState(was, connected && online, playbackState);
    machine.current = next; setBetween(next.between);
    if (playbackState === 4 && connected && online) manualHold.current = false;
    // Disconnects, pauses, pending commands and show end are always silent.
    if (next.blocked || ended) { void stop(true); return; }
    // Play awaits imperative silence; do not interrupt that fade with a second stop.
    if (commandPending) return;
    if (!automatic || !next.between || muted || manualHold.current) return;
    // Wait through transient ready/loading messages before bringing music back.
    const timer = window.setTimeout(() => { if (!blocked.current && !manualHold.current) void start(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [connected, online, playbackState, commandPending, ended, automatic, muted, tracks.length, start, stop]);

  useEffect(() => { if (audio.current && !audio.current.paused) void fade(muted ? 0 : volume, 180); }, [volume, muted, fade]);

  async function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).filter(f => /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name)).sort((a,b) => a.name.localeCompare(b.name));
    if (!selected.length) { setError('No supported audio files found. Choose MP3, WAV, M4A, AAC, OGG, or FLAC files.'); return; }
    await stop(true); audio.current?.removeAttribute('src'); audio.current?.load();
    tracksRef.current.forEach(t => URL.revokeObjectURL(t.url));
    const next = selected.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
    tracksRef.current = next; indexRef.current = 0; setTracks(next); setIndex(0); manualHold.current = false; setError('');
  }

  if (!desktop) return null;
  const singerBusy = connected && online && (playbackState === 4 || playbackState === 5);
  const cannotPlay = !tracks.length || singerBusy || commandPending || ended;
  return <section className={styles.panel} aria-label="Break music">
    <div className={styles.head}><Music2 size={20} /><h3>Break music</h3><span className={styles.status}>{playing ? 'Playing' : singerBusy ? 'Singer on stage' : 'Ready when you are'}</span></div>
    <p>Your playlist, between singers. Files stay on this computer and play through its selected audio output.</p>
    <input className={styles.hidden} ref={filesInput} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple onChange={e => { void chooseFiles(e.target.files); e.target.value = ''; }} />
    <input className={styles.hidden} ref={folderInput} type="file" multiple {...{ webkitdirectory: '' }} onChange={e => { void chooseFiles(e.target.files); e.target.value = ''; }} />
    <div className={styles.row}>
      <button type="button" onClick={() => folderInput.current?.click()}><FolderOpen size={15} />Choose folder</button>
      <button type="button" onClick={() => filesInput.current?.click()}>Choose audio files</button>
      <span className={styles.status}>{tracks.length} tracks</span>
    </div>
    {tracks.length > 0 && <div className={styles.row}><select aria-label="Break music track" value={index} onChange={e => {
      const at = Number(e.target.value); indexRef.current = at; setIndex(at);
      if (playing) void start(at); else { if (audio.current) audio.current.src = tracksRef.current[at].url; }
    }}>{tracks.map((track,i) => <option key={track.url} value={i}>{track.name}</option>)}</select></div>}
    <div className={styles.row}>
      <button type="button" className={styles.primary} disabled={!playing && (cannotPlay || muted)} onClick={() => {
        if (playing) { manualHold.current = true; void stop(); } else { manualHold.current = false; void start(); }
      }}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause music' : 'Play music'}</button>
      <button type="button" disabled={cannotPlay || muted} onClick={() => { manualHold.current = false; advance.current(); }}><SkipForward size={15} />Next track</button>
      <button type="button" className={styles.mute} aria-pressed={muted} onClick={() => { setMuted(!muted); if (!muted) { manualHold.current = true; void stop(true); } }}><VolumeX size={16} />{muted ? 'Unmute' : 'Mute now'}</button>
    </div>
    <div className={styles.row}>
      <label className={styles.volume}>Volume<input type="range" min="0" max="100" value={Math.round(volume*100)} onChange={e => setVolume(Number(e.target.value)/100)} /><span>{Math.round(volume*100)}%</span></label>
      <label className={styles.option}><input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} />Shuffle</label>
    </div>
    <div className={styles.row}><label className={styles.option}><input type="checkbox" checked={automatic} onChange={e => { setAutomatic(e.target.checked); if (!e.target.checked) void stop(); }} />Automatically play between KaraFun songs</label></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {automatic && <details className={styles.note}><summary>Automatic playback troubleshooting</summary><p>KaraFun status sequence: {statusHistory.join(' → ')}. {between ? 'Between songs detected.' : 'Waiting for a completed playback transition.'} {commandPending ? 'Waiting for a playback command.' : ''}</p></details>}
    <p className={styles.note}>{ended ? 'Show ended. Break music is stopped.' : automatic && !connected ? 'Connect KaraFun for automatic playback. Manual controls are available.' : automatic && !between ? 'Waiting for a KaraFun performance. Pausing a singer will keep break music silent.' : 'Press Play in StageVotes to start each karaoke song. Break music never advances singers.'} Choose your playlist again after reloading or leaving this show. Use music you are authorized to play at your venue.</p>
  </section>;
});
export default SVBreakMusic;
