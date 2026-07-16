'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, History, Music2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Performance = {
  id: string;
  song_title: string;
  artist: string | null;
  status: string;
  created_at?: string;
};

export default function SingerHistoryPage() {
  const params = useParams();
  const router = useRouter();

  const eventId = params.eventId as string;

  const [performances, setPerformances] = useState<Performance[]>([]);
  const [singerName, setSingerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const savedName =
        window.localStorage.getItem('karavote_singer_name') || '';

      const deviceId =
        window.localStorage.getItem('karavote_device_id') || '';

      setSingerName(savedName);

      if (!savedName && !deviceId) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('performances')
        .select('id, song_title, artist, status, created_at')
        .order('created_at', { ascending: false });

      if (deviceId) {
        query = query.eq('device_id', deviceId);
      } else {
        query = query.ilike('singer_name', savedName.trim());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Could not load singer history:', error.message);
        setLoading(false);
        return;
      }

      setPerformances(data || []);
      setLoading(false);
    }

    loadHistory();
  }, [eventId]);

  return (
    <main className="sv-mobile-page">
      <section className="sv-mobile-card">
        <button
          type="button"
          className="sv-history-back"
          onClick={() => router.push(`/singer/${eventId}`)}
        >
          <ArrowLeft size={18} />
          Back to My Stage
        </button>

        <div className="sv-history-heading">
          <History size={28} />

          <div>
            <div className="sv-mobile-kicker">
              {singerName ? `${singerName}'s History` : 'Singer History'}
            </div>

            <h1>Songs You’ve Sung</h1>
          </div>
        </div>

        {loading && (
          <div className="sv-picker-empty">
            Loading your history...
          </div>
        )}

        {!loading && performances.length === 0 && (
          <div className="sv-join-empty">
            <div className="sv-join-empty-icon">
              <Music2 size={22} />
            </div>

            <strong>No performances yet</strong>
            <span>Your completed songs will appear here.</span>
          </div>
        )}

        {!loading &&
          performances.map((performance, index) => (
            <div
              key={performance.id}
              className="sv-history-song"
            >
              <div className="sv-history-number">
                #{performances.length - index}
              </div>

              <div>
                <strong>{performance.song_title}</strong>

                {performance.artist && (
                  <span>by {performance.artist}</span>
                )}

                <small>
                  {performance.status === 'completed'
                    ? 'Performance completed'
                    : 'Currently in rotation'}
                </small>
              </div>
            </div>
          ))}
      </section>
    </main>
  );
}