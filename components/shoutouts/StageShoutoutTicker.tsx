'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './shoutouts.module.css';

type Message = { id: string; message: string; sender: string; approved_at: string };

export default function StageShoutoutTicker({ eventId, active }: { eventId: string; active: boolean }) {
 const [messages, setMessages] = useState<Message[]>([]);
 const [enabled, setEnabled] = useState(false);
 const [current, setCurrent] = useState<Message | null>(null);
 const seen = useRef(new Set<string>());
 const storageKey = 'stagevotes-shoutouts-seen:' + eventId;

 useEffect(() => {
  seen.current = new Set();
  try {
   const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
   if (Array.isArray(stored)) seen.current = new Set(stored.filter(id => typeof id === 'string'));
  } catch { /* Storage is optional; this window still remembers during its lifetime. */ }
  setCurrent(null); setMessages([]); setEnabled(false);
  let live = true; let sequence = 0;
  const refresh = async () => {
   const request = ++sequence;
   try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/shoutouts`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load shout-outs');
    const data = await response.json();
    if (!live || request !== sequence) return;
    setEnabled(Boolean(data.enabled));
    setMessages(Array.isArray(data.messages) ? data.messages : []);
   } catch {
    if (live && request === sequence) { setEnabled(false); setMessages([]); }
   }
  };
  void refresh();
  const timer = window.setInterval(refresh, 5000);
  return () => { live = false; ++sequence; window.clearInterval(timer); };
 }, [eventId, storageKey]);

 useEffect(() => {
  if (!active || !enabled) { setCurrent(null); return; }
  if (current) {
   if (!messages.some(message => message.id === current.id)) setCurrent(null);
   return;
  }
  const next = [...messages].sort((a, b) => a.approved_at.localeCompare(b.approved_at) || a.id.localeCompare(b.id))
   .find(message => !seen.current.has(message.id));
  if (!next) return;
  seen.current.add(next.id);
  try { sessionStorage.setItem(storageKey, JSON.stringify([...seen.current])); } catch { /* Storage can be blocked. */ }
  setCurrent(next);
 }, [active, enabled, messages, current, storageKey]);

 useEffect(() => {
  if (!current) return;
  const timer = window.setTimeout(() => setCurrent(null), 8000);
  return () => window.clearTimeout(timer);
 }, [current]);

 if (!active || !enabled || !current) return null;
 return <div className={styles.ticker} role="status"><span>📣 SHOUT-OUT</span><strong>{current.message}</strong>{current.sender && <small>— {current.sender}</small>}</div>;
}
