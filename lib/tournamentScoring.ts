export type PointCategory={name:string;maxPoints:number};
export const defaultPointCategories:PointCategory[]=[{name:'Vocal ability',maxPoints:40},{name:'Stage presence',maxPoints:30},{name:'Song interpretation',maxPoints:30}];
export function validatePointCategories(value:unknown):PointCategory[]{
 if(!Array.isArray(value)||!value.length||value.length>12)throw Error('Add between 1 and 12 categories.');
 const result=value.map(c=>({name:typeof c?.name==='string'?c.name.trim():'',maxPoints:Number(c?.maxPoints)}));
 if(result.some(c=>!c.name||c.name.length>80||!Number.isInteger(c.maxPoints)||c.maxPoints<1||c.maxPoints>100))throw Error('Each category needs a name and a whole-number maximum from 1 to 100.');
 if(new Set(result.map(c=>c.name.toLowerCase())).size!==result.length)throw Error('Category names must be unique.');
 if(result.reduce((sum,c)=>sum+c.maxPoints,0)!==100)throw Error('Category maximums must total exactly 100 points.');
 return result;
}
