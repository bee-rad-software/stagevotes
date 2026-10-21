'use client';
import {useEffect,useRef,useState} from 'react';
import {Share2,Download,X} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {renderShowMemory,uniqueMemoryBadges,type ShowMemory} from '@/lib/showMemoryCard';
import styles from './SVShareMyNight.module.css';
type Night={eventId:string;name:string;venueName:string;date:string};
type Photo={id:string;url:string;caption:string};
export default function SVShareMyNight({night}:{night:Night}){
 const dialog=useRef<HTMLDialogElement>(null),[memory,setMemory]=useState<ShowMemory|null>(null),[photos,setPhotos]=useState<Photo[]>([]),[profilePhoto,setProfilePhoto]=useState(''),[photo,setPhoto]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[image,setImage]=useState<Blob|null>(null),[preview,setPreview]=useState('');
 useEffect(()=>{if(!image){setPreview('');return;}const url=URL.createObjectURL(image);setPreview(url);return()=>URL.revokeObjectURL(url);},[image]);
 async function open(){
  dialog.current?.showModal();setBusy(true);setError('');setNotice('');setImage(null);setMemory(null);setPhotos([]);setPhoto('');setProfilePhoto('');
  try{
   const {data:{user}}=await supabase.auth.getUser();const device=localStorage.getItem('karavote_device_id');
   const profileResult=user?await supabase.from('singer_profiles').select('id,stage_name,display_name,photo_url').eq('user_id',user.id).maybeSingle():{data:null,error:null};if(profileResult.error)throw Error('Could not load your singer profile.');const profile=profileResult.data;
   if(!profile?.id&&!device)throw Error('Open My History on the device you used to sing, or sign in to your singer account.');
   const queries=[];const columns='id,singer_name,song_title,artist,completed_at,created_at';
   if(profile?.id)queries.push(supabase.from('performances').select(columns).eq('event_id',night.eventId).eq('status','completed').eq('singer_profile_id',profile.id));
   if(device)queries.push(supabase.from('performances').select(columns).eq('event_id',night.eventId).eq('status','completed').eq('device_id',device));
   const results=await Promise.all(queries);if(results.some(r=>r.error))throw Error('Could not load your songs.');
   const songs=[...new Map(results.flatMap(r=>r.data||[]).map(p=>[p.id,p])).values()].sort((a,b)=>(a.completed_at||a.created_at).localeCompare(b.completed_at||b.created_at));
   if(!songs.length)throw Error('No completed songs found for you at this show.');
   const badgeResponse=await fetch(`/api/shows/${night.eventId}/badges`,{cache:'no-store'});if(!badgeResponse.ok)throw Error('Could not load badges. Please try again so your card includes the right achievements.');
   const payload=await badgeResponse.json();if(!Array.isArray(payload.badges))throw Error('Could not load badges. Please try again.');const ids=new Set(songs.map(s=>s.id));
   const badges=uniqueMemoryBadges(payload.badges.filter((b:{performanceId:string})=>ids.has(b.performanceId)));
   setMemory({singer:profile?.stage_name||profile?.display_name||songs[0].singer_name,show:night.name,venue:night.venueName,date:night.date,url:`https://app.stagevotes.com/shows/${night.eventId}`,songs:songs.map(s=>({id:s.id,title:s.song_title||'Untitled song',artist:s.artist||''})),badges});
   setProfilePhoto(profile?.photo_url||'');setPhoto(profile?.photo_url||'');
   const gallery=await fetch(`/api/events/${night.eventId}/photos`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
   setPhotos((gallery?.photos||[]).filter((p:{status:string})=>p.status==='approved'));
  }catch(e){setError(e instanceof Error?e.message:'Could not create your memory card.');}finally{setBusy(false);}
 }
 async function generate(){if(!memory)return;setBusy(true);setError('');setNotice('');try{setImage(await renderShowMemory(memory,photo||undefined));}catch(e){setError(e instanceof Error?e.message:'Could not generate image.');}finally{setBusy(false);}}
 async function share(){if(!image||!memory)return;const file=new File([image],'stagevotes-my-night.png',{type:'image/png'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'My night on StageVotes',text:`${memory.singer} at ${memory.venue} — ${memory.url}`});}else if(navigator.share){await navigator.share({title:'My night on StageVotes',text:`My night at ${memory.venue}`,url:memory.url});setNotice('Recap shared. Use Save Image to download the card.');}else{await navigator.clipboard.writeText(memory.url);setNotice('Recap link copied. Use Save Image to download the card.');}}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError('Sharing is unavailable here. Use Save Image or copy the recap link.');}}
 return <><button type="button" className={styles.launch} onClick={()=>void open()}><Share2 size={16}/>Share My Night</button>
 <dialog ref={dialog} className={styles.dialog}><div className={styles.head}><h2>Share My Night</h2><button type="button" aria-label="Close memory card" onClick={()=>dialog.current?.close()}><X size={20}/></button></div>
 <p className={styles.hint}>Create a keepsake with your songs and badges from {night.venueName}. Only share photos you have permission to use. Nothing is posted automatically.</p>
 {busy&&!memory&&<p role="status">Finding your songs and badges…</p>}
 {memory&&<><label className={styles.label}>Card photo<select disabled={busy} value={photo} onChange={e=>{setPhoto(e.target.value);setImage(null);setError('');}}><option value="">No photo · StageVotes design</option>{profilePhoto&&<option value={profilePhoto}>My profile photo</option>}{photos.map((p,i)=><option key={p.id} value={p.url}>Show photo {i+1}{p.caption?` · ${p.caption.slice(0,45)}`:''}</option>)}</select></label>
 {photo&& !preview&&<img className={styles.photo} src={photo} alt="Selected photo for your card"/>}
 <p className={styles.hint}>{memory.songs.length} songs · {memory.badges.length} badges earned. Photos are cropped to fit; preview before sharing.</p>
 <button type="button" className={styles.primary} disabled={busy} onClick={()=>void generate()}>{busy?'Creating…':image?'Rebuild card':'Create card'}</button>
 {preview&&<><img className={styles.preview} src={preview} alt={`Memory card for ${memory.singer} at ${memory.venue}`}/><div className={styles.actions}><a href={preview} download="stagevotes-my-night.png"><Download size={16}/>Save Image</a><button type="button" onClick={()=>void share()}><Share2 size={16}/>Share</button></div><p className={styles.hint}>On iPhone, use Share → Save Image to save to Photos. The recap link is included when sharing; the image also displays it.</p><a className={styles.link} href={memory.url} target="_blank" rel="noopener noreferrer">Open show recap</a></>}
 </>}{error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status">{notice}</p>}
 </dialog></>;
}
