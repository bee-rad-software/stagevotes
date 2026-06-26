'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Password updated. You can now log in.');
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Choose a new password</h1>

        <form onSubmit={handleUpdatePassword}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Update password</button>
        </form>

        {message && <p>{message}</p>}

        <p>
          <a href="/login">Back to login</a>
        </p>
      </div>
    </main>
  );
}
