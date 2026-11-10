export type HighlightBadge={id:string;singer:string;title:string;icon:string};
export type Highlight={kind:'badge';badge:HighlightBadge}|{kind:'shoutout';text:string}|{kind:'signup'}|{kind:'applause'};
export function chooseStageHighlight(badges:HighlightBadge[],seen:string[],shoutouts:string[],signupOpen:boolean,turn:number):Highlight {
 const pending=badges.filter(b=>!seen.includes(b.id));
 const cards:Highlight[]=[...(pending.length?[{kind:'badge' as const,badge:pending[pending.length-1]}]:[]),...shoutouts.filter(s=>s.trim()).map(text=>({kind:'shoutout' as const,text})),...(signupOpen?[{kind:'signup' as const}]:[])];
 return cards.length?cards[Math.abs(Math.floor(turn))%cards.length]:{kind:'applause'};
}
