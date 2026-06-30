'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import html2canvas from 'html2canvas';

export default function WinnerGraphicPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [peopleChoiceWinner, setPeopleChoiceWinner] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    setEvent(eventData);

    if (eventData?.account_id) {
      const { data: accountData } = await supabase
        .from('accounts')
        .select('logo_url')
        .eq('id', eventData.account_id)
        .single();

      setLogoUrl(accountData?.logo_url || '');
    }

    const { data: performances } = await supabase
      .from('performances')
      .select('*')
      .eq('event_id', eventId);

    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('event_id', eventId);

    const totals: Record<string, number> = {};

    votes?.forEach((vote) => {
      const performance = performances?.find(
        (p) => p.id === vote.performance_id
      );

      if (!performance) return;

      const singer = performance.singer_name;

      totals[singer] = (totals[singer] || 0) + Number(vote.score || 0);
    });

    const rankings = Object.entries(totals)
      .map(([singer, total]) => ({
        singer,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    setLeaderboard(rankings);

    const { data: peopleVotes } = await supabase
      .from('peoples_choice_votes')
      .select('singer_name')
      .eq('event_id', eventId);

    const counts: Record<string, number> = {};

    peopleVotes?.forEach((vote) => {
      counts[vote.singer_name] =
        (counts[vote.singer_name] || 0) + 1;
    });

    const winner = Object.entries(counts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    setPeopleChoiceWinner(winner?.[0] || '');
  }

async function downloadGraphic() {
  const card = document.getElementById('winner-card');

  if (!card) return;

  const canvas = await html2canvas(card, {
    backgroundColor: null,
    scale: 2,
  });

  const link = document.createElement('a');
  link.download = `${event?.name || 'stagevotes'}-winners.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
  
  return (
    <main className="container">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/history/${eventId}`}>
          <button>← Back to Report</button>
        </Link>
      </div>

      <div
        id="winner-card"
        style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: 40,
          borderRadius: 24,
          textAlign: 'center',
          background:
            'linear-gradient(135deg, #0f172a, #1e293b)',
          color: 'white',
          border: '4px solid gold'
        }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Venue Logo"
            style={{
              maxHeight: 120,
              margin: '0 auto 30px',
              display: 'block'
            }}
          />
        )}

        <h1>🏆 Contest Results 🏆</h1>

        <h2>{event?.name}</h2>

        <div style={{ marginTop: 40 }}>
          <h2>🥇 {leaderboard[0]?.singer || 'TBD'}</h2>
          <h3>🥈 {leaderboard[1]?.singer || 'TBD'}</h3>
          <h3>🥉 {leaderboard[2]?.singer || 'TBD'}</h3>
        </div>

        {peopleChoiceWinner && (
          <div style={{ marginTop: 40 }}>
            <h2>
              🗳️ People's Choice
            </h2>

            <h3>{peopleChoiceWinner}</h3>
          </div>
        )}

        <p
          style={{
            marginTop: 50,
            opacity: 0.8
          }}
        >
          Powered by StageVotes
        </p>
      </div>

      <div
        style={{
          textAlign: 'center',
          marginTop: 30
        }}
      >
       <button onClick={downloadGraphic}>
  Download Graphic
</button>
      </div>
    </main>
  );
}
