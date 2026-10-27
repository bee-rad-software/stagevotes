'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type QueueItem = { id: string; singerName: string; songTitle: string; artist?: string };
type Variant = { resource_id: string; catalog?: { name?: string }; is_duet?: boolean; is_explicit?: boolean; duration?: number };
type Song = { resource_id: string; name: string; artists?: { name?: string }[]; variants?: Variant[] };

export default function SingaExperiment({ items, eventId }: { items: QueueItem[]; eventId: string }) {
  const socket = useRef<WebSocket | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectId = useRef('');
  const requestId = useRef('');
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [settingBusy, setSettingBusy] = useState(true);
  const [settingError, setSettingError] = useState('');
  useEffect(() => { let active = true; setSettingBusy(true); supabase.rpc('get_show_singa_enabled', { p_event_id: eventId }).then(({ data, error }) => { if (!active) return; if (error) setSettingError('Singa catalog setting is unavailable. Install the database update.'); else setEnabled(data === true); setSettingBusy(false); }); return () => { active = false; }; }, [eventId]);
  async function updateSetting(value: boolean) { setSettingBusy(true); setSettingError(''); const { error } = await supabase.rpc('set_show_singa_enabled', { p_event_id: eventId, p_enabled: value }); if (error) setSettingError('Unable to update the Singa catalog setting.'); else setEnabled(value); setSettingBusy(false); }
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Enter the code from the Singa remote.');
  const [itemId, setItemId] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const item = items.find((entry) => entry.id === itemId);
  const [songId, variantId] = selected.split('|');

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); socket.current?.close(); }, []);

  function connect() {
    if (!code.trim()) return;
    socket.current?.close();
    setConnected(false);
    setStatus('Connecting to Singa…');
    const ws = new WebSocket('wss://api.singa.com/v1.5/ws/party');
    socket.current = ws;
    ws.onopen = () => {
      connectId.current = crypto.randomUUID();
      ws.send(JSON.stringify({ type: 'client.connect', kind: 'command', id: connectId.current, occurred_at: new Date().toISOString(), protocol_version: '2.0', payload: { public_code: code.trim().toUpperCase() } }));
    };
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'client.connected' && message.caused_by === connectId.current) { setConnected(true); setStatus('Connected. Choose a singer and find their song.'); }
        if (message.caused_by === requestId.current && message.type === 'song.requested') {
          if (timer.current) clearTimeout(timer.current);
          requestId.current = '';
          setPending(false);
          setStatus('Singa accepted the song request. Check its queue to confirm.');
        }
        if (message.caused_by === requestId.current && message.type === 'command.result' && message.payload?.success === false) {
          if (timer.current) clearTimeout(timer.current);
          requestId.current = ''; setPending(false); setStatus('Singa rejected the request. Check its queue before trying again.');
        }
      } catch { /* Ignore messages that are not JSON. */ }
    };
    ws.onerror = () => setStatus('Could not connect to Singa. Check the code and try again.');
    ws.onclose = () => { if (socket.current === ws) { setConnected(false); if (requestId.current) { requestId.current = ''; setPending(false); setStatus('Connection closed. Check the Singa queue before trying again.'); } } };
  }

  async function search() {
    if (!item?.songTitle) return;
    setSearching(true); setResults([]); setSelected('');
    try {
      const params = new URLSearchParams({ search: `${item.songTitle} ${item.artist || ''}`.trim(), page: '1', page_size: '20', type: 'songs', market: 'US' });
      const response = await fetch(`https://api.singa.com/v1.4/search/?${params}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(Array.isArray(data.songs?.items) ? data.songs.items : []);
      setStatus('Choose the matching song and version.');
    } catch { setStatus('Singa search is unavailable in this browser.'); }
    finally { setSearching(false); }
  }

  function send() {
    if (!connected || !item || !songId || !variantId || pending || attempted.includes(item.id) || socket.current?.readyState !== WebSocket.OPEN) return;
    setAttempted((previous) => [...previous, item.id]);
    const id = crypto.randomUUID(); requestId.current = id; setPending(true);
    socket.current.send(JSON.stringify({ type: 'song.request', kind: 'command', id, occurred_at: new Date().toISOString(), protocol_version: '2.0', payload: { song_id: songId, song_variant_id: variantId, singer_name: item.singerName, pitch: 0, tempo: 0, guide_vocals: false } }));
    setStatus('Request sent; waiting for Singa…');
    timer.current = setTimeout(() => { requestId.current = ''; setPending(false); setStatus('No confirmation received. Check the Singa queue before trying again.'); }, 12000);
  }

  const field = { width: '100%', padding: '10px', marginTop: '8px', color: '#fff', background: '#101a30', border: '1px solid #465571', borderRadius: 8 };
  const button = { padding: '10px 16px', marginTop: 10, borderRadius: 8, background: '#f97316', color: '#fff', border: 0 };
  return <details style={{ padding: 16, margin: '16px 0', border: '1px solid #465571', borderRadius: 12 }}>
    <summary>Send a song to Singa (test)</summary>
    <label style={{display:'block',marginTop:12}}><input type="checkbox" checked={enabled} disabled={settingBusy} onChange={(e) => void updateSetting(e.target.checked)} /> Use Singa song catalog for this show</label>
    {settingError && <p role="alert">{settingError}</p>}
    <p>Manually send a song to your Singa remote queue. This does not start playback or advance the StageVotes queue.</p>
    <label>Singa remote code<input style={field} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" /></label>
    <button type="button" style={button} onClick={connect} disabled={pending}>Connect</button>
    <label style={{ display: 'block', marginTop: 12 }}>Singer and song<select style={field} value={itemId} onChange={(e) => { setItemId(e.target.value); setResults([]); setSelected(''); }}><option value="">Choose from the queue</option>{items.filter((entry) => entry.songTitle).map((entry) => <option key={entry.id} value={entry.id}>{entry.singerName} — {entry.songTitle}{entry.artist ? ` — ${entry.artist}` : ''}</option>)}</select></label>
    <button type="button" style={button} onClick={search} disabled={!item || searching || pending}>{searching ? 'Searching…' : 'Find in Singa'}</button>
    {results.length > 0 && <label style={{ display: 'block', marginTop: 12 }}>Confirm the song and version<select style={field} value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a match</option>{results.flatMap((song) => (song.variants || []).map((variant) => <option key={variant.resource_id} value={`${song.resource_id}|${variant.resource_id}`}>{song.name} — {song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || 'Unknown artist'} — {variant.catalog?.name || 'Version'}{variant.is_duet ? ' · Duet' : ''}{variant.is_explicit ? ' · Explicit' : ''}{variant.duration ? ` · ${Math.floor(variant.duration / 60)}:${String(variant.duration % 60).padStart(2, '0')}` : ''}</option>))}</select></label>}
    <div><button type="button" style={button} onClick={send} disabled={!connected || !selected || pending || (!!item && attempted.includes(item.id))}>{pending ? 'Sending…' : 'Send to Singa'}</button></div>
    {item && attempted.includes(item.id) && <p>This song was already sent or attempted in this session. Check the Singa queue before sending it again.</p>}
    <p role="status">{status}</p>
  </details>;
}
