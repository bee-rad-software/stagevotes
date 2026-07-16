'use client';

import {
  CheckCircle2,
  Mic2,
  Music2,
  Smartphone,
  Star,
} from 'lucide-react';

export type SVActivityItem = {
  id: string;
  type: 'join' | 'song-change' | 'score' | 'check-in' | 'performance';
  title: string;
  detail?: string;
  time: string;
};

type Props = {
  items: SVActivityItem[];
};

const iconMap = {
  join: Smartphone,
  'song-change': Music2,
  score: Star,
  'check-in': CheckCircle2,
  performance: Mic2,
};

export default function SVLiveActivity({ items }: Props) {
  return (
    <section className="sv-live-activity">
      <div className="sv-live-activity-header">
        <div>
          <div className="sv-mobile-kicker">Show Activity</div>
          <h2>Tonight’s live feed</h2>
        </div>

        <div className="sv-live-activity-pulse">
          <span />
          Live
        </div>
      </div>

      <div className="sv-live-activity-list">
        {items.length === 0 ? (
          <div className="sv-live-activity-empty">
            Activity from tonight’s show will appear here.
          </div>
        ) : (
          items.map((item) => {
            const Icon = iconMap[item.type];

            return (
              <article
                key={item.id}
                className={`sv-live-activity-item sv-live-activity-${item.type}`}
              >
                <div className="sv-live-activity-icon">
                  <Icon size={18} />
                </div>

                <div className="sv-live-activity-copy">
                  <strong>{item.title}</strong>

                  {item.detail && (
                    <span>{item.detail}</span>
                  )}
                </div>

                <time>{item.time}</time>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}