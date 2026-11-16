export type BreakMusicState = { armed: boolean; blocked: boolean; between: boolean };
export const initialBreakMusicState: BreakMusicState = { armed: false, blocked: true, between: false };

// 4 = playing, 5 = paused, 3 = loaded/ready. Unknown/offline states fail silent.
// A ready state is a break only after playback has actually been observed.
export function updateBreakMusicState(previous: BreakMusicState, online: boolean, state: number | null): BreakMusicState {
  if (!online) return initialBreakMusicState;
  if (state === 4) return { armed: true, blocked: true, between: false };
  if (state === 5) return { armed: previous.armed, blocked: true, between: false };
  if (state === 3) return { armed: previous.armed, blocked: false, between: previous.armed };
  // Loading/transient states must stay silent without forgetting the performance.
  // Otherwise playing -> loading -> ready loses the automatic handoff.
  return { armed: previous.armed, blocked: true, between: false };
}

export function nextBreakTrack(index: number, count: number, shuffle: boolean, random = Math.random): number {
  if (count < 2) return 0;
  if (!shuffle) return (index + 1) % count;
  return (index + 1 + Math.floor(random() * (count - 1))) % count;
}

/** Plan one break handoff; explicit track choices always start from the beginning. */
export function breakTrackPlayback(index:number,count:number,shuffle:boolean,pendingSinger:boolean,hasPlayed:boolean,explicit?:number,random=Math.random):{index:number;restart:boolean} {
 if(explicit!==undefined)return {index:explicit,restart:true};
 if(pendingSinger&&hasPlayed)return {index:nextBreakTrack(index,count,shuffle,random),restart:true};
 return {index,restart:false};
}

/** Choose uniformly from unheard tracks; begin a new round only when exhausted. */
export function unplayedBreakTrack(index:number,count:number,played:ReadonlySet<number>,random=Math.random):{index:number;newRound:boolean} {
 if(count<1)return {index:0,newRound:false};
 let candidates=Array.from({length:count},(_,i)=>i).filter(i=>!played.has(i));
 const newRound=candidates.length===0;
 if(newRound)candidates=Array.from({length:count},(_,i)=>i).filter(i=>count===1||i!==index);
 return {index:candidates[Math.min(candidates.length-1,Math.floor(Math.max(0,random())*candidates.length))],newRound};
}

/** Pre-show queue loading must not interrupt music the host started manually. */
export function shouldSilenceBreakMusic(previous:BreakMusicState,next:BreakMusicState,online:boolean,state:number|null,ended:boolean):boolean {
 return ended || (online&&(state===4||state===5)) || (next.blocked&&(previous.armed||next.armed));
}
