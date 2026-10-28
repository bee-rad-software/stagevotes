'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {contestRanking,type SideContest} from '@/lib/sideContest';
export default function ContestHistory({eventId}:{eventId:string}) {
 const [contest,setContest]=useState<SideContest|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setContest(null);setError('');supabase.rpc('get_show_side_contest',{p_event_id:eventId}).then(({data,error})=>{if(!active)return;if(error)setError('Unable to load the secondary contest. Please refresh.');else setContest(data);});return()=>{active=false;};},[eventId]);
 if(error)return <section className="sv-card" style={{padding:24,marginBottom:20}} role="alert">{error}</section>;
 if(!contest)return null;
 return <section className="sv-card" style={{padding:24,marginBottom:20}} aria-label="Secondary contest history">
 <h2>🏆 {contest.title}</h2><p>{contest.entries.length} contestants · {contest.status==='closed'?'Voting closed':contest.status==='open'?'Voting open · Results are provisional':'Voting has not opened'}</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:16}}>{contest.entries.map(entry=><article key={entry.id} style={{border:'1px solid #334155',borderRadius:14,padding:14}}>
 {entry.photo_url&&<img src={entry.photo_url} alt={entry.name+' costume'} style={{width:'100%',height:210,objectFit:'contain',borderRadius:10,background:'#07111f'}}/>}
 <h3>#{entry.number} · {entry.name}</h3><p>{entry.costume}</p></article>)}</div>
 {contest.pending_entries?.length ? <p>{contest.pending_entries.length} entries awaiting approval</p>:null}
 {contest.counts && contest.categories.map(category=><div key={category.id} style={{marginTop:20}}><h3>{category.name}</h3>
 {contestRanking(contest,category.id).filter(row=>row.votes>0).map(row=><p key={row.id}>{contest.status==='closed'?'#'+row.rank+' · ':''}{row.name} · {row.votes} vote{row.votes===1?'':'s'}{contest.status==='closed'&&contestRanking(contest,category.id).filter(other=>other.rank===row.rank).length>1?' · Tie':''}</p>)}
 {!contestRanking(contest,category.id).some(row=>row.votes>0)&&<p>No votes recorded.</p>}</div>)}
 </section>;
}
