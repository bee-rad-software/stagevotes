import Link from 'next/link';
import styles from './MyStage.module.css';
export default function ExploreGrid() {
  return <nav className={styles.links} aria-label="Your StageVotes journey">
    <Link href="/song-history"><span>📖 Song history</span><span aria-hidden="true">→</span></Link>
    <Link href="/my-venues"><span>📍 My venues</span><span aria-hidden="true">→</span></Link>
    <a href="#my-badges"><span>🏅 My badges</span><span aria-hidden="true">↓</span></a>
  </nav>;
}
