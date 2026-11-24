import styles from './StageThemeDecor.module.css';
export default function StageThemeDecor({theme}:{theme:string}) {
 if(theme==='holiday') return <HolidayDecor/>;
 if(!['vegas','mixtape','venue'].includes(theme))return null;
 return <div className={styles.decor} data-style={theme} aria-hidden="true">
  {theme==='vegas'?<><div className={styles.marquee}/><span className={styles.star}>✦</span><span className={styles.smallStar}>✧</span><div className={styles.velvet}/></>:theme==='mixtape'?<><div className={styles.stripes}/><svg className={styles.cassette} viewBox="0 0 240 150"><rect x="6" y="6" width="228" height="138" rx="17" fill="#3c244b" stroke="#e8a5a9" strokeWidth="4"/><rect x="24" y="23" width="192" height="85" rx="8" fill="#eda678"/><rect x="45" y="44" width="150" height="45" rx="22" fill="#422b53"/><circle cx="69" cy="66" r="14" fill="#f4c9a3"/><circle cx="171" cy="66" r="14" fill="#f4c9a3"/><path d="M69 66H171M52 132L62 109H178L188 132Z" fill="none" stroke="#e8a5a9" strokeWidth="4"/><path d="M28 123H39M201 123H212" stroke="#e8a5a9" strokeWidth="4"/></svg></>:<><div className={styles.brandArc}/><div className={styles.brandLine}/></>}
 </div>;
}

const lightColors = ['#ffd78b', '#ff7789', '#89e7c5', '#a7dcff'];
const snowflakes = [
 [21,15,18],[345,12,12],[521,7,9],[963,14,14],[1182,10,10],
 [25,31,9],[325,33,26],[371,51,11],[468,28,11],[748,23,8],[1065,29,13],[1167,31,28],
 [15,63,13],[311,64,11],[388,69,9],[645,70,9],[1059,62,12],[1177,58,18],
 [153,87,20],[289,83,14],[438,87,13],[605,89,10],[906,84,17],[1124,78,28],[1186,82,10],
];

function HolidayDecor() {
 return <div className={styles.decor} aria-hidden="true">
  <div className={styles.holidaySnow}>
   {snowflakes.map(([x,y,size])=><svg key={x} viewBox="-12 -12 24 24"
    style={{left:`${x/12}%`,top:`${y}%`,width:`clamp(7px, ${size/14}vw, ${size*1.5}px)`}}>
    <path d="M-10 0H10M-5-8.66L5 8.66M-5 8.66L5-8.66M-7-3L-4 0L-7 3M7-3L4 0L7 3M-6-5L-2-3.46L-1-7M6 5L2 3.46L1 7M-6 5L-2 3.46L-1 7M6-5L2-3.46L1-7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
   </svg>)}
  </div>
  <svg className={styles.holidayLights} viewBox="0 0 1200 36" preserveAspectRatio="none">
   <path d="M0 2Q120 25 240 2Q360 25 480 2Q600 25 720 2Q840 25 960 2Q1080 25 1200 2" fill="none" stroke="#8aa99a" strokeOpacity=".55"/>
   {Array.from({length:30},(_,i)=>{
    const x=20+i*40;
    const t=(x%240)/240;
    const y=2+46*t*(1-t);
    return <ellipse key={x} cx={x} cy={y+3} rx="2.5" ry="3.8" fill={lightColors[i%lightColors.length]}/>;
   })}
  </svg>
  <svg className={styles.holidayBanks} viewBox="0 0 1200 180" preserveAspectRatio="none">
   <path d="M0 145Q120 125 271 157T590 166Q745 168 906 144T1200 123V180H0Z" fill="#8fbed9" opacity=".16"/>
   <path d="M0 161Q140 150 320 171T730 175Q930 166 1020 159T1200 147V180H0Z" fill="#c7e4f3" opacity=".17"/>
  </svg>
  <svg className={styles.holidayTrees} viewBox="0 0 250 260">
   {[[12,76,.61],[148,50,.74],[65,16,1]].map(([x,y,scale],index)=><g key={x} transform={`translate(${x} ${y}) scale(${scale})`} opacity={index===2?.9:.55}>
    <path d="M65 8L30 78H45L16 130H34L0 194H58V218H72V194H130L96 130H114L85 78H100Z" fill="#175851"/>
    <path d="M65 8L30 78Q50 80 70 63L100 78ZM45 78L16 130Q48 133 76 112L114 130L85 78Q70 102 45 78ZM34 130L0 194Q43 193 76 169L130 194L96 130Q72 155 34 130Z" fill="#cdeaf4" opacity=".74"/>
    {index===2&&[[66,47],[48,88],[82,102],[39,143],[72,152],[98,164]].map(([cx,cy],i)=><circle key={cx} cx={cx} cy={cy} r="3.5" fill={lightColors[i%lightColors.length]} className={styles.treeLight}/>)}
   </g>)}
   <path d="M0 231Q115 205 250 234V260H0Z" fill="#afdbef" opacity=".29"/>
  </svg>
 </div>;
}
