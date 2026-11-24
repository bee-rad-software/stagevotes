'use client';

import { useEffect, useRef, useState } from 'react';
import { useHostDisplayWindow } from '@/hooks/useHostDisplayWindow';
import { stageControlChannel } from '@/lib/stageDisplayControl';

export default function HistoryDisplayButton({ eventId }: { eventId: string }) {
  const tv = useHostDisplayWindow(eventId, 'display');
  const sidebar = useHostDisplayWindow(eventId, 'karafun-display');
  const lyrics = useHostDisplayWindow(eventId, 'stage-display');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [stageId, setStageId] = useState<string>();

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(stageControlChannel(eventId));
    channelRef.current = channel;
    const screens = new Map<string, number>();
    const sync = () => {
      for (const [id, seen] of screens) if (Date.now() - seen > 7000) screens.delete(id);
      setStageId(screens.keys().next().value);
    };
    channel.onmessage = ({ data }) => {
      if (data?.eventId !== eventId || typeof data.instanceId !== 'string') return;
      if (data.type === 'state' && data.state) screens.set(data.instanceId, Date.now());
      else if (data.type === 'closed') screens.delete(data.instanceId);
      else return;
      sync();
    };
    channel.postMessage({ type: 'ping', eventId });
    const timer = window.setInterval(() => { if (screens.size) sync(); }, 2000);
    return () => {
      window.clearInterval(timer);
      channel.close();
      channelRef.current = null;
    };
  }, [eventId]);

  const close = tv.isOpen ? tv.close : lyrics.isOpen ? lyrics.close : stageId ? () => {
    channelRef.current?.postMessage({
      type: 'command', eventId, targetId: stageId, commandId: crypto.randomUUID(), command: { type: 'close' },
    });
  } : sidebar.isOpen ? sidebar.close : undefined;

  return (
    <button type="button" className="sv-btn sv-btn-secondary" onClick={close ?? tv.open}>
      {close ? 'Close TV Display' : 'Open TV Display'}
    </button>
  );
}
