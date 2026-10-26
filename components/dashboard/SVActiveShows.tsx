'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type OpenShow = { id: string; name: string | null; venue: string | null; created_at: string | null };
export default function SVActiveShows({ accountId }: { accountId: string }) {
 const [shows, setShows] = useState<OpenShow[]>([]);
 const [error, setError] = useState(false);
 useEffect(() => {
  let alive = true; let sequence = 0;
  async function refresh() {
   const request = ++sequence;
   const { data, error } = await supabase.from('events').select('id,name,venue,created_at')
    .eq('account_id', accountId).eq('is_show_ended', false).eq('is_archived', false)
    .order('created_at', { ascending: false });
   if (!alive || request !== sequence) return;
   if (error) { setError(true); return; }
   setShows((data || []) as OpenShow[]); setError(false);
  }
  void refresh();
  const channel = supabase.channel('host-home-open-shows-' + accountId)
   .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: 'account_id=eq.' + accountId }, () => { void refresh(); }).subscribe();
  const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 30000);
  const focus = () => { void refresh(); }; window.addEventListener('focus', focus);
  return () => { alive = false; ++sequence; window.clearInterval(timer); window.removeEventListener('focus', focus); void supabase.removeChannel(channel); };
 }, [accountId]);
 if (!shows.length && !error) return null;
 return <section aria-label="Open shows" style={{margin:'24px 0'}}>
  <div className="sv-host-home-section-heading"><div><span>Ready to manage</span><h2>Open Shows</h2></div><strong>{shows.length}</strong></div>
  <p style={{color:'#a9bbd0',margin:'0 0 14px'}}>Return to a show, or close one you left open.</p>
  {error && <p role="status" style={{color:'#fbbf24'}}>Could not refresh open shows. Try reloading this page.</p>}
  <div style={{display:'grid',gap:12}}>{shows.map(show => <article key={show.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',padding:'18px 20px',border:'1px solid #28465f',borderRadius:16,background:'#0c192a'}}>
   <div><strong style={{display:'block',fontSize:18,color:'#f8fafc'}}>{show.name || 'Untitled show'}</strong><span style={{color:'#a9bbd0',fontSize:14}}>{show.venue || 'Venue not specified'}{show.created_at && !Number.isNaN(Date.parse(show.created_at)) ? ' · Created ' + new Date(show.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : ''}</span></div>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><Link href={`/host/${show.id}`} className="sv-host-home-create">Open show</Link><Link href={`/host/${show.id}#watchdog-mission-controls`} aria-label={`Go to end show controls for ${show.name || 'Untitled show'}`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'10px 16px',border:'1px solid #e45b61',borderRadius:10,color:'#ffc6c6',textDecoration:'none',fontWeight:700}}>End show →</Link></div>
  </article>)}</div>
 </section>;
}
