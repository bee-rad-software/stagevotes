'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {parseCatalogCsv,type CatalogSong} from '@/lib/catalogCsv';
export default function HostCatalog({accountId}:{accountId:string}) {
 const [count,setCount]=useState<number|null>(null),[songs,setSongs]=useState<CatalogSong[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const {data,error}=await supabase.rpc('host_song_catalog_count',{p_account_id:accountId});if(error)setMessage('Catalog setup is not installed yet. Ask your administrator to apply the catalog update.');else setCount(Number(data));}
 useEffect(()=>{if(accountId)void load();},[accountId]);
 async function selectFile(file:File|undefined){setSongs([]);setMessage('');if(!file)return;try{if(file.size>8*1024*1024)throw Error('Choose a CSV smaller than 8 MB.');const parsed=parseCatalogCsv(await file.text());setSongs(parsed);setMessage(`${parsed.length.toLocaleString()} unique songs ready to upload.`);}catch(e){setMessage(e instanceof Error?e.message:'Unable to read this file.');}}
 async function upload(){if(!songs.length||busy)return;if(count&& !confirm(`Replace all ${count.toLocaleString()} songs in your current catalog with this file?`))return;setBusy(true);const {data,error}=await supabase.rpc('replace_host_song_catalog',{p_account_id:accountId,p_songs:songs});if(error)setMessage(error.message||'Upload failed. Your previous catalog was kept.');else{setSongs([]);setCount(Number(data));setMessage(`Saved ${Number(data).toLocaleString()} songs.`);}setBusy(false);}
 async function clear(){if(busy||!confirm('Remove this song catalog? Shows without KaraFun will use the StageVotes song list again.'))return;setBusy(true);const {error}=await supabase.rpc('clear_host_song_catalog',{p_account_id:accountId});if(error)setMessage(error.message);else{setCount(0);setSongs([]);setMessage('Catalog removed.');}setBusy(false);}
 return <section style={{margin:'24px 0',padding:24,border:'1px solid #334155',borderRadius:18,background:'#111c2e',color:'#f8fafc'}}>
  <h2 style={{marginTop:0}}>Your music catalog</h2><p>Using another karaoke player? Upload your song list so singers and hosts can search the songs you have. KaraFun remains the source when a KaraFun channel is configured.</p>
  <p style={{color:'#cbd5e1'}}>Upload a CSV with <strong>Title</strong> and <strong>Artist</strong> columns. Optional: <strong>Explicit</strong> (1/0 or yes/no). Commas or semicolons are supported. Maximum 20,000 songs.</p>
  <p style={{color:'#cbd5e1'}}>Current catalog: {count===null?'checking…':`${count.toLocaleString()} songs`}</p>
  <label>Choose CSV <input type="file" accept=".csv,text/csv" disabled={busy} onChange={e=>{void selectFile(e.target.files?.[0]);e.target.value='';}} /></label>
  {songs.length>0&&<div style={{marginTop:14}}><strong>Preview</strong>{songs.slice(0,3).map((song,i)=><p key={i} style={{margin:'5px 0'}}>{song.title} — {song.artist}</p>)}<button type="button" className="btn" disabled={busy} onClick={()=>void upload()}>{busy?'Saving…':count?'Replace catalog':'Upload catalog'}</button></div>}
  {count!==null&&count>0&&<p><button type="button" className="btn" disabled={busy} onClick={()=>void clear()}>Remove catalog</button></p>}
  <p style={{color:'#cbd5e1'}}>If explicit-song filtering is enabled, songs without an explicit rating are hidden.</p>{message&&<p role="status">{message}</p>}
 </section>;
}
