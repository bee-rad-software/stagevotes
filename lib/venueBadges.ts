export const badgeRules = {manual:'Host awards manually',song:'Complete a song here',five_shows:'Sing in five shows here',contest_entry:'Approved contest entry here'} as const;
export type BadgeRule=keyof typeof badgeRules;
export type VenueBadgeDesign={title:string;description:string;icon:string;color:string;artwork_path:string|null;rule:BadgeRule;is_active:boolean};
export type VenueBadgeAward={id:string;title:string;description:string;icon:string;color:string;artwork_path:string|null;venue_name:string;singer_name:string;singer_profile_id:string;event_id:string|null;performance_id:string|null;earned_at:string;artworkUrl?:string|null};
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function badgeDesign(input:unknown,prefix:string):VenueBadgeDesign{
 if(!input||typeof input!=='object')throw Error('Enter a badge design.');
 const b=input as Record<string,unknown>;
 const text=(key:string,max:number,required=false)=>{const value=b[key];if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw Error(`Check the badge ${key}.`);return value.trim();};
 const title=text('title',60,true),description=text('description',280),icon=text('icon',24,true),color=text('color',7,true);
 if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('Choose a valid badge color.');
 if(typeof b.rule!=='string'||!Object.hasOwn(badgeRules,b.rule))throw Error('Choose how the badge is earned.');
 if(typeof b.is_active!=='boolean')throw Error('Choose whether the badge is active.');
 const path=b.artwork_path;
 if(path!==null&&(typeof path!=='string'||!path.startsWith(prefix+'/')||!new RegExp('^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+\\.webp$','i').test(path)))throw Error('Upload artwork for this venue.');
 return {title,description,icon,color,artwork_path:path as string|null,rule:b.rule as BadgeRule,is_active:b.is_active};
}
export function canManageBadges(role:string){return ['owner','admin','host'].includes(role);}
