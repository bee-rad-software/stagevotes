'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
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
  const router = useRouter();

 async function getMyAccountId() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    router.push('/login');
    return null;
  }

  const { data: accountUser, error } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', userData.user.id)
    .single();

  if (error || !accountUser) {
    alert('No account found for this user.');
    return null;
  }

  return accountUser.account_id;
}

async function loadMyAccount() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const { data: accountUser } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .single();

  if (!accountUser) return;

  const { data: account } = await supabase
    .from('accounts')
    .select('name')
    .eq('id', accountUser.account_id)
    .single();

  if (account?.name) {
    setVenue(account.name);
  }
}
  
  async function createEvent() {
    setError('');
    const accountId = await getMyAccountId();
if (!accountId) return;
    const { data, error } = await supabase
      .from('events')
      .insert({
  name,
  venue,
  account_id: accountId,      
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
      <h1>StageVotes</h1>
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

<div
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
    alignItems: 'flex-start'
  }}
>
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="checkbox"
      checked={showSignupQR}
      onChange={(e) => setShowSignupQR(e.target.checked)}
      style={{ width: 18, height: 18 }}
    />
    <span>Show Signup QR</span>
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="checkbox"
      checked={showVotingQR}
      onChange={(e) => setShowVotingQR(e.target.checked)}
      style={{ width: 18, height: 18 }}
    />
    <span>Show Voting QR</span>
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <input
      type="checkbox"
      checked={showPeoplesChoiceQR}
      onChange={(e) => setShowPeoplesChoiceQR(e.target.checked)}
      style={{ width: 18, height: 18 }}
    />
    <span>Show People&apos;s Choice QR</span>
  </div>
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
