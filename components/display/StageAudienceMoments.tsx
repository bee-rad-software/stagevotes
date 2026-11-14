'use client';
import { useEffect, useRef, useState } from 'react';
import { approvedStagePhotos, musicTrivia, type StagePhoto } from '@/lib/stageAudienceContent';
import styles from './BetweenSingers.module.css';
export function useStagePhotos(eventId: string, enabled: boolean) {
  const [state, setState] = useState<{eventId: string; photos: StagePhoto[]}>({eventId, photos: []});
  useEffect(() => {
    setState({eventId, photos: []});
    if (!enabled) return;
    let live = true, busy = false;
    const controller = new AbortController();
    async function refresh() {
      if (busy) return; busy = true;
      try {
        const response = await fetch('/api/events/' + encodeURIComponent(eventId) + '/photos', {cache: 'no-store', signal: controller.signal});
        const photos = response.ok ? approvedStagePhotos(await response.json()) : [];
        if (live) setState({eventId, photos});
      } catch { if (live) setState({eventId, photos: []}); }
      finally { busy = false; }
    }
    void refresh(); const timer = setInterval(() => void refresh(), 30000);
    return () => { live = false; controller.abort(); clearInterval(timer); };
  }, [eventId, enabled]);
  return {photos: enabled && state.eventId === eventId ? state.photos : [], remove: (id: string) => setState(old => ({...old, photos: old.photos.filter(photo => photo.id !== id)}))};
}
const turns = new Map<string, number>();
function readTurn(key: string) { try { return Number(sessionStorage.getItem(key)) || turns.get(key) || 0; } catch { return turns.get(key) || 0; } }
function useTurn(eventId: string, kind: string) {
  const key = 'stage-audience-' + kind + ':' + eventId;
  const [turn] = useState(() => readTurn(key));
  const counted = useRef(false);
  useEffect(() => { if (counted.current) return; counted.current = true; turns.set(key, turn + 1); try {sessionStorage.setItem(key, String(turn + 1));} catch {} }, [key, turn]);
  return turn;
}
export function StageTrivia({eventId}: {eventId: string}) {
  const turn = useTurn(eventId, 'trivia');
  const [answer, setAnswer] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setAnswer(true), 9000); return () => clearTimeout(timer); }, []);
  const trivia = musicTrivia[turn % musicTrivia.length];
  return <div className={styles.card} role="region" aria-label="Music trivia">
    <span className={styles.kicker}>{answer ? 'DID YOU GET IT?' : 'MUSIC TRIVIA · SHOUT IT OUT'}</span>
    <h2 className={answer ? styles.triviaQuestion : undefined}>{trivia.question}</h2>
    {answer ? <p className={styles.triviaAnswer}>{trivia.answer}</p> : <p>Answer coming up…</p>}
  </div>;
}
export function StageShowPhoto({eventId, photos, onFailed}: {eventId: string; photos: StagePhoto[]; onFailed: (id: string) => void}) {
  const turn = useTurn(eventId, 'photo');
  const photo = photos[turn % photos.length];
  if (!photo) return null;
  return <div className={`${styles.card} ${styles.photoCard}`} role="region" aria-label="Tonight’s photos">
    <span className={styles.kicker}>TONIGHT THROUGH YOUR EYES</span>
    <img className={styles.showPhoto} key={photo.url} src={photo.url} alt={photo.caption || 'A host-approved photo from this show'} onError={() => onFailed(photo.id)} />
    {photo.caption && <p className={styles.photoCaption}>{photo.caption}</p>}
  </div>;
}
