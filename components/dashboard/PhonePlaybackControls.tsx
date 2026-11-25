'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Action = 'play' | 'pause' | 'next';
type Snapshot = { online?: boolean; busy?: boolean; controls?: Action[]; currentId?: string; nextId?: string; command?: { action: Action; currentId: string; nextId?: string } };
const offline: Snapshot = {};

type Props = {
  eventId: string;
  connected: boolean;
  controls: Action[];
  currentId?: string;
  nextId?: string;
  execute: (action: Action) => void;
};

export default function PhonePlaybackControls(props: Props) {
  const { eventId, connected } = props;
  const latest = useRef(props);
  latest.current = props;
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(offline);
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const relay = enabled && connected;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const relayId = relay ? crypto.randomUUID() : null;
    async function poll() {
      const state = latest.current;
      const startedAt = performance.now();
      try {
        const { data, error } = await supabase.rpc('host_phone_playback_access', {
          p_event_id: eventId, p_operation: relay ? 'tick' : 'read',
          ...(relay ? { p_relay_id: relayId, p_controls: state.controls, p_current_id: state.currentId, p_next_id: state.nextId } : {}),
        });
        if (!active) return;
        const result = data as Snapshot | null;
        const next = !error && result?.online ? result : offline;
        setSnapshot(previous =>
          previous.online === next.online && previous.currentId === next.currentId &&
          previous.nextId === next.nextId && previous.controls?.join(',') === next.controls?.join(',')
            ? previous : next
        );
        if (relay) {
          setStatus(error ? 'Phone remote unavailable.' : result?.busy ? 'Another host window is sharing playback.' : '');
          const cmd = result?.command;
          const current = latest.current;
          if (cmd && performance.now() - startedAt < 4000 && current.connected && cmd.currentId === current.currentId &&
              (cmd.action !== 'next' || cmd.nextId === current.nextId) && current.controls.includes(cmd.action)) {
            current.execute(cmd.action);
          }
        }
      } catch {
        if (active) setSnapshot(offline);
      } finally {
        if (active) timer = setTimeout(poll, relay ? 900 : 2000);
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
      if (relayId) void supabase.rpc('host_phone_playback_access', {
        p_event_id: eventId, p_operation: 'stop', p_relay_id: relayId,
      }).then(() => {});
    };
  }, [eventId, relay]);

  async function send(action: Action) {
    if (sending || !snapshot.online || !snapshot.controls?.includes(action)) return;
    if (action === 'next' && !window.confirm('Skip the current song and move to the next singer?')) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('host_phone_playback_access', {
        p_event_id: eventId, p_operation: 'send', p_action: action,
        p_current_id: snapshot.currentId, p_next_id: snapshot.nextId,
      });
      setStatus(error ? error.message : data?.accepted ? 'Command sent to the host computer.' : 'The host computer is no longer connected.');
    } catch {
      setStatus('Could not reach the host computer.');
    } finally {
      setSending(false);
    }
  }

  if (!connected && !snapshot.online) return null;

  return <section id="phone-playback-controls" className="sv-card" aria-label="Phone playback controls" style={{padding: 16, margin: '12px 0'}}>
    <strong>Phone playback controls</strong>
    {connected && <p><label><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)}/> Allow phone control from this host screen</label></p>}
    {relay ? <p>{snapshot.online ? 'Ready. Open this show on your phone using the same login.' : 'Connecting the phone remote…'}</p> :
      snapshot.online ? <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
        {(['play','pause','next'] as const).map(action =>
          <button key={action} type="button" className="sv-btn sv-btn-secondary" disabled={sending || !snapshot.controls?.includes(action)} onClick={() => void send(action)}>
            {{play:'Play',pause:'Pause',next:'Next song'}[action]}
          </button>
        )}
      </div> : null}
    {status && <p role="status">{status}</p>}
  </section>;
}
