import { supabase } from '@/lib/supabase';
export async function searchHostCatalog(eventId:string,query:string,limit=25):Promise<{configured:boolean;songs:{title:string;artist:string}[]}> {
 const {data,error}=await supabase.rpc('search_show_host_catalog',{p_event_id:eventId,p_query:query,p_limit:limit});
 if(error){if(error.code==='PGRST202'||error.code==='42883')return {configured:false,songs:[]};throw error;}
 if(!data||typeof data.configured!=='boolean'||!Array.isArray(data.songs))throw Error('Unable to read the host catalog.');
 return data;
}
