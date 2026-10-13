type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
export const measurementId = process.env.NEXT_PUBLIC_VERCEL_ENV && process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' ? '' : (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '');
export function analyticsAllowed() {
  if (typeof window === 'undefined' || !/^G-[A-Z0-9]+$/.test(measurementId)) return false;
  return document.cookie.split('; ').some(x => x === 'sv_analytics=accepted');
}
export function analyticsPage(path: string) {
  if (window.location.hostname === 'www.stagevotes.com' || window.location.hostname === 'stagevotes.com')
    return /^[a-z0-9/-]*$/i.test(path) ? path : '/';
  return ['/onboarding', '/download/mac', '/download/windows'].includes(path) ? path : null;
}
export function trackFunnel(name: string, params: Record<string, string | number> = {}, onceKey?: string) {
  if (!analyticsAllowed() || !analyticsPage(window.location.pathname)) return;
  const w = window as AnalyticsWindow;
  if (!w.gtag) return;
  try { if (onceKey && sessionStorage.getItem('sv_ga_' + onceKey)) return; } catch {}
  w.gtag('event', name, { ...params, page_location: window.location.origin + window.location.pathname, transport_type: 'beacon' });
  try { if (onceKey) sessionStorage.setItem('sv_ga_' + onceKey, '1'); } catch {}
}
export async function analyticsCheckoutContext(): Promise<{ clientId: string; sessionId: string } | null> {
  if (!analyticsAllowed()) return null;
  const w = window as AnalyticsWindow;
  if (!w.gtag) return null;
  return new Promise(resolve => {
    let clientId = '', sessionId = '', settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(clientId && sessionId ? { clientId, sessionId } : null); } };
    const timeout = setTimeout(finish, 600);
    const done = () => { if (clientId && sessionId) { clearTimeout(timeout); finish(); } };
    w.gtag!('get', measurementId, 'client_id', (value: unknown) => { if (typeof value === 'string' && /^\d+\.\d+$/.test(value)) clientId = value; done(); });
    w.gtag!('get', measurementId, 'session_id', (value: unknown) => { if (/^\d+$/.test(String(value))) sessionId = String(value); done(); });
  });
}
