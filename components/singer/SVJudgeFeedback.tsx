'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Note = { performance_id: string; song_title: string; artist: string | null; judge_name: string; note: string; submitted_at: string };

export default function SVJudgeFeedback({ eventId }: { eventId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setNotes([]); return; }
      const { data, error } = await supabase.rpc('get_my_judge_notes', { p_event_id: eventId });
      if (active) setNotes(error ? [] : data || []);
    }
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [eventId]);
  if (!notes.length) return null;
  return <details className="sv-mobile-card" style={{ marginTop: 20 }}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 20 }}>📝 Feedback from your judges</summary>
    <p>Shared by your host for your completed performances.</p>
    {notes.map(n => <article key={n.performance_id + n.judge_name + n.submitted_at} style={{ borderTop: '1px solid #334155', paddingTop: 14, marginTop: 14 }}>
      <strong>{n.song_title}{n.artist ? ' · ' + n.artist : ''}</strong>
      <p style={{ color: '#38bdf8' }}>{n.judge_name}</p>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.note}</p>
    </article>)}
  </details>;
}
