'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import {useParams,useRouter} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import {supabase} from '@/lib/supabase';
import SVShell from '@/components/ui/SVShell';
import {contestRanking,type SideContest} from '@/lib/sideContest';
import styles from '@/components/contest/SideContest.module.css';

export default function HostSideContest() {
 const {eventId}=useParams<{eventId:string}>();
 const router=useRouter();
 const [contest,setContest]=useState<SideContest|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [title,setTitle]=useState('Halloween Costume Contest');
 const [mode,setMode]=useState<'overall'|'categories'>('overall');
 const [categoryText,setCategoryText]=useState('Funniest\nScariest\nBest Couple');
 const [name,setName]=useState('');
 const [costume,setCostume]=useState('');
 const [photo,setPhoto]=useState<File|null>(null);
 const [fileKey,setFileKey]=useState(0);
 const [origin,setOrigin]=useState('');
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  setOrigin(window.location.origin);
  let active=true;
  async function init() {
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.push('/login');return;}
   const {data,error}=await supabase.rpc('get_show_side_contest',{p_event_id:eventId});
   if(!active)return;
   if(error) {
    setMessage(['PGRST202','42883'].includes(error.code)?'The contest database update needs to be installed before setup.':'Unable to load contest: '+error.message);
   } else {setContest(data);setReady(true);}
   setLoading(false);
  }
  init();
  const timer=setInterval(async()=>{
   const {data,error}=await supabase.rpc('get_show_side_contest',{p_event_id:eventId});
   if(active&&!error)setContest(data);
  },5000);
  return()=>{active=false;clearInterval(timer);};
 },[eventId,router]);
 async function action(actionName:string,data:Record<string,unknown>={}) {
  const result=await supabase.rpc('manage_side_contest',{p_event_id:eventId,p_action:actionName,p_data:data});
  if(result.error)throw result.error;
  const refresh=await supabase.rpc('get_show_side_contest',{p_event_id:eventId});
  if(refresh.error)throw refresh.error;
  setContest(refresh.data);
 }
 async function run(actionName:string,data:Record<string,unknown>={}) {
  if(busy)return;
  setBusy(true);setMessage('');
  try{await action(actionName,data);setMessage('Contest updated.');}
  catch(error:any){setMessage(error.message||'Unable to update contest.');}
  finally{setBusy(false);}
 }
 async function create(e:React.FormEvent) {
  e.preventDefault();
  const categories=categoryText.split('\n').map(c=>c.trim()).filter(Boolean);
  if(mode==='categories'&&(categories.length<1||categories.length>10||new Set(categories.map(c=>c.toLowerCase())).size!==categories.length)){
   setMessage('Enter one to ten different category names, one per line.');return;
  }
  await run('create',{title:title.trim(),mode,categories});
 }
 async function addEntry(e:React.FormEvent) {
  e.preventDefault();if(busy)return;
  setBusy(true);setMessage('');
  try{
   let photoUrl:string|null=null;
   if(photo) {
    if(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>5*1024*1024)throw new Error('Choose a JPG, PNG, or WebP photo under 5 MB.');
    const ext=photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg';
    const path=eventId+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await supabase.storage.from('contest-photos').upload(path,photo,{contentType:photo.type,upsert:false});
    if(error)throw error;
    photoUrl=supabase.storage.from('contest-photos').getPublicUrl(path).data.publicUrl;
   }
   await action('add_entry',{name:name.trim(),costume:costume.trim(),photo_url:photoUrl});
   setName('');setCostume('');setPhoto(null);setFileKey(k=>k+1);
   setMessage('Contestant added.');
  }catch(error:any){setMessage(error.message||'Unable to add contestant.');}
  finally{setBusy(false);}
 }
 const voteUrl=contest&&origin?origin+'/contest/'+contest.id:'';
 const displayUrl=contest&&origin?origin+'/contest/'+contest.id+'/display':'';
 return <SVShell title="People’s Choice Contest" subtitle="Run a separate contest alongside karaoke">
  <div className={styles.wrap}>
   <Link className={styles.secondary} href={'/host/'+eventId}>← Back to karaoke</Link>
   <div className={styles.hero}><span className={styles.kicker}>Contest control</span><h1>{contest?.title||'Add a People’s Choice contest'}</h1>
    <p>Karaoke continues independently. These contestants and votes do not affect the singer queue or karaoke scores.</p>
   </div>
   {message&&<div className={styles.message} role="status">{message}</div>}
   {loading?<p>Loading…</p>:!contest?<form className={styles.card} onSubmit={create}>
    <label className={styles.field}><span>Contest name</span><input className={styles.input} required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label className={styles.field}><span>Winner options</span><select className={styles.input} value={mode} onChange={e=>setMode(e.target.value as 'overall'|'categories')}>
     <option value="overall">One overall winner</option><option value="categories">Category winners</option>
    </select></label>
    {mode==='categories'&&<label className={styles.field}><span>Categories · one per line</span><textarea className={styles.input} rows={5} value={categoryText} onChange={e=>setCategoryText(e.target.value)} /></label>}
    <p className={styles.muted}>One vote per device{mode==='categories'?' in each category':''}. All contestants are eligible in every category. Configure categories and contestants before opening voting.</p>
    <button className={styles.button} disabled={busy||!ready}>{busy?'Creating…':'Create contest'}</button>
   </form>:<>
    <section className={styles.card}><h2>Voting controls</h2><p>Status: <strong>{contest.status==='draft'?'Setup':contest.status==='open'?'Voting open':'Voting closed'}</strong></p>
     <div className={styles.row}>
      {contest.status!=='open'&&<button className={styles.button} disabled={busy||!contest.entries.length} onClick={()=>{if(contest.status==='closed'&&!window.confirm('Reopen voting? Existing votes stay locked and new guests can vote. Results will be hidden again.'))return;run('open');}}>{contest.status==='closed'?'Reopen voting':'Open voting'}</button>}
      {contest.status==='open'&&<button className={styles.button} disabled={busy} onClick={()=>run('close')}>Close voting</button>}
      {contest.status==='closed'&&<button className={styles.secondary} disabled={busy} onClick={()=>run('reveal',{visible:!contest.results_visible})}>{contest.results_visible?'Hide results':'Reveal results'}</button>}
      <a className={styles.secondary} href={displayUrl} target="_blank" rel="noreferrer">Open results display</a>
     </div>
     <p className={styles.muted}>Closing karaoke does not close this contest. Close contest voting here when you are ready. Tied leaders are shown as a tie.</p>
    </section>
    <section className={styles.card}><h2>Costume voting QR code</h2><p>Use this QR code for the contest. Keep using your existing karaoke signup QR code for singers.</p>
     <div className={styles.row}>{voteUrl&&<div className={styles.qr}><QRCodeSVG value={voteUrl} size={190}/></div>}
      <div><a className={styles.secondary} href={voteUrl} target="_blank" rel="noreferrer">Open voting page</a>
       <p style={{overflowWrap:'anywhere'}}>{voteUrl}</p>
       <button className={styles.secondary} onClick={async()=>{try{await navigator.clipboard.writeText(voteUrl);setMessage('Voting link copied.');}catch{setMessage('Copy the voting link shown above.');}}}>Copy link</button>
      </div>
     </div>
    </section>
    {contest.status==='draft'&&<form className={styles.card} onSubmit={addEntry}><h2>Add contestant</h2>
     <label className={styles.field}><span>Name</span><input className={styles.input} required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
     <label className={styles.field}><span>Costume description (optional)</span><input className={styles.input} maxLength={200} value={costume} onChange={e=>setCostume(e.target.value)}/></label>
     <label className={styles.field}><span>Photo (optional) · JPG, PNG, WebP, under 5 MB</span><input key={fileKey} className={styles.input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
     <p className={styles.muted}>Contestant numbers are assigned automatically. Photos appear on the public voting page.</p>
     <button className={styles.button} disabled={busy}>{busy?'Saving…':'Add contestant'}</button>
    </form>}
    <section className={styles.card}><h2>Contestants · {contest.entries.length}</h2>
     {contest.status!=='draft'&&<p>Contestants are locked because voting has started.</p>}
     <div className={styles.grid}>{contest.entries.map(entry=><article className={styles.entry} key={entry.id}>
      {entry.photo_url&&<img className={styles.photo} src={entry.photo_url} alt={entry.name+' costume'}/>}
      <h3>#{entry.number} · {entry.name}</h3><p>{entry.costume}</p>
      {contest.status==='draft'&&<button className={styles.secondary} disabled={busy} onClick={()=>run('remove_entry',{entry_id:entry.id})}>Remove</button>}
     </article>)}</div>
    </section>
    <section className={styles.card}><h2>Host vote totals</h2><p className={styles.muted}>Guests only see these totals after voting closes and you reveal results.</p>
     {contest.categories.map(category=><div key={category.id}><h3>{category.name}</h3>{contestRanking(contest,category.id).map(r=><div className={styles.result} key={r.id}><span>#{r.number} {r.name}</span><strong>{r.votes} votes</strong></div>)}</div>)}
    </section>
   </>}
  </div>
 </SVShell>;
}
