'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSignup() {
    setMessage('');

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password
      });

    if (authError) {
      setMessage(authError.message);
      return;
    }

    const user = authData.user;

    if (!user) {
      setMessage('Check your email to confirm your account, then log in.');
      return;
    }

   const accountId = crypto.randomUUID();

const { error: accountError } = await supabase
  .from('accounts')
  .insert({
    id: accountId,
    name: accountName || 'My StageVotes Account'
  });

    if (accountError) {
      setMessage(accountError.message);
      return;
    }

    const { error: accountUserError } = await supabase
      .from('account_users')
      .insert({
        account_id: account.id,
        user_id: user.id,
        role: 'owner'
      });

    if (accountUserError) {
      setMessage(accountUserError.message);
      return;
    }

    const checkoutResponse = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email,
    accountId: account.id
  })
});

const checkoutData = await checkoutResponse.json();

if (checkoutData.url) {
  window.location.href = checkoutData.url;
} else {
  setMessage(checkoutData.error || 'Unable to start checkout.');
}
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Create your StageVotes account</h1>

        <label>Account / Venue Name</label>
        <input
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
        />

        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSignup}>
          Create Account
        </button>

        {message && <p>{message}</p>}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
  <span>Already have an account? </span>
  <a
    href="/login"
    style={{
      color: '#38bdf8',
      fontWeight: 'bold'
    }}
  >
    Log In
  </a>
</div>
      </div>
    </main>
  );
}
