export function venueInput(value:unknown):{name:string;city:string|null;state:string|null}|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>120)return null;
 for(const [field,max]of [['city',100],['state',50]] as const){if(v[field]!==undefined&&(typeof v[field]!=='string'||(v[field] as string).trim().length>max))return null;}
 return{name:v.name.trim(),city:typeof v.city==='string'?v.city.trim()||null:null,state:typeof v.state==='string'?v.state.trim()||null:null};
}
