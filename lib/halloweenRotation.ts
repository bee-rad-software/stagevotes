/** Each completed slide cycle advances the costume, regardless of optional cards. */
export function halloweenCostumeIndex(tick:number,entryCount:number,votingOpen:boolean,hasBadge:boolean,hasNext=false):number {
 if(entryCount<1)return -1;
 const slideCount=2+Number(votingOpen)+Number(hasBadge)+Number(hasNext); // Costume + stats + optional cards.
 return Math.floor(tick/slideCount)%entryCount;
}
