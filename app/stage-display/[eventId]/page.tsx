'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ContestAwards from '@/components/contest/ContestAwards';
import StageBackdrop, { type StageEvent, type StageSinger, type StageBadge } from '@/components/display/StageBackdrop';

export default function StageDisplayPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<StageEvent | null>(null);
  const [singers, setSingers] = useState<StageSinger[]>([]);
  const [badges, setBadges] = useState<StageBadge[]>([]);
  const [logo, setLogo] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [awardsContestId, setAwardsContestId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    let active = true;
    let loading = false;
    const controller = new AbortController();
    setReady(false); setEvent(null); setSingers([]); setBadges([]); setLogo(''); setError('');
    async function refresh() {
      if (loading || !active) return;
      loading = true;
      try {
        const [show, queue] = await Promise.all([
          supabase.from('events').select('id,name,venue,account_id,current_performance_id,is_show_ended,signups_open,show_signup_qr').eq('id', eventId).abortSignal(controller.signal).single(),
          supabase.from('performances').select('id,singer_name,duet_partner_name,song_title,artist,status,round,queue_order,manual_queue_order,created_at,singer_profile_id').eq('event_id', eventId).abortSignal(controller.signal),
        ]);
        if (show.error || queue.error || !show.data) throw new Error('Show unavailable');
        const rows = (queue.data || []) as StageSinger[];
        const ids = [...new Set(rows.map(row => row.singer_profile_id).filter((id): id is string => Boolean(id)))];
        const [profiles, branding] = await Promise.all([
          ids.length ? supabase.from('singer_profiles').select('id,photo_url').in('id', ids).abortSignal(controller.signal) : Promise.resolve({ data: [] }),
          show.data.account_id ? supabase.from('accounts').select('logo_url').eq('id', show.data.account_id).abortSignal(controller.signal).maybeSingle() : Promise.resolve({ data: null }),
        ]);
        if (!active) return;
        const photos = new Map((profiles.data || []).map(row => [row.id, row.photo_url]));
        setEvent(show.data as StageEvent);
        setSingers(rows.map(row => ({ ...row, photo_url: row.singer_profile_id ? photos.get(row.singer_profile_id) || null : null })));
        setLogo(branding.data?.logo_url || ''); setError(''); setReady(true);
      } catch {
        if (active) { setError('Connection interrupted. Reconnecting…'); setReady(true); }
      } finally { loading = false; }
    }
    async function refreshBadges() {
      try {
        const response = await fetch('/api/stage-display/' + encodeURIComponent(eventId) + '/badges', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (active && Array.isArray(result.badges)) setBadges(result.badges);
      } catch { /* Badge availability must not interrupt the stage display. */ }
    }
    void refresh(); void refreshBadges();
    const channel = supabase.channel('stage-display-' + eventId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: 'id=eq.' + eventId }, () => { void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances', filter: 'event_id=eq.' + eventId }, () => { void refresh(); })
      .subscribe();
    const timer = window.setInterval(() => { void refresh(); void refreshBadges(); }, 10_000);
    const focus = () => { void refresh(); void refreshBadges(); };
    window.addEventListener('focus', focus);
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', focus); void supabase.removeChannel(channel); };
  }, [eventId]);

  useEffect(() => {
    let active = true;
    let loading = false;
    const controller = new AbortController();
    setAwardsContestId(null);
    async function refreshAwards() {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch('/api/stage-display/' + encodeURIComponent(eventId) + '/contest-awards', {cache:'no-store',signal:controller.signal});
        if (!response.ok) return;
        const data = await response.json();
        if (active) setAwardsContestId(typeof data.contestId === 'string' ? data.contestId : null);
      } catch { /* Preserve the current display during a brief connection interruption. */ }
      finally { loading = false; }
    }
    void refreshAwards();
    const timer = window.setInterval(() => { void refreshAwards(); }, 1500);
    window.addEventListener('focus', refreshAwards);
    return () => { active=false; controller.abort(); clearInterval(timer); window.removeEventListener('focus', refreshAwards); };
  }, [eventId]);

  return <>
    <div hidden={Boolean(awardsContestId)}><StageBackdrop event={event} singers={singers} logo={logo} origin={origin} ready={ready} error={error} badges={badges} /></div>
    {awardsContestId && <div style={{position:'fixed',inset:0,zIndex:100,overflow:'auto',background:'#070b18'}}><ContestAwards key={awardsContestId} contestId={awardsContestId}/></div>}
  </>;
}
