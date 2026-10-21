'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EventPhoto, PHOTO_CAPTION_LIMIT } from '@/lib/eventPhotos';
import { prepareEventPhoto } from '@/lib/prepareEventPhoto';
import styles from './SVEventPhotos.module.css';

type Receipt = { id: string; removalToken: string; label: string };
type Gallery = { enabled: boolean; closed: boolean; eventName: string; photoCount?: number; photos: EventPhoto[]; reports: { photoId: string; reason: string }[] };
export default function SVEventPhotos({ eventId, host = false, readOnly = false }: { eventId: string; host?: boolean; readOnly?: boolean }) {
  const [data, setData] = useState<Gallery | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved'>('pending');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [permission, setPermission] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [reportId, setReportId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const endpoint = `/api/events/${encodeURIComponent(eventId)}/photos`;
  const receiptKey = 'sv_event_photos_' + eventId;

  const headers = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sign in to manage show photos.');
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint + (host ? '?mode=host' : !open ? '?summary=1' : ''), { headers: host ? await headers() : {}, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load show photos.');
      if (alive.current) setData(result);
    } catch (failure) {
      if (alive.current && (host || open)) setError(failure instanceof Error ? failure.message : 'Could not load photos.');
    }
  }, [endpoint, host, headers, open]);

  useEffect(() => {
    alive.current = true; void refresh();
    return () => { alive.current = false; };
  }, [refresh]);
  useEffect(() => {
    const focus = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(focus, open ? 45_000 : 60_000);
    window.addEventListener('focus', focus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [open, refresh]);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(receiptKey) || '[]'); if (Array.isArray(saved)) setReceipts(saved.filter(r => typeof r.id === 'string' && typeof r.removalToken === 'string').slice(-20)); } catch {}
  }, [receiptKey]);
  function saveReceipts(next: Receipt[]) {
    setReceipts(next);
    try { localStorage.setItem(receiptKey, JSON.stringify(next)); } catch {}
  }

  async function mutate(method: string, body: unknown, needsHost = false) {
    const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json', ...(needsHost ? await headers() : {}) }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save photo changes.');
    return result;
  }
  async function action(key: string, work: () => Promise<void>) {
    if (busy) return;
    setBusy(key); setError(''); setNotice('');
    try { await work(); await refresh(); }
    catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'Could not complete photo request.'); }
    finally { if (alive.current) setBusy(''); }
  }
  async function upload() {
    if (!file || !permission) return;
    await action('upload', async () => {
      const photo = await prepareEventPhoto(file);
      const form = new FormData();
      form.append('photo', photo, 'show-photo.jpg'); form.append('caption', caption);
      form.append('displayName', displayName); form.append('permission','yes');
      const response = await fetch(endpoint, { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not share this photo.');
      saveReceipts([...receipts, { id: result.id, removalToken: result.removalToken, label: caption.trim() || 'Photo shared ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }].slice(-20));
      setFile(null); setCaption(''); setPermission(false); if (input.current) input.current.value = '';
      setNotice('Photo sent! The host will review your photo and caption before they appear in the gallery.');
    });
  }
  const photos = data?.photos || [];
  const photoCount = data?.photoCount ?? photos.length;
  const pending = photos.filter(p => p.status === 'pending');
  const shown = host ? photos.filter(p => p.status === filter) : photos;
  if (!host && (!data || (!data.enabled && !photoCount && !receipts.length))) return null;
  return <section className={styles.panel} aria-label={host ? 'Host photo review' : 'Show photos'}>
    <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => { setOpen(!open); setError(''); }}>
      <Camera size={22} /><span><strong>{host ? 'Show photos & captions' : data?.closed || readOnly ? 'Show Photos' : 'Tonight’s Photos'}</strong>
      <small>{host ? `${pending.length} awaiting approval · ${photos.filter(p => p.status === 'approved').length} approved` : `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'} · ${data?.enabled && !data.closed && !readOnly ? 'Share a photo' : 'Relive this show'}`}</small></span>
      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
    {open && <div className={styles.body}>
      {host && data && <div className={styles.settings}>
        <label><input type="checkbox" checked={data.enabled} disabled={Boolean(busy) || data.closed} onChange={e => { const enabled = e.target.checked; void action('settings', async () => { await mutate('PATCH',{ action: 'settings', enabled },true); }); }} />Accept photo uploads for this show</label>
        <p>{data.closed ? 'This show has ended. Uploads are closed; you can still review and remove photos.' : 'Guests use this show’s existing singer page. Review each photo and caption before publishing. Turning uploads off keeps approved photos in the gallery.'}</p>
        <div className={styles.filters}><button type="button" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Review ({pending.length})</button><button type="button" aria-pressed={filter === 'approved'} onClick={() => setFilter('approved')}>Approved ({photos.filter(p => p.status === 'approved').length})</button></div>
      </div>}
      {!host && data?.enabled && !data.closed && !readOnly && <form className={styles.upload} onSubmit={e => { e.preventDefault(); void upload(); }}>
        <h3>Share a moment from this show</h3><p>Your photo stays with {data.eventName || 'this event'}. Add a fun caption if you like.</p>
        <label>Photo<input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" required disabled={Boolean(busy)} onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        {preview && <img className={styles.preview} src={preview} alt="Your selected photo preview" />}
        <label>Caption <span>optional · {caption.length}/{PHOTO_CAPTION_LIMIT}</span><input value={caption} maxLength={PHOTO_CAPTION_LIMIT} disabled={Boolean(busy)} onChange={e => setCaption(e.target.value)} placeholder="Future album cover 😂" /></label>
        <label>Display name <span>optional</span><input value={displayName} maxLength={40} disabled={Boolean(busy)} onChange={e => setDisplayName(e.target.value)} placeholder="How you’d like to be credited" /></label>
        <label className={styles.consent}><input type="checkbox" checked={permission} disabled={Boolean(busy)} onChange={e => setPermission(e.target.checked)} required /><span>I have permission to share this photo, including from the people pictured. I understand the host can publish it with my caption and display name in this event’s gallery and recap.</span></label>
        <button type="submit" className={styles.primary} disabled={Boolean(busy) || !file || !permission}>{busy === 'upload' ? <><LoaderCircle size={16} />Sending photo…</> : 'Send to host for approval'}</button>
      </form>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {!data && host && !error && <p>Loading photo settings…</p>}
      {data && !shown.length && <p className={styles.empty}>{host && filter === 'pending' ? 'No photos waiting for review.' : 'No approved photos yet. Photos appear here after host approval.'}</p>}
      <div className={styles.grid}>{shown.map(photo => <article className={styles.photo} key={photo.id}>
        <a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label="Open photo at full size"><img src={photo.url} alt={photo.caption || 'Photo from this karaoke show'} loading="lazy" /></a>
        <div className={styles.caption}>{photo.caption && <p>{photo.caption}</p>}{photo.displayName && <small>Shared by {photo.displayName}</small>}
        {host ? <><span className={styles.badge}>{photo.status === 'pending' ? 'Awaiting approval' : 'Approved'}{photo.reports ? ` · ${photo.reports} reported` : ''}</span>
          {data?.reports.filter(r => r.photoId === photo.id).map((r,i) => <p className={styles.report} key={i}>Report: {r.reason}</p>)}
          <div className={styles.controls}>{photo.status === 'pending' && <button type="button" className={styles.primary} disabled={Boolean(busy)} onClick={() => void action(photo.id,async () => { await mutate('PATCH',{ action:'approve',photoId:photo.id },true); })}>Approve photo & caption</button>}
          <button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Remove this photo and caption from the event?')) void action(photo.id,async () => { await mutate('PATCH',{ action:photo.status === 'pending' ? 'reject' : 'remove',photoId:photo.id },true); }); }}>{photo.status === 'pending' ? 'Reject' : 'Remove'}</button></div></>
          : <button type="button" className={styles.subtle} disabled={Boolean(busy)} onClick={() => { setReportId(photo.id); setReason(''); }}>Report / request removal</button>}
        {reportId === photo.id && !host && <form className={styles.reportForm} onSubmit={e => { e.preventDefault(); void action('report',async () => { await mutate('POST',{ action:'report',photoId:photo.id,reason }); setReportId('');setNotice('Report sent to the host for review.'); }); }}>
          <label>What should the host review?<textarea value={reason} maxLength={300} required onChange={e => setReason(e.target.value)} /></label>
          <button type="submit" disabled={Boolean(busy) || !reason.trim()}>Send report</button><button type="button" onClick={() => setReportId('')}>Cancel</button></form>}
        </div>
      </article>)}</div>
      {!host && receipts.length > 0 && <details className={styles.yours}><summary>Your uploads on this device</summary><p>Pending photos are private until approved. You can remove your upload here.</p>
        {receipts.map(receipt => <div key={receipt.id}><span>{receipt.label}</span><button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm('Remove your photo from this event?')) void action(receipt.id,async () => { await mutate('DELETE',{photoId:receipt.id,removalToken:receipt.removalToken});saveReceipts(receipts.filter(r => r.id !== receipt.id));setNotice('Your photo was removed.'); }); }}>Remove my photo</button></div>)}
      </details>}
      <p className={styles.footnote}>Photos and captions are shared by guests and reviewed by the host. Please share kindly. Approved photos stay attached to this event.</p>
    </div>}
  </section>;
}
