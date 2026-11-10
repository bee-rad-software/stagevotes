export function tonightStats(rows:{status:string;singer_name:string;singer_profile_id?:string|null;duet_partner_name?:string|null}[]) {
 const completed=rows.filter(r=>r.status==='completed');
 const profiles=new Map(rows.filter(r=>r.singer_profile_id).map(r=>[r.singer_name.trim().toLocaleLowerCase(),r.singer_profile_id!]));
 const key=(name:string)=>profiles.has(name.trim().toLocaleLowerCase())?'profile:'+profiles.get(name.trim().toLocaleLowerCase()):'name:'+name.trim().toLocaleLowerCase();
 const singers=new Set<string>();
 for(const row of completed){singers.add(row.singer_profile_id?'profile:'+row.singer_profile_id:key(row.singer_name));if(row.duet_partner_name?.trim())singers.add(key(row.duet_partner_name));}
 return {songs:completed.length,singers:singers.size};
}
export function validPromotions(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=3&&value.every(p=>typeof p==='string'&&p.length<=160);}
