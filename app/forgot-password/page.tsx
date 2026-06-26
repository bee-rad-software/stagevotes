'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://app.stagevotes.com/reset-password',
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Check your email for a password reset link.');
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Reset your password</h1>
        <p>Enter your email and we’ll send you a reset link.</p>

        <form onSubmit={handleReset}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit">Send reset link</button>
        </form>

        {message && <p>{message}</p>}

        <p>
          <a href="/login">Back to login</a>
        </p>
      </div>
    </main>
  );
}
