import Link from 'next/link';
import { Flag, LockKeyhole, PauseCircle } from 'lucide-react';
import { singerShowAvailability, type SignupEventState } from '@/lib/singerShowAvailability';
import styles from './SVShowAvailability.module.css';

export default function SVShowAvailability({ event, eventId, showName, hasJoined = false }: {
  event: SignupEventState | null | undefined; eventId: string; showName?: string; hasJoined?: boolean;
}) {
  const state = singerShowAvailability(event);
  if (state === 'open' || state === 'loading') return null;
  const ended = state === 'ended';
  const closed = state === 'closed';
  const Icon = ended ? Flag : closed ? LockKeyhole : PauseCircle;
  const title = ended ? 'This show has ended' : closed ? 'Signups are closed' : 'Additional songs are paused';
  const description = ended
    ? 'Song requests and queue changes are closed. Thanks for being part of the night!'
    : closed
    ? hasJoined ? 'The show is still running. Your queued songs remain in the rotation, but no new song requests are being accepted.'
      : 'The show is still running, but the host is not accepting new song requests. You can still follow along and enjoy the night.'
    : hasJoined ? 'The host has paused extra requests. Your queued songs are unchanged, and you can still manage those selections.'
      : 'New singers can still join. The host has paused extra requests from singers already in the queue.';
  return <section className={`${styles.card} ${ended ? styles.ended : styles.closed}`} role="status" aria-live="polite">
    <div className={styles.icon}><Icon size={30} /></div>
    <div className={styles.content}><span className={styles.badge}>{ended ? 'SHOW OVER' : closed ? 'SIGNUPS CLOSED · SHOW CONTINUES' : 'EXTRA REQUESTS PAUSED'}</span>
      {showName && <p className={styles.showName}>{showName}</p>}
      {ended ? <h1>{title}</h1> : <h2>{title}</h2>}
      <p>{description}</p>
      {ended && <div className={styles.actions}><Link className={styles.primary} href={`/shows/${eventId}`}>View show recap</Link><Link href="/my-schedule">Find an upcoming show</Link></div>}
    </div>
  </section>;
}
