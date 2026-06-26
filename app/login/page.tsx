'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin() {
    setMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push('/');
  }

  return (
    <main className="container">
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
  <Image
    src="/stagevotes-logo.png"
    alt="StageVotes Logo"
    width={300}
    height={120}
    priority
  />
</div>
        <h1>Log in to StageVotes</h1>

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

      <button onClick={handleLogin}>
  Log In
</button>

{message && <p>{message}</p>}

<div
  style={{
    marginTop: 24,
    textAlign: 'center'
  }}
>
  <span>Don't have an account? </span>

  <a
    href="/signup"
    style={{
      color: '#38bdf8',
      fontWeight: 'bold'
    }}
  >
    Create Account
  </a>
</div>
      </div>
    </main>
  );
}
