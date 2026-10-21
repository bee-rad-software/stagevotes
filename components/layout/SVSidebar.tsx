'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { navigation } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export default function SVSidebar() {
  
  const pathname = usePathname();

  const [isDesktop, setIsDesktop] =
  useState(false);

useEffect(() => {
  setIsDesktop(
    Boolean(
      (window as any)
        .stagevotesDesktop?.isDesktop
    )
  );
}, []);

const eventMatch = pathname.match(
  /^\/(?:host|audience|displays|analytics|history)\/([^/]+)/
);

const currentEventId = eventMatch?.[1] || null;
const [liveShow, setLiveShow] = useState<{ id: string; name: string } | null>(null);
const [liveCount, setLiveCount] = useState(0);
const [showStatus, setShowStatus] = useState<'loading' | 'ready' | 'error'>('loading');

useEffect(() => {
  let active = true;
  let revision = 0;
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let channelAccount = '';
  let authTimer = 0;
  setLiveShow(null);
  setLiveCount(0);
  setShowStatus('loading');

  async function loadLiveShow() {
    const request = ++revision;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!active || request !== revision) return;
      if (!user) {
        setLiveShow(null); setLiveCount(0); setShowStatus('ready');
        if (channel) { void supabase.removeChannel(channel); channel = null; channelAccount = ''; }
        return;
      }
      const { data: membership, error: membershipError } = await supabase.from('account_users')
        .select('account_id').eq('user_id', user.id).maybeSingle();
      if (membershipError) throw membershipError;
      if (!active || request !== revision) return;
      if (!membership?.account_id) {
        setLiveShow(null); setLiveCount(0); setShowStatus('ready');
        if (channel) { void supabase.removeChannel(channel); channel = null; channelAccount = ''; }
        return;
      }
      const accountId = membership.account_id;
      if (channelAccount !== accountId) {
        if (channel) void supabase.removeChannel(channel);
        channelAccount = accountId;
        channel = supabase.channel('sidebar-live-show-' + accountId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: 'account_id=eq.' + accountId },
            () => { void loadLiveShow(); }).subscribe();
      }
      const { data, error } = await supabase.from('events')
        .select('id, name').eq('account_id', accountId)
        .eq('is_show_ended', false).eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!active || request !== revision) return;
      const shows = data || [];
      setLiveShow(shows.find(show => show.id === currentEventId) || shows[0] || null);
      setLiveCount(shows.length);
      setShowStatus('ready');
    } catch {
      if (active && request === revision) {
        setLiveShow(null); setLiveCount(0); setShowStatus('error');
      }
    }
  }
  const refresh = () => { if (document.visibilityState === 'visible') void loadLiveShow(); };
  void loadLiveShow();
  const timer = window.setInterval(refresh, 60_000);
  window.addEventListener('focus', refresh);
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    ++revision;
    setLiveShow(null); setLiveCount(0); setShowStatus('loading');
    if (channel) { void supabase.removeChannel(channel); channel = null; channelAccount = ''; }
    window.clearTimeout(authTimer);
    authTimer = window.setTimeout(() => { if (active) void loadLiveShow(); }, 0);
  });
  return () => {
    active = false; ++revision;
    window.clearInterval(timer); window.clearTimeout(authTimer);
    window.removeEventListener('focus', refresh);
    subscription.unsubscribe();
    if (channel) void supabase.removeChannel(channel);
  };
}, [currentEventId]);

  return (
    <aside className="sv-sidebar">
      <div
  className="sv-logo-area"
  style={{
    paddingTop: isDesktop
      ? 48
      : undefined,
  }}
>
        <img
  src="/icon-512.png"
  alt="StageVotes"
  width={60}
  height={60}
  className="sv-app-logo"
/>

        <div className="sv-brand-text">
          <strong>StageVotes</strong>
          <small>Professional</small>
        </div>
      </div>

      <nav className="sv-nav">
        {navigation.map((section) => (
          <div key={section.title} className="sv-nav-section">
            <div className="sv-nav-title">{section.title}</div>

            {section.items.map((item) => {
              const Icon = item.icon;

const href =
  item.label === 'Dashboard' && currentEventId
    ? `/host/${currentEventId}`
    : item.label === 'Audience' && currentEventId
    ? `/audience/${currentEventId}`
    : item.label === 'Displays' && currentEventId
    ? `/displays/${currentEventId}`
    : item.label === 'Analytics' && currentEventId
    ? `/analytics/${currentEventId}`
    : item.label === 'History' && currentEventId
    ? `/history/${currentEventId}`
    : item.href;

              return (
                <Link
  key={item.label}
  href={href}
  className={
    pathname === href ||
    (
      item.label === 'Tournaments' &&
      pathname.startsWith('/tournament-director')
    )
      ? 'sv-nav-item sv-nav-item-active'
      : 'sv-nav-item'
  }
>
  <Icon size={18} />

  <span className="sv-nav-label">
    {item.label}
  </span>
</Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sv-current-show" style={!liveShow ? { background: 'rgba(148,163,184,0.04)', borderColor: 'rgba(148,163,184,0.2)' } : undefined}>
        <div className="label">{liveCount > 1 ? `Live Shows · ${liveCount}` : 'Current Show'}</div>
        {showStatus === 'loading' ? <strong>Checking live shows…</strong> :
          showStatus === 'error' ? <strong>Show status unavailable</strong> :
          liveShow ? <>
            <strong><Link href={`/host/${liveShow.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{liveShow.name || 'Untitled show'}</Link></strong>
            <div className="live">● LIVE</div>
          </> : <strong>No live show</strong>}
      </div>
    </aside>
  );
}