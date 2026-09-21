'use client';

import { useEffect, useState } from 'react';
import type {
  HostIQAction,
  HostIQRecommendation,
} from '@/lib/hostIQ';
import type { AIHostBriefing } from '@/lib/aiHostIQ';

type Props = {
  targetEndTime: string;
  bufferMinutes: number;
  averageMinutes: number;
  isLiveEstimate: boolean;
  sampleSize: number;
  queueMinutes: number;
  projectedEndTime: string;
  remainingSongs: number;
  remainingSingers: number;
  recommendation: HostIQRecommendation;
  onSaveSettings: (targetEndTime: string, bufferMinutes: number) => Promise<void>;
  onAction: (action: Exclude<HostIQAction, null>) => Promise<void>;
  onGenerateBriefing: () => Promise<AIHostBriefing>;
};

const statusColors = {
  setup: '#7dd3fc',
  healthy: '#86efac',
  watch: '#fde68a',
  warning: '#fca5a5',
  closed: '#c4b5fd',
};

export default function SVHostIQ({
  targetEndTime,
  bufferMinutes,
  averageMinutes,
  isLiveEstimate,
  sampleSize,
  queueMinutes,
  projectedEndTime,
  remainingSongs,
  remainingSingers,
  recommendation,
  onSaveSettings,
  onAction,
  onGenerateBriefing,
}: Props) {
  const [draftEndTime, setDraftEndTime] = useState(targetEndTime);
  const [draftBuffer, setDraftBuffer] = useState(bufferMinutes);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [briefing, setBriefing] = useState<AIHostBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState('');
  const [announcementCopied, setAnnouncementCopied] = useState(false);

  useEffect(() => setDraftEndTime(targetEndTime), [targetEndTime]);
  useEffect(() => setDraftBuffer(bufferMinutes), [bufferMinutes]);

  async function saveSettings() {
    if (!draftEndTime) return;
    setSaving(true);
    try {
      await onSaveSettings(draftEndTime, draftBuffer);
    } finally {
      setSaving(false);
    }
  }

  async function runAction() {
    if (!recommendation.action) return;
    setActing(true);
    try {
      await onAction(recommendation.action);
    } finally {
      setActing(false);
    }
  }

  async function generateBriefing() {
    setBriefingLoading(true);
    setBriefingError('');
    setAnnouncementCopied(false);

    try {
      setBriefing(await onGenerateBriefing());
    } catch (error) {
      setBriefingError(
        error instanceof Error
          ? error.message
          : 'The AI briefing is temporarily unavailable.'
      );
    } finally {
      setBriefingLoading(false);
    }
  }

  async function copyAnnouncement() {
    if (!briefing?.announcement) return;

    try {
      await navigator.clipboard.writeText(briefing.announcement);
      setAnnouncementCopied(true);
      window.setTimeout(() => setAnnouncementCopied(false), 1800);
    } catch {
      setBriefingError('Unable to copy the announcement on this device.');
    }
  }

  const accent = statusColors[recommendation.status];
  const metrics = [
    { label: 'Songs Remaining', value: remainingSongs },
    { label: 'Singers Remaining', value: remainingSingers },
    { label: 'Queue Time', value: `${queueMinutes} min` },
    { label: 'Projected Finish', value: projectedEndTime || '—' },
    {
      label: 'Show Pace',
      value: `${averageMinutes.toFixed(1)} min/song`,
      detail: isLiveEstimate
        ? `${sampleSize} live ${sampleSize === 1 ? 'sample' : 'samples'}`
        : 'starting estimate',
    },
  ];

  return (
    <section
      className="sv-card"
      style={{
        marginBottom: 18,
        border: `1px solid ${accent}55`,
        background: 'linear-gradient(145deg, rgba(15,23,42,.98), rgba(10,30,55,.96))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <div className="sv-card-eyebrow">🧠 HOST IQ</div>
          <h3 style={{ marginBottom: 5 }}>End-Time & Signup Advisor</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>
            Live guidance based on tonight&apos;s queue and pace
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 5, color: '#cbd5e1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            End show by
            <input
              type="time"
              value={draftEndTime}
              onChange={(event) => setDraftEndTime(event.target.value)}
              style={{ minHeight: 40, padding: '8px 10px', borderRadius: 9, border: '1px solid rgba(148,163,184,.3)', background: 'rgba(2,8,23,.75)', color: 'white' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 5, color: '#cbd5e1', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Closing buffer
            <select
              value={draftBuffer}
              onChange={(event) => setDraftBuffer(Number(event.target.value))}
              style={{ minHeight: 40, padding: '8px 10px', borderRadius: 9, border: '1px solid rgba(148,163,184,.3)', background: 'rgba(2,8,23,.75)', color: 'white' }}
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
            </select>
          </label>

          <button type="button" className="btn-small primary" disabled={!draftEndTime || saving} onClick={saveSettings} style={{ minHeight: 40 }}>
            {saving ? 'Saving…' : 'Set Plan'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 9, marginTop: 18 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ padding: '11px 12px', borderRadius: 11, background: 'rgba(2,8,23,.48)', border: '1px solid rgba(148,163,184,.14)' }}>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {metric.label}
            </div>
            <div style={{ marginTop: 4, color: 'white', fontSize: 18, fontWeight: 900 }}>
              {metric.value}
            </div>
            {metric.detail && <div style={{ marginTop: 2, color: '#64748b', fontSize: 11 }}>{metric.detail}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginTop: 14, padding: 14, borderRadius: 12, border: `1px solid ${accent}44`, background: `${accent}10` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flex: '1 1 360px' }}>
          <div className="sv-host-iq-icon" style={{ color: accent }}>
            {recommendation.status === 'warning' ? '⚠️' : recommendation.status === 'healthy' ? '✅' : recommendation.status === 'closed' ? '🔒' : '💡'}
          </div>
          <div>
            <strong style={{ color: accent }}>Host IQ recommends: {recommendation.title}</strong>
            <p style={{ margin: '4px 0 0', color: '#cbd5e1', lineHeight: 1.45 }}>
              {recommendation.message}
            </p>
          </div>
        </div>

        {recommendation.action && recommendation.actionLabel && (
          <button
            type="button"
            onClick={runAction}
            disabled={acting}
            style={{ minHeight: 42, padding: '10px 15px', borderRadius: 10, border: `1px solid ${accent}88`, background: `${accent}22`, color: accent, fontWeight: 900, cursor: acting ? 'wait' : 'pointer' }}
          >
            {acting ? 'Updating…' : recommendation.actionLabel}
          </button>
        )}
      </div>

      <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: '1px solid rgba(56,189,248,.25)', background: 'rgba(14,116,144,.09)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ color: '#7dd3fc' }}>✨ AI Host Briefing</strong>
            <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: 12 }}>
              A plain-language read on the show, plus an announcement you can use.
            </p>
          </div>
          <button
            type="button"
            className="btn-small primary"
            onClick={generateBriefing}
            disabled={briefingLoading}
            style={{ minHeight: 40 }}
          >
            {briefingLoading
              ? 'Thinking…'
              : briefing
              ? 'Refresh Briefing'
              : 'Generate Briefing'}
          </button>
        </div>

        {briefingError && (
          <div role="alert" style={{ marginTop: 12, color: '#fca5a5', fontSize: 13 }}>
            {briefingError} Your regular Host IQ recommendation above is still active.
          </div>
        )}

        {briefing && (
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2,8,23,.5)', border: '1px solid rgba(148,163,184,.14)' }}>
              <div style={{ color: briefing.urgency === 'urgent' ? '#fca5a5' : briefing.urgency === 'watch' ? '#fde68a' : '#86efac', fontWeight: 900 }}>
                {briefing.headline}
              </div>
              <p style={{ margin: '5px 0 0', color: '#cbd5e1', lineHeight: 1.45 }}>
                {briefing.summary}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2,8,23,.5)', border: '1px solid rgba(148,163,184,.14)' }}>
                <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  What to do next
                </div>
                <p style={{ margin: '5px 0 0', color: 'white', lineHeight: 1.45 }}>
                  {briefing.nextAction}
                </p>
              </div>

              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(2,8,23,.5)', border: '1px solid rgba(148,163,184,.14)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    Say this to the room
                  </div>
                  <button type="button" onClick={copyAnnouncement} style={{ border: 0, background: 'transparent', color: '#7dd3fc', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                    {announcementCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p style={{ margin: '5px 0 0', color: 'white', lineHeight: 1.45 }}>
                  “{briefing.announcement}”
                </p>
              </div>
            </div>
          </div>
        )}

        <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: 11 }}>
          AI suggestions are advisory and never change your queue or signup settings automatically.
        </p>
      </div>
    </section>
  );
}
