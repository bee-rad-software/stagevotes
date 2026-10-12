'use client';

import { useEffect, useRef, useState } from 'react';
import type { SVSongOption } from './SVSongPicker';

export default function SVSmartSongDiscovery({ eventId, onSelect }: {
  eventId: string;
  onSelect: (song: SVSongOption) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [songs, setSongs] = useState<SVSongOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    setSongs([]); setMessage(''); setBusy(false); setPrompt('');
    return () => { requestRef.current?.abort(); requestRef.current = null; };
  }, [eventId]);

  async function discover() {
    if (requestRef.current || prompt.trim().length < 5) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true); setMessage(''); setSongs([]);
    const timer = window.setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch('/api/singer/song-discovery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, prompt: prompt.trim() }), signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.recommendations)) {
        throw new Error(payload.error || 'Song discovery is unavailable. Try ordinary search.');
      }
      if (requestRef.current !== controller) return;
      setSongs(payload.recommendations.map((song: {
        id?: string | number; title: string; artist: string; reason: string; karafunSongId?: number;
      }) => ({
        id: song.id, title: song.title, artist: song.artist, note: song.reason,
        karafunSongId: song.karafunSongId, status: 'available', selectionSource: 'ai_recommendation',
      })));
      setMessage('Matched to this show’s catalog. Singing difficulty depends on your voice and the arrangement.');
    } catch (error) {
      if (requestRef.current !== controller) return;
      setMessage(controller.signal.aborted ? 'Discovery took too long. Try again or use song search.'
        : error instanceof Error ? error.message : 'Unable to discover songs right now.');
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) { requestRef.current = null; setBusy(false); }
    }
  }

  return (
    <details className="sv-ai-song-card">
      <summary style={{ cursor: 'pointer', color: '#7dd3fc', fontWeight: 800 }}>
        ✨ Smart song discovery
      </summary>
      <p style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
        Describe the mood, style, or kind of song you want. No account needed.
      </p>
      <label className="sv-singer-note-field">
        <span>What would you like to sing?</span>
        <textarea rows={2} maxLength={300} value={prompt} disabled={busy}
          placeholder="Something like Footloose but easier to sing"
          onChange={event => setPrompt(event.target.value)} />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        {['An upbeat 80s crowd pleaser', 'A country duet', 'A relaxed song for a beginner'].map(example => (
          <button type="button" className="sv-secondary-button" key={example} disabled={busy}
            onClick={() => { setPrompt(example); setSongs([]); setMessage(''); }}>{example}</button>
        ))}
      </div>
      <button type="button" className="sv-ai-song-button"
        disabled={busy || prompt.trim().length < 5} onClick={discover}>
        {busy ? 'Finding and checking songs…' : 'Find songs for me'}
      </button>
      <div className="sv-ai-song-message" aria-live="polite">{message}</div>
      <div className="sv-ai-song-results">
        {songs.map(song => (
          <button type="button" className="sv-picker-song" key={song.id ?? song.karafunSongId}
            onClick={() => onSelect(song)}>
            <div>
              <div className="sv-picker-title">{song.title}</div>
              <div className="sv-picker-artist">{song.artist}</div>
              <div className="sv-picker-note">{song.note}</div>
            </div>
            <span className="sv-chip sv-chip-blue">Choose</span>
          </button>
        ))}
      </div>
    </details>
  );
}
