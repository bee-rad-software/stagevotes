import styles from './AutumnDecor.module.css';

// Edge decorations leave the queue, QR code and central lyric area unobstructed.
export default function AutumnDecor() {
  return <div className={styles.harvest} aria-hidden="true">
    <svg className={styles.canopy} viewBox="0 0 1600 180" preserveAspectRatio="none">
      <defs>
        <path id="harvest-maple" d="M0 40 C-38 16-35-20-16-37 L-9-17 0-55 10-23 30-35 23-9 44-5 23 15 26 32 7 29Z"/>
        <path id="harvest-oak" d="M0 38 C-25 29-29 16-17 10 C-38-2-25-19-12-14 C-21-38-4-46 0-55 C4-46 21-38 12-14 C25-19 38-2 17 10 C29 16 25 29 0 38Z"/>
      </defs>
      <path d="M-20 18 Q160 55 330-8 M1270-8 Q1450 55 1620 18" fill="none" stroke="#c68b43" strokeWidth="3" opacity=".45"/>
      {[
        [12,27,-45,1.2,'#c76527'],[80,12,35,.9,'#f1b749'],[158,10,-25,.7,'#a34132'],[235,-3,55,.65,'#d5a54c'],
        [1365,0,-40,.65,'#df9f35'],[1440,12,30,.8,'#a74731'],[1510,18,-25,1,'#e8b557'],[1590,40,55,1.3,'#cf652e'],
      ].map(([x,y,angle,scale,color],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} opacity=".7"><use href={i%2?'#harvest-oak':'#harvest-maple'} fill={String(color)}/><path d="M0-32V48" stroke="#ffe2a0" strokeOpacity=".4" fill="none"/></g>)}
    </svg>
    <svg className={styles.pumpkins} viewBox="0 0 260 90">
      <g stroke="#b97d33" strokeWidth="2" opacity=".65"><path d="M0 84Q110 36 260 85M20 88L65 50M32 84L40 60M53 76L69 69M225 87L197 52M213 77L219 61" fill="none"/></g>
      <g transform="translate(65 13)"><path d="M38 20Q31 0 47 0" fill="none" stroke="#8f9860" strokeWidth="7"/><ellipse cx="39" cy="49" rx="38" ry="29" fill="#c96628"/><ellipse cx="39" cy="49" rx="25" ry="29" fill="#e88c32"/><ellipse cx="39" cy="49" rx="11" ry="29" fill="#f3aa48"/></g>
      <g transform="translate(135 36)"><path d="M27 9L32 0" stroke="#87905b" strokeWidth="6"/><ellipse cx="28" cy="28" rx="29" ry="23" fill="#c5a367"/><ellipse cx="28" cy="28" rx="13" ry="23" fill="#ebd3a1"/></g>
      <use href="#harvest-maple" transform="translate(206 68) rotate(65) scale(.4)" fill="#ac4e2b"/>
    </svg>
    <svg className={styles.turkey} viewBox="0 0 230 200">
      <g stroke="#4b261b" strokeWidth="3">
        <ellipse cx="66" cy="91" rx="19" ry="66" transform="rotate(-55 66 91)" fill="#a74b30"/>
        <ellipse cx="82" cy="70" rx="20" ry="66" transform="rotate(-30 82 70)" fill="#d28132"/>
        <ellipse cx="115" cy="63" rx="20" ry="60" fill="#e6b54c"/>
        <ellipse cx="147" cy="70" rx="20" ry="66" transform="rotate(30 147 70)" fill="#d28132"/>
        <ellipse cx="166" cy="91" rx="19" ry="66" transform="rotate(55 166 91)" fill="#a74b30"/>
      </g>
      <path d="M97 169L92 189M133 169L138 189M82 192L93 187 104 193M127 193L138 187 149 192" fill="none" stroke="#e9a344" strokeWidth="5" strokeLinecap="round"/>
      <ellipse cx="115" cy="130" rx="48" ry="49" fill="#70432b"/>
      <path d="M79 121Q68 162 111 155Q91 145 79 121" fill="#9f6740"/>
      <ellipse cx="126" cy="92" rx="24" ry="34" fill="#ad7042"/>
      <circle cx="131" cy="67" r="22" fill="#c7935e"/>
      <path d="M148 68L170 77 147 83" fill="#f4bd4e"/>
      <path d="M144 77Q159 88 149 103Q134 99 143 81" fill="#b84332"/>
      <circle cx="136" cy="61" r="6" fill="#fff1d3"/><circle cx="138" cy="62" r="3" fill="#291b14"/>
    </svg>
  </div>;
}
