'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { analyticsAllowed, analyticsPage, measurementId, trackFunnel } from '@/lib/funnelAnalytics';

export default function SVFunnelAnalytics() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(false);
  const configured = /^G-[A-Z0-9]+$/.test(measurementId);
  useEffect(() => {
    if (!configured) return;
    const value = document.cookie.split('; ').find(x => x.startsWith('sv_analytics='))?.split('=')[1];
    setChoice(value === 'accepted' || value === 'declined' ? value : '');
  }, [configured]);
  useEffect(() => {
    const gate = window as unknown as Window & Record<string, unknown>;
    gate['ga-disable-' + measurementId] = choice !== 'accepted' || !analyticsPage(pathname);
    if (!loaded || choice !== 'accepted') return;
    const path = analyticsPage(pathname);
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    if (!path || !w.gtag) return;
    w.gtag('event', 'page_view', { page_location: window.location.origin + path, page_title: path,
      page_referrer: (() => { try { return new URL(document.referrer).origin; } catch { return ''; } })() });
    if (path === '/onboarding') trackFunnel('onboarding_started', {}, 'onboarding_started');
  }, [loaded, choice, pathname]);
  useEffect(() => {
    function click(event: MouseEvent) {
      const anchor = (event.target as Element)?.closest?.('a');
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.origin);
      if (url.hostname === 'app.stagevotes.com' && /^\/download\/(mac|windows)$/.test(url.pathname))
        trackFunnel('download_click', { platform: url.pathname.endsWith('mac') ? 'mac' : 'windows', placement: anchor.closest('.hero') ? 'hero' : anchor.closest('.pricing-section') ? 'pricing' : 'other' });
      if (url.hostname === 'youtu.be') trackFunnel('demo_external_click');
    }
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  if (!configured || choice === null) return null;
  const relevant = typeof window !== 'undefined' && analyticsPage(pathname);
  function choose(next: string) {
    document.cookie = 'sv_analytics=' + next + '; Path=/; Max-Age=31536000; SameSite=Lax; Secure' +
      (window.location.hostname.endsWith('stagevotes.com') ? '; Domain=stagevotes.com' : '');
    setChoice(next); setSettings(false);
    if (next === 'declined') {
      const w = window as Window & { gtag?: (...args: unknown[]) => void };
      w.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    } else if (loaded) {
      (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.('consent', 'update', { analytics_storage: 'granted' });
    }
  }
  return <>
    {relevant && choice === 'accepted' && <Script id="stagevotes-ga" src={'https://www.googletagmanager.com/gtag/js?id=' + measurementId} strategy="afterInteractive" onReady={() => {
      if (!analyticsAllowed() || !analyticsPage(window.location.pathname)) return;
      const w = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.gtag = w.gtag || function(..._args: unknown[]) { w.dataLayer!.push(arguments); };
      w.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      w.gtag('js', new Date());
      w.gtag('config', measurementId, { send_page_view: false, cookie_domain: 'stagevotes.com', allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: window.location.origin + window.location.pathname, page_referrer: (() => { try { return new URL(document.referrer).origin; } catch { return ''; } })() });
      setLoaded(true);
    }} />}
    {relevant && (choice === '' || settings) && <aside aria-label="Analytics preferences" style={{ position: 'fixed', bottom: 16, left: 16, right: 16, margin: 'auto', maxWidth: 620, zIndex: 10000, padding: 18, borderRadius: 16, background: '#0f172a', border: '1px solid #64748b', color: '#fff', boxShadow: '0 4px 24px #0008' }}>
      <p style={{ margin: '0 0 12px' }}>Allow optional analytics to help us improve the website and signup experience? We don’t send names, emails, or show content. <a href="https://app.stagevotes.com/privacy" style={{ color: '#7dd3fc' }}>Privacy policy</a></p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button type="button" onClick={() => choose('accepted')} style={{ background: '#f97316', color: '#fff', padding: '10px 18px', border: 0, borderRadius: 8 }}>Allow analytics</button>
        <button type="button" onClick={() => choose('declined')} style={{ background: '#334155', color: '#fff', padding: '10px 18px', border: 0, borderRadius: 8 }}>No thanks</button>
      </div>
    </aside>}
    {relevant && choice !== '' && !settings && <button type="button" onClick={() => setSettings(true)} style={{ position: 'fixed', bottom: 8, left: 8, zIndex: 9999, background: '#0f172a', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>Analytics preferences</button>}
  </>;
}
