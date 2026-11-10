import styles from './StageThemeDecor.module.css';
export default function StageThemeDecor({theme}:{theme:string}) {
 if(!['vegas','mixtape','venue'].includes(theme))return null;
 return <div className={styles.decor} data-style={theme} aria-hidden="true">
  {theme==='vegas'?<><div className={styles.marquee}/><span className={styles.star}>✦</span><span className={styles.smallStar}>✧</span><div className={styles.velvet}/></>:theme==='mixtape'?<><div className={styles.stripes}/><svg className={styles.cassette} viewBox="0 0 240 150"><rect x="6" y="6" width="228" height="138" rx="17" fill="#3c244b" stroke="#e8a5a9" strokeWidth="4"/><rect x="24" y="23" width="192" height="85" rx="8" fill="#eda678"/><rect x="45" y="44" width="150" height="45" rx="22" fill="#422b53"/><circle cx="69" cy="66" r="14" fill="#f4c9a3"/><circle cx="171" cy="66" r="14" fill="#f4c9a3"/><path d="M69 66H171M52 132L62 109H178L188 132Z" fill="none" stroke="#e8a5a9" strokeWidth="4"/><path d="M28 123H39M201 123H212" stroke="#e8a5a9" strokeWidth="4"/></svg></>:<><div className={styles.brandArc}/><div className={styles.brandLine}/></>}
 </div>;
}
