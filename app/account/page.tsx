'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [venmoUrl, setVenmoUrl] = useState('');
  const [cashappUrl, setCashappUrl] = useState('');
  const [applePayUrl, setApplePayUrl] = useState('');
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = '/login';
      return;
    }

    const { data: accountUser, error: accountUserError } = await supabase
      .from('account_users')
      .select('account_id')
      .eq('user_id', userData.user.id)
      .single();

    if (accountUserError || !accountUser) {
      setMessage('Unable to find your account.');
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, subscription_status, tips_enabled, venmo_url, cashapp_url, apple_pay_url, logo_url')
      .eq('id', accountUser.account_id)
      .single();

    if (accountError || !account) {
      setMessage('Unable to load account settings.');
      return;
    }

    setAccountId(account.id);
    setName(account.name || '');
    setSubscriptionStatus(account.subscription_status || '');
    setTipsEnabled(account.tips_enabled || false);
    setVenmoUrl(account.venmo_url || '');
    setCashappUrl(account.cashapp_url || '');
    setApplePayUrl(account.apple_pay_url || '');
    setLogoUrl(account.logo_url || '');
  }

  async function saveSettings() {
    setMessage('');

    const { error } = await supabase
      .from('accounts')
      .update({
        name,
        tips_enabled: tipsEnabled,
        venmo_url: venmoUrl,
        cashapp_url: cashappUrl,
        apple_pay_url: applePayUrl,
      })
      .eq('id', accountId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('Settings saved.');
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function manageBilling() {
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      setMessage(data.error || 'Unable to open billing portal.');
    }
  }

async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];

  if (!file || !accountId) return;

  setUploading(true);

  const fileExt = file.name.split('.').pop();
  const fileName = `${accountId}-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('venue-logos')
    .upload(fileName, file, {
  upsert: true,
  cacheControl: '3600',
});

  if (error) {
    setMessage(error.message);
    setUploading(false);
    return;
  }

  const { data } = supabase.storage
    .from('venue-logos')
    .getPublicUrl(fileName);

  setLogoUrl(data.publicUrl);

 const { error: updateError } = await supabase
  .from('accounts')
  .update({ logo_url: data.publicUrl })
  .eq('id', accountId);

if (updateError) {
  setMessage(updateError.message);
  setUploading(false);
  return;
}
  setUploading(false);
  setMessage('Logo uploaded.');
}
  
  return (
    <main className="container">
      <div className="card">
        <h1>Account Settings</h1>

<div style={{ marginBottom: '20px' }}>
  <button
    onClick={() => router.back()}
    style={{
      background: '#38bdf8',
      color: '#0f172a',
      border: 'none',
      borderRadius: 999,
      padding: '10px 20px',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}
  >
    ← Back to Dashboard
  </button>
</div>
        
        <label>Account / Venue Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

<h2>Venue Branding</h2>

{logoUrl && (
  <img
    src={logoUrl}
    alt="Venue Logo"
    style={{
      maxHeight: 100,
      marginBottom: 20,
      display: 'block'
    }}
  />
)}

<input
  type="file"
  accept="image/*"
  onChange={uploadLogo}
/>

{uploading && <p>Uploading logo...</p>}
        
        <h2>Subscription</h2>
        <p>Status: {subscriptionStatus || 'Unknown'}</p>

        <button type="button" onClick={manageBilling}>
          Manage Subscription
        </button>

        <h2>Tip Your Host</h2>

    <div
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    width: 'auto'
  }}
>
  <input
    type="checkbox"
    checked={tipsEnabled}
    onChange={(e) => setTipsEnabled(e.target.checked)}
    style={{ width: 'auto', margin: 0 }}
  />

  <label style={{ margin: 0 }}>
    Enable tipping options on singer signup pages
  </label>
</div>
        
{tipsEnabled && (
  <>
        <label>Venmo URL</label>
        <input
          value={venmoUrl}
          onChange={(e) => setVenmoUrl(e.target.value)}
          placeholder="https://venmo.com/yourusername"
        />

        <label>Cash App URL</label>
        <input
          value={cashappUrl}
          onChange={(e) => setCashappUrl(e.target.value)}
          placeholder="https://cash.app/$yourcashtag"
        />

        <label>Apple Pay URL</label>
        <input
          value={applePayUrl}
          onChange={(e) => setApplePayUrl(e.target.value)}
          placeholder="Apple Pay payment link"
        />

        <button type="button" onClick={saveSettings}>
          Save Settings
        </button>
  </>
)}
    
        <button type="button" onClick={logout} style={{ marginLeft: '12px' }}>
          Log Out
        </button>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
