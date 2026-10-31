import {buildRotationQueue} from './rotationQueue';
import type {RotationPerformance} from './rotationQueue';
export function selectSpotlightSinger<T extends RotationPerformance>(rows:T[],currentId:string|null|undefined,lastPlayedId:string|null,betweenSongs:boolean):T|undefined {
 const queue=buildRotationQueue(rows.filter(row=>row.status!=='removed'),currentId);
 const current=queue.find(row=>row.id===currentId);
 // After auto-advance, the current row is the upcoming performer. Before
 // auto-advance, skip the person whose song just finished.
 if(betweenSongs&&current&&current.id!==lastPlayedId)return current;
 return queue.find(row=>row.id!==currentId);
}
