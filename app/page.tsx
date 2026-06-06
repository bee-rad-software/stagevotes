'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function HomePage() {
  const [name, setName] = useState('Saturday Night Karaoke Contest');
  const [venue, setVenue] = useState('Pub on the Bricks');
  const [pin, setPin] = useState('1234');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<string[]>([
  'Overall Performance'
]);
  const [tiebreakerCategory, setTiebreakerCategory] = useState('Overall Performance');
  const [showSignupQR, setShowSignupQR] = useState(true);
const [showVotingQR, setShowVotingQR] = useState(true);
const [showPeoplesChoiceQR, setShowPeoplesChoiceQR] = useState(true);

  async function createEvent() {
    setError('');
    const { data, error } = await supabase
      .from('events')
      .insert({
  name,
  venue,
  host_pin: pin,
  tiebreaker_category_name: tiebreakerCategory,
        show_signup_qr: showSignupQR,
show_voting_qr: showVotingQR,
show_peoples_choice_qr: showPeoplesChoiceQR
})
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    const validCategories = categories
  .map((c) => c.trim())
  .filter(Boolean);

if (validCategories.length > 0) {
  const { error: categoryError } = await supabase
    .from('vote_categories')
    .insert(
      validCategories.map((category) => ({
        event_id: data.id,
        category_name: category
      }))
    );

  if (categoryError) {
    setError(categoryError.message);
    return;
  }
}

setCreatedId(data.id);
  }


  return (
    <main className="container">
      <h1>KaraVote</h1>
      <p className="small">Karaoke contest queue + audience voting + live leaderboard.</p>

      <div className="card">
        <h2>Create a contest</h2>
        <label>Contest name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>Venue</label>
        <input value={venue} onChange={(e) => setVenue(e.target.value)} />

        <label>Host PIN</label>
        <input value={pin} onChange={(e) => setPin(e.target.value)} />

        <h3>Voting Categories</h3>

{categories.map((category, index) => (
  <input
    key={index}
    value={category}
    onChange={(e) => {
      const updated = [...categories];
      updated[index] = e.target.value;
      setCategories(updated);
    }}
    placeholder={`Category ${index + 1}`}
  />
))}

<label>Tiebreaker Category</label>
<select
  value={tiebreakerCategory}
  onChange={(e) => setTiebreakerCategory(e.target.value)}
>
  {categories
    .map((c) => c.trim())
    .filter(Boolean)
    .map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
</select>

        <h3>QR Code Options</h3>

<div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="checkbox"
      checked={showSignupQR}
      onChange={(e) => setShowSignupQR(e.target.checked)}
    />
    Show Signup QR
  </label>

  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="checkbox"
      checked={showVotingQR}
      onChange={(e) => setShowVotingQR(e.target.checked)}
    />
    Show Voting QR
  </label>

  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="checkbox"
      checked={showPeoplesChoiceQR}
      onChange={(e) => setShowPeoplesChoiceQR(e.target.checked)}
    />
    Show People&apos;s Choice QR
  </label>
</div>
        
<button
  className="secondary"
  onClick={() => setCategories([...categories, ''])}
>
  Add Category
</button>

        <button onClick={createEvent}>Create Event</button>

        {error && <p>{error}</p>}

        {createdId && (
          <div className="card">
            <p>Event created.</p>
            <div className="row">
              <Link href={`/host/${createdId}`}>
                <button>Open Host Dashboard</button>
              </Link>
              <Link href={`/vote/${createdId}`}>
                <button className="secondary">Open Audience Voting</button>
              </Link>
              <Link href={`/leaderboard/${createdId}`}>
                <button className="secondary">Open Leaderboard</button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
