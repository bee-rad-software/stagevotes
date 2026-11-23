'use client';

import { useState } from 'react';
import Link from 'next/link';
import SVShell from '@/components/ui/SVShell';
import styles from './practice.module.css';

export default function PracticePage() {
  const [format, setFormat] = useState<'karaoke' | 'contest'>('karaoke');
  const [player, setPlayer] = useState('KaraFun');
  const [step, setStep] = useState(0);
  const [singer, setSinger] = useState('Sam');
  const [song, setSong] = useState("Don't Stop Believin’");

  function reset() {
    setStep(0);
    setSinger('Sam');
    setSong("Don't Stop Believin’");
  }

  return (
    <SVShell title="Practice show" subtitle="Learn the basics before your first karaoke night." showLive={false}>
      <section className={styles.card} aria-labelledby="practice-heading">
        <p className={styles.badge}>Practice only · No live show is created</p>
        <h2 id="practice-heading">{step === 4 ? 'Ready for your first show' : 'Run a five-minute rehearsal'}</h2>
        <p>Try the host workflow with a simulated player and singer signup. This won’t change your venue, player, or live queue.</p>
        {step < 4 && <p role="status" className={styles.step}>Step {step + 1} of 4</p>}
        {step === 0 && <>
          <fieldset>
            <legend>What are you hosting?</legend>
            <label><input type="radio" name="format" checked={format === 'karaoke'} onChange={() => setFormat('karaoke')} /> Karaoke Night (recommended)</label>
            <label><input type="radio" name="format" checked={format === 'contest'} onChange={() => setFormat('contest')} /> Karaoke Contest</label>
          </fieldset>
          <button type="button" onClick={() => setStep(1)}>Start practice</button>
        </>}
        {step === 1 && <>
          <h3>Connect your player</h3>
          <label htmlFor="practice-player">Karaoke player</label>
          <select id="practice-player" value={player} onChange={e => setPlayer(e.target.value)}>
            <option>KaraFun</option><option>Singa</option><option>Manual playback</option>
          </select>
          <p>For a real show, choose your player in Venue settings and connect it from the host screen.</p>
          <button type="button" onClick={() => setStep(2)}>{player === 'Manual playback' ? 'Continue with manual playback' : `Simulate connecting ${player}`}</button>
        </>}
        {step === 2 && <form onSubmit={e => {
          e.preventDefault();
          if (singer.trim() && song.trim()) setStep(3);
        }}>
          <h3>Try singer signup</h3>
          <p>At a real show, singers scan the signup QR on their phones. Submit a sample request here to see it reach the host queue.</p>
          <label htmlFor="practice-singer">Singer name</label>
          <input id="practice-singer" required maxLength={60} value={singer} onChange={e => setSinger(e.target.value)} />
          <label htmlFor="practice-song">Song</label>
          <input id="practice-song" required maxLength={120} value={song} onChange={e => setSong(e.target.value)} />
          <button type="submit" disabled={!singer.trim() || !song.trim()}>Add to practice queue</button>
        </form>}
        {step === 3 && <>
          <h3>Start the first song</h3>
          <div className={styles.queue}><span>Up Next</span><strong>{singer.trim()}</strong><span>{song.trim()}</span></div>
          <p>Start with the first singer in the queue. In a live show, confirm the song is loaded in your player before pressing Play.</p>
          <button type="button" onClick={() => setStep(4)}>Start sample song</button>
        </>}
        {step === 4 && <>
          <div className={styles.queue}><span>Now Singing · Simulated</span><strong>{singer.trim()}</strong><span>{song.trim()}</span></div>
          <p>Before going live, verify your real player connection and scan the signup QR with your phone.</p>
          {format === 'contest' && <p>For a contest, choose judge scoring, audience voting, or both when creating your show. Test a ballot before the first scored performance.</p>}
          <div className={styles.actions}>
            <Link href={`/create?format=${format}`}>Create a real show →</Link>
            <Link href="/account/venues">Venue settings</Link>
            <button type="button" onClick={reset}>Practice again</button>
          </div>
        </>}
        {step > 0 && step < 4 && <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>Back</button>}
      </section>
    </SVShell>
  );
}
