'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import AppQRCode from '@/components/AppQRCode';
type Venue={id:string;name:string};
export default function VenueAudienceQRCodes({accountId}:{accountId:string}) {
 const [venues,setVenues]=useState<Venue[]>([]),[selected,setSelected]=useState(''),[origin,setOrigin]=useState('');
 const [flags,setFlags]=useState({signup:false,vote:false,people:false}),[error,setError]=useState('');
 useEffect(()=>{let active=true;setOrigin(window.location.origin);async function load(){
 const [v,a]=await Promise.all([supabase.from('venues').select('id,name').eq('account_id',accountId).order('name'),supabase.from('accounts').select('static_signup_qr,static_judge_qr,static_people_qr').eq('id',accountId).single()]);
 if(!active)return;if(v.error||a.error){setError('Unable to load venue QR codes. Please refresh.');return;}
 setVenues(v.data||[]);if(v.data?.length===1)setSelected(v.data[0].id);
 setFlags({signup:!!a.data.static_signup_qr,vote:!!a.data.static_judge_qr,people:!!a.data.static_people_qr});
 }void load();return()=>{active=false;};},[accountId]);
 if(error)return <p role="alert">{error}</p>;
 if(!flags.signup&&!flags.vote&&!flags.people)return null;
 const venue=venues.find(v=>v.id===selected);
 const cards=[{key:'signup',title:'Singer signup',enabled:flags.signup},{key:'vote',title:'Judge voting',enabled:flags.vote},{key:'people',title:'People’s Choice',enabled:flags.people}].filter(c=>c.enabled);
 return <section style={{marginBottom:24}}><h2>Permanent venue QR codes</h2><p>Choose a venue to share its codes, even before a show starts. Each code opens only that venue’s current show.</p>
 <label>Venue <select value={selected} onChange={e=>setSelected(e.target.value)} style={{padding:10,margin:10}}><option value="">Choose a venue</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
 {!venues.length&&<p>Add a venue in Account Settings to create its permanent codes.</p>}
 {venue&&origin&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16}}>{cards.map(c=>{const url=origin+'/go/venue/'+venue.id+'/'+c.key;return <article key={c.key} style={{padding:20,background:'#0f1a2c',border:'1px solid #334155',borderRadius:16}}><h3>{c.title}</h3><p>{venue.name}</p><div style={{background:'#fff',padding:12,width:'fit-content'}}><AppQRCode value={url} size={160}/></div><p><a href={url} target="_blank" rel="noreferrer">Open link ↗</a></p><button type="button" className="btn" onClick={()=>{void navigator.clipboard.writeText(url).catch(()=>setError('Unable to copy. Open the link and copy its address.'));}}>Copy link</button></article>;})}</div>}
 </section>;
}
