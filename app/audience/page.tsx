'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SVShell from '@/components/ui/SVShell';
import { supabase } from '@/lib/supabase';

type Show = { id: string; name: string | null; venue: string | null };

export default function AudienceLandingPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) { if (active) setMessage('Sign in to see your open shows.'); return; }
        const { data: membership, error: membershipError } = await supabase.from('account_users').select('account_id').eq('user_id', user.id).maybeSingle();
        if (membershipError) throw membershipError;
        if (!membership?.account_id) { if (active) setMessage('No StageVotes host account was found.'); return; }
        const { data, error } = await supabase.from('events').select('id,name,venue').eq('account_id', membership.account_id)
          .eq('is_show_ended', false).eq('is_archived', false).order('created_at', { ascending: false });
        if (error) throw error;
        if (active) setShows(data || []);
      } catch { if (active) setMessage('Unable to load open shows right now. Please return home and try again.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  return <SVShell title="Audience access" subtitle="Share your show with singers and guests" showLive={false}>
    <section style={{maxWidth:760,padding:24,border:'1px solid #334155',borderRadius:20,background:'#0f1a2c',color:'#f8fafc'}}>
      {loading ? <p role="status">Checking for open shows…</p> : message ? <><h2>Audience access unavailable</h2><p role="status" style={{color:'#cbd5e1',lineHeight:1.6}}>{message}</p><Link className="btn" href="/">← Back to home</Link></> : shows.length ? <>
        <h2>Choose a show</h2><p style={{color:'#cbd5e1',lineHeight:1.6}}>Open a show to find its singer, judge, and audience links and QR codes.</p>
        <div style={{display:'grid',gap:12,marginTop:20}}>{shows.map(show => <Link key={show.id} href={'/audience/'+show.id} style={{display:'block',padding:'16px 18px',border:'1px solid #334155',borderRadius:12,color:'#e0f2fe',textDecoration:'none',background:'#111f34'}}><strong>{show.name || 'Untitled show'}</strong>{show.venue && <span style={{display:'block',marginTop:4,color:'#94a3b8'}}>{show.venue}</span>}</Link>)}</div>
        <p style={{marginTop:22}}><Link href="/">← Back to home</Link></p>
      </> : <>
        <h2>No open show yet</h2><p style={{color:'#cbd5e1',lineHeight:1.6}}>Create or open a show to access its audience links and QR codes.</p>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:20}}><Link className="btn" href="/create">Create a show</Link><Link className="btn" href="/">← Back to home</Link></div>
      </>}
    </section>
  </SVShell>;
}
