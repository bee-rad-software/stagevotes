'use client';

import { useEffect, useRef, useState } from 'react';
import { newSingaPlaybackTracker, observeSingaPlayback } from '@/lib/singaPlayback';

type QueueItem = { id: string; singerName: string; songTitle: string; artist?: string; status?: string; performance?: { singa_song_id?: string | null; singa_variant_id?: string | null } };

type Props = { items: QueueItem[]; excludeExplicit?: boolean; onCompleted: (performanceId: string) => void };
type Variant = { resource_id: string; catalog?: { name?: string }; is_duet?: boolean; is_explicit?: boolean; duration?: number };
type Song = { resource_id: string; name: string; artists?: { name?: string }[]; variants?: Variant[] };

export default function SingaExperiment({ items, excludeExplicit, onCompleted }: Props) {
  const currentItems = useRef(items);
  const completedCallback = useRef(onCompleted);
  const autoAdvanceRef = useRef(false);
  const playbackTracker = useRef(newSingaPlaybackTracker());
  const sentRequests = useRef(new Map<string, string>());
  const pendingPerformance = useRef<string | null>(null);
  currentItems.current = items;
  completedCallback.current = onCompleted;
  const socket = useRef<WebSocket | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectId = useRef('');
  const requestId = useRef('');
  const [code, setCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [status, setStatus] = useState('Enter the code from the Singa remote.');
  const [itemId, setItemId] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const bufferSize = 2;
  const [bufferActive, setBufferActive] = useState(false);
  const [bufferRevision, setBufferRevision] = useState(0);
  const bufferActiveRef = useRef(false);
  const matching = useRef(false);
  const queuedOrder = useRef<string[]>([]);
  const completedPerformances = useRef(new Set<string>());
  const awaitingAdvance = useRef<string | null>(null);
  const stopBuffer = (reason: string) => {
    bufferActiveRef.current = false;
    setBufferActive(false);
    setStatus(reason);
  };

  const item = items.find((entry) => entry.id === itemId);
  const [songId, variantId] = selected.split('|');

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); socket.current?.close(); }, []);

  function connect() {
    if (!code.trim()) return;
    socket.current?.close();
    playbackTracker.current = newSingaPlaybackTracker();
    sentRequests.current.clear();
    queuedOrder.current = [];
    bufferActiveRef.current = false;
    setBufferActive(false);
    pendingPerformance.current = null;
    autoAdvanceRef.current = false;
    setAutoAdvance(false);
    setConnected(false);
    setStatus('Connecting to Singa…');
    const ws = new WebSocket('wss://api.singa.com/v1.5/ws/party');
    socket.current = ws;
    ws.onopen = () => {
      connectId.current = crypto.randomUUID();
      ws.send(JSON.stringify({ type: 'client.connect', kind: 'command', id: connectId.current, occurred_at: new Date().toISOString(), protocol_version: '2.0', payload: { public_code: code.trim().toUpperCase() } }));
    };
    ws.onmessage = (event) => {
      if (socket.current !== ws) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'client.connected' && message.caused_by === connectId.current) { setConnected(true); setStatus('Connected. Choose a singer and find their song.'); }
        if (message.caused_by === requestId.current && message.type === 'song.requested') {
          if (timer.current) clearTimeout(timer.current);
          const singaId = message.payload?.song_request_identifier;
          if (typeof singaId === 'string' && pendingPerformance.current) {
            sentRequests.current.set(singaId, pendingPerformance.current);
            queuedOrder.current.push(pendingPerformance.current);
          } else if (bufferActiveRef.current) stopBuffer('Singa did not provide a queue identifier. Check its queue before continuing.');
          pendingPerformance.current = null;
          requestId.current = '';
          setPending(false);
          setBufferRevision(n => n + 1);
          setStatus(typeof singaId === 'string' ? 'Singa accepted the song request. Check its queue to confirm.' : 'Singa accepted the request, but automatic completion is unavailable for this song.');
        }
        if (message.type === 'estimates.state' && bufferActiveRef.current && Array.isArray(message.payload?.entries)) {
          const positions = new Map<string, number>();
          for (const entry of message.payload.entries) {
            const performance = sentRequests.current.get(entry.song_request_identifier);
            if (performance && typeof entry.position === 'number') positions.set(performance, entry.position);
          }
          const known = queuedOrder.current.filter(id => positions.has(id));
          if (known.some((id, index) => index > 0 && positions.get(id)! < positions.get(known[index - 1])!)) {
            stopBuffer('The Singa queue order changed. Check both queues before continuing.');
            autoAdvanceRef.current = false;
            setAutoAdvance(false);
          }
        }
        if (message.type === 'estimates.state' && autoAdvanceRef.current) {
          const current = currentItems.current.find(entry => entry.status === 'current');
          const completed = observeSingaPlayback(playbackTracker.current, message.payload, current?.id || null, sentRequests.current);
          if (completed) {
            for (const [request, performance] of sentRequests.current) if (performance === completed) sentRequests.current.delete(request);
            completedPerformances.current.add(completed);
            queuedOrder.current = queuedOrder.current.filter(id => id !== completed);
            awaitingAdvance.current = completed;
            setStatus('Singa finished or skipped the current song. Advancing StageVotes…');
            completedCallback.current(completed);
          }
        }
        if (message.caused_by === requestId.current && message.type === 'command.result' && message.payload?.success === false) {
          if (timer.current) clearTimeout(timer.current);
          requestId.current = ''; setPending(false); stopBuffer('Singa rejected the request. Check its queue before trying again.');
        }
      } catch { /* Ignore messages that are not JSON. */ }
    };
    ws.onerror = () => setStatus('Could not connect to Singa. Check the code and try again.');
    ws.onclose = () => { if (socket.current === ws) { setConnected(false); bufferActiveRef.current = false; setBufferActive(false); autoAdvanceRef.current = false; setAutoAdvance(false); sentRequests.current.clear(); setStatus('Singa disconnected. Automatic advance is off; check both queues before reconnecting.'); if (requestId.current) { requestId.current = ''; setPending(false); setStatus('Connection closed. Check the Singa queue before trying again.'); } } };
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

  function sendItem(entry: QueueItem, song: string, variant: string) {
    if (!connected || !song || !variant || requestId.current || attempted.includes(entry.id) || socket.current?.readyState !== WebSocket.OPEN) return;
    setAttempted((previous) => [...previous, entry.id]);
    const id = crypto.randomUUID(); requestId.current = id; pendingPerformance.current = entry.id; setPending(true);
    socket.current.send(JSON.stringify({ type: 'song.request', kind: 'command', id, occurred_at: new Date().toISOString(), protocol_version: '2.0', payload: { song_id: song, song_variant_id: variant, singer_name: entry.singerName, pitch: 0, tempo: 0, guide_vocals: false } }));
    setStatus('Request sent; waiting for Singa…');
    timer.current = setTimeout(() => { requestId.current = ''; setPending(false); stopBuffer('No confirmation received. Check the Singa queue before continuing.'); }, 12000);
  }

  // The live queue is not fully exposed to this client. Only send while the
  // host-confirmed buffer remains a prefix of the StageVotes rotation.
  useEffect(() => {
    if (!bufferActive || !connected || pending || matching.current) return;
    const current = items.find(entry => entry.status === 'current');
    if (awaitingAdvance.current) {
      if (!current || current.id === awaitingAdvance.current) return;
      awaitingAdvance.current = null;
    }
    if (!current) { stopBuffer('Start the show and choose the current singer before sending songs.'); return; }
    const rotation = items.filter(entry => !completedPerformances.current.has(entry.id) && entry.songTitle && entry.songTitle !== 'Song Needed');
    const prefix = rotation.slice(0, queuedOrder.current.length).map(entry => entry.id);
    if (queuedOrder.current.some((id, index) => id !== prefix[index])) {
      stopBuffer('The StageVotes order changed after songs were sent. Check and correct the Singa queue before continuing.');
      return;
    }
    if (queuedOrder.current.length >= bufferSize) return;
    const confirmed = new Set(sentRequests.current.values());
    const next = rotation.find(entry => !confirmed.has(entry.id));
    if (!next) return;
    if (attempted.includes(next.id)) {
      stopBuffer('This song was already sent or attempted. Check the Singa queue before continuing.');
      return;
    }
    matching.current = true;
    const initialOrder = rotation.slice(0, queuedOrder.current.length + 1).map(entry => entry.id).join('|');
    (async () => {
      try {
        if (next.performance?.singa_song_id && next.performance?.singa_variant_id) {
          if (!bufferActiveRef.current || !currentItems.current.some(entry => entry.id === next.id && entry.songTitle === next.songTitle && entry.artist === next.artist)) return;
          sendItem(next, next.performance.singa_song_id, next.performance.singa_variant_id);
          return;
        }
        if (!next.artist?.trim()) throw new Error('Choose this song and its Singa version manually before continuing.');
        const params = new URLSearchParams({ search: `${next.songTitle} ${next.artist}`, page: '1', page_size: '20', type: 'songs', market: 'US' });
        const response = await fetch(`https://api.singa.com/v1.4/search/?${params}`);
        if (!response.ok) throw new Error('Singa search failed. Check the queue before continuing.');
        const data = await response.json();
        const normalize = (value: string) => value.trim().toLocaleLowerCase();
        const matches: Song[] = (Array.isArray(data.songs?.items) ? data.songs.items : []).filter((song: Song) =>
          typeof song.name === 'string' && normalize(song.name) === normalize(next.songTitle) &&
          song.artists?.some(artist => typeof artist.name === 'string' && normalize(artist.name) === normalize(next.artist!)) &&
          !!song.resource_id && Array.isArray(song.variants) && song.variants.length === 1 && !!song.variants[0].resource_id &&
          (!excludeExplicit || song.variants[0].is_explicit === false));
        if (matches.length !== 1) throw new Error(`Choose the Singa version for ${next.singerName} manually; the automatic match is uncertain.`);
        const currentOrder = currentItems.current.filter(entry => !completedPerformances.current.has(entry.id) && entry.songTitle && entry.songTitle !== 'Song Needed').slice(0, queuedOrder.current.length + 1).map(entry => entry.id).join('|');
        if (!bufferActiveRef.current || currentOrder !== initialOrder || socket.current?.readyState !== WebSocket.OPEN) throw new Error('Queue or connection changed. Check Singa before continuing.');
        sendItem(next, matches[0].resource_id, matches[0].variants![0].resource_id);
      } catch (error) {
        stopBuffer(error instanceof Error ? error.message : 'Unable to find the song in Singa.');
      } finally { matching.current = false; }
    })();
  }, [items, bufferActive, bufferSize, bufferRevision, connected, pending, attempted, excludeExplicit]);

  const field = { width: '100%', padding: '10px', marginTop: '8px', color: '#fff', background: '#101a30', border: '1px solid #465571', borderRadius: 8 };
  const button = { padding: '10px 16px', marginTop: 10, borderRadius: 8, background: '#f97316', color: '#fff', border: 0 };
  return <section aria-label="Singa connection" style={{ padding: 16, margin: '16px 0', border: '1px solid #465571', borderRadius: 12 }}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><strong>Singa</strong><span role="status" style={{fontSize:13,color:connected ? '#4ade80' : '#94a3b8'}}>{connected ? (bufferActive ? 'Syncing' : 'Connected') : 'Not connected'}</span></div>
    {!connected && <>
    <label>Singa remote code<input style={field} value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" /></label>
    <button type="button" style={button} onClick={connect} disabled={pending}>Connect</button>
    </>}
    {connected && <div style={{display:'flex',alignItems:'center',gap:18,flexWrap:'wrap'}}>
    <button type="button" style={button} disabled={!connected || pending} onClick={() => {
      if (bufferActive) { stopBuffer('Automatic sending paused. Check the Singa queue before restarting.'); return; }
      if (!attempted.length && !window.confirm('Start with an empty Singa queue and use only one StageVotes host to control it. Ready to sync?')) return;
      const tracked = new Set(sentRequests.current.values());
      if (attempted.some(id => !tracked.has(id) && !completedPerformances.current.has(id))) { setStatus('A song request is unconfirmed. Check Singa before reconnecting.'); return; }
      bufferActiveRef.current = true; setBufferActive(true);
    }}>{bufferActive ? 'Pause Sync' : 'Start Sync'}</button>
    <label style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}><input style={{width:18,height:18,margin:0}} type="checkbox" checked={autoAdvance} disabled={!connected} onChange={e => { playbackTracker.current = newSingaPlaybackTracker(); autoAdvanceRef.current = e.target.checked; setAutoAdvance(e.target.checked); }} /> Auto-advance</label>
    </div>}
    <details style={{marginTop:14,fontSize:13}}><summary style={{cursor:'pointer',color:'#94a3b8'}}>Advanced</summary>
    <p>Sync keeps two songs ready, including the current singer. Start playback in Singa. Auto-advance follows completed or skipped songs; Stop and Pause keep the current singer. The final song may need Next Singer manually.</p>
    <p>If you change a song already sent, update it in Singa too. Keep both queues in order. Automatic matching pauses when a version is uncertain.</p>
    {connected && <><label>Singa remote code<input style={field} value={code} onChange={e => setCode(e.target.value)} autoComplete="off" /></label><button type="button" style={button} onClick={connect} disabled={pending}>Reconnect</button><p>Reconnecting pauses sync and resets auto-advance. Check both queues before restarting.</p></>}
    <h4>Manual song controls</h4>
    <label style={{ display: 'block', marginTop: 12 }}>Singer and song<select style={field} value={itemId} onChange={(e) => { setItemId(e.target.value); setResults([]); setSelected(''); }}><option value="">Choose from the queue</option>{items.filter((entry) => entry.songTitle).map((entry) => <option key={entry.id} value={entry.id}>{entry.singerName} — {entry.songTitle}{entry.artist ? ` — ${entry.artist}` : ''}</option>)}</select></label>
    <button type="button" style={button} onClick={search} disabled={!item || searching || pending}>{searching ? 'Searching…' : 'Find in Singa'}</button>
    {results.length > 0 && <label style={{ display: 'block', marginTop: 12 }}>Confirm the song and version<select style={field} value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Choose a match</option>{results.flatMap((song) => (song.variants || []).map((variant) => <option key={variant.resource_id} value={`${song.resource_id}|${variant.resource_id}`}>{song.name} — {song.artists?.map((artist) => artist.name).filter(Boolean).join(', ') || 'Unknown artist'} — {variant.catalog?.name || 'Version'}{variant.is_duet ? ' · Duet' : ''}{variant.is_explicit ? ' · Explicit' : ''}{variant.duration ? ` · ${Math.floor(variant.duration / 60)}:${String(variant.duration % 60).padStart(2, '0')}` : ''}</option>))}</select></label>}
    <div><button type="button" style={button} onClick={() => item && sendItem(item, songId, variantId)} disabled={bufferActive || !connected || !selected || pending || (!!item && attempted.includes(item.id))}>{pending ? 'Sending…' : 'Send to Singa'}</button></div>
    {item && attempted.includes(item.id) && <p>This song was already sent or attempted in this session. Check the Singa queue before sending it again.</p>}
    </details>
    <p role="status" style={{fontSize:13,color:'#cbd5e1',marginBottom:0}}>{status === 'Enter the code from the Singa remote.' ? 'Enter your Singa remote code to connect.' : status === 'Connected. Choose a singer and find their song.' ? 'Ready to sync.' : status}</p>
  </section>;
}
