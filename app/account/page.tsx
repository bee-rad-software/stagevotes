'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SVShell from '@/components/ui/SVShell';
import {
  Building2,
  CircleCheck,
  CreditCard,
  ExternalLink,
  HandCoins,
  ImageIcon,
  LoaderCircle,
  LogOut,
  QrCode,
  Save,
  Trash2,
} from 'lucide-react';

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
  const [staticSignupQr, setStaticSignupQr] = useState(false);
  const [staticJudgeQr, setStaticJudgeQr] = useState(false);
  const [staticPeopleQr, setStaticPeopleQr] = useState(false);

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
      .select('id, name, subscription_status, tips_enabled, venmo_url, cashapp_url, apple_pay_url, logo_url, static_signup_qr, static_judge_qr, static_people_qr')
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
    setStaticSignupQr(account.static_signup_qr || false);
    setStaticJudgeQr(account.static_judge_qr || false);
    setStaticPeopleQr(account.static_people_qr || false);
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
        static_signup_qr: staticSignupQr,
        static_judge_qr: staticJudgeQr,
        static_people_qr: staticPeopleQr,
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

async function removeLogo() {
  setMessage('');

  const { error } = await supabase
    .from('accounts')
    .update({ logo_url: null })
    .eq('id', accountId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setLogoUrl('');
  setMessage('Logo removed.');
}
  
return (
  <SVShell
    title="Account"
    subtitle="Manage your organization, branding, billing, and audience settings."
  >
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'minmax(0, 1.25fr) minmax(300px, 0.75fr)',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 20,
        }}
      >
        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(56,189,248,0.12)',
                color: '#38bdf8',
              }}
            >
              <Building2 size={22} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Organization
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  opacity: 0.65,
                  fontSize: 13,
                }}
              >
                Your venue or company identity inside StageVotes.
              </p>
            </div>
          </div>

          <label
            htmlFor="account-name"
            style={{
              display: 'block',
              marginBottom: 7,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Account or venue name
          </label>

          <input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your venue or company name"
          />
        </section>

        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(249,115,22,0.12)',
                color: '#f97316',
              }}
            >
              <ImageIcon size={22} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Venue Branding
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  opacity: 0.65,
                  fontSize: 13,
                }}
              >
                Add your logo to singer, voting, and display experiences.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(140px, 180px) minmax(0, 1fr)',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                minHeight: 140,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,0.035)',
                border: '1px dashed rgba(255,255,255,0.16)',
                overflow: 'hidden',
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Venue logo"
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: 120,
                    objectFit: 'contain',
                    padding: 12,
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    opacity: 0.55,
                    fontSize: 12,
                    padding: 18,
                  }}
                >
                  <ImageIcon
                    size={28}
                    style={{
                      marginBottom: 8,
                    }}
                  />

                  <div>No logo uploaded</div>
                </div>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gap: 12,
              }}
            >
              <label
                htmlFor="venue-logo"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Upload logo
              </label>

              <input
                id="venue-logo"
                type="file"
                accept="image/*"
                onChange={uploadLogo}
              />

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  opacity: 0.6,
                  lineHeight: 1.5,
                }}
              >
                Square or horizontal PNG and JPG files work best.
              </p>

              {uploading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#38bdf8',
                  }}
                >
                  <LoaderCircle
                    size={16}
                    className="sv-spin"
                  />
                  Uploading logo...
                </div>
              )}

              {logoUrl && (
                <button
                  type="button"
                  className="secondary"
                  onClick={removeLogo}
                  style={{
                    width: 'fit-content',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Trash2 size={16} />
                  Remove Logo
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(192,132,252,0.12)',
                color: '#c084fc',
              }}
            >
              <QrCode size={22} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Static QR Codes
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  opacity: 0.65,
                  fontSize: 13,
                }}
              >
                Reuse printed QR codes while StageVotes routes guests to the active show.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 10,
            }}
          >
            {[
              {
                label: 'Singer Signup',
                description:
                  'Use one permanent QR code for singer registration.',
                checked: staticSignupQr,
                onChange: setStaticSignupQr,
              },
              {
                label: 'Judge Voting',
                description:
                  'Use one permanent QR code for judge ballots.',
                checked: staticJudgeQr,
                onChange: setStaticJudgeQr,
              },
              {
                label: "People's Choice",
                description:
                  'Use one permanent QR code for audience voting.',
                checked: staticPeopleQr,
                onChange: setStaticPeopleQr,
              },
            ].map((setting) => (
              <label
                key={setting.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: 15,
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <strong>{setting.label}</strong>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      opacity: 0.6,
                    }}
                  >
                    {setting.description}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={setting.checked}
                  onChange={(e) =>
                    setting.onChange(e.target.checked)
                  }
                  style={{
                    width: 20,
                    height: 20,
                    margin: 0,
                    flexShrink: 0,
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: tipsEnabled ? 22 : 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(74,222,128,0.12)',
                  color: '#4ade80',
                }}
              >
                <HandCoins size={22} />
              </div>

              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  Tip Your Host
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    opacity: 0.65,
                    fontSize: 13,
                  }}
                >
                  Show payment links on singer-facing pages.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={tipsEnabled}
              onChange={(e) => setTipsEnabled(e.target.checked)}
              style={{
                width: 20,
                height: 20,
                margin: 0,
              }}
            />
          </div>

          {tipsEnabled && (
            <div
              style={{
                display: 'grid',
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="venmo-url"
                  style={{
                    display: 'block',
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Venmo URL
                </label>

                <input
                  id="venmo-url"
                  value={venmoUrl}
                  onChange={(e) => setVenmoUrl(e.target.value)}
                  placeholder="https://venmo.com/yourusername"
                />
              </div>

              <div>
                <label
                  htmlFor="cashapp-url"
                  style={{
                    display: 'block',
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Cash App URL
                </label>

                <input
                  id="cashapp-url"
                  value={cashappUrl}
                  onChange={(e) => setCashappUrl(e.target.value)}
                  placeholder="https://cash.app/$yourcashtag"
                />
              </div>

              <div>
                <label
                  htmlFor="apple-pay-url"
                  style={{
                    display: 'block',
                    marginBottom: 7,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Apple Pay URL
                </label>

                <input
                  id="apple-pay-url"
                  value={applePayUrl}
                  onChange={(e) => setApplePayUrl(e.target.value)}
                  placeholder="Apple Pay payment link"
                />
              </div>
            </div>
          )}
        </section>
      </div>

      <aside
        style={{
          display: 'grid',
          gap: 20,
          position: 'sticky',
          top: 20,
        }}
      >
        <section className="sv-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(250,204,21,0.12)',
                color: '#facc15',
              }}
            >
              <CreditCard size={22} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Subscription
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  opacity: 0.65,
                  fontSize: 13,
                }}
              >
                Billing and plan management.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 15,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                opacity: 0.6,
                marginBottom: 6,
              }}
            >
              Current status
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                borderRadius: 999,
                padding: '6px 10px',
                background:
                  subscriptionStatus === 'active' ||
                  subscriptionStatus === 'trialing'
                    ? 'rgba(74,222,128,0.12)'
                    : 'rgba(248,113,113,0.12)',
                color:
                  subscriptionStatus === 'active' ||
                  subscriptionStatus === 'trialing'
                    ? '#4ade80'
                    : '#f87171',
                fontSize: 12,
                fontWeight: 800,
                textTransform: 'capitalize',
              }}
            >
              <CircleCheck size={14} />
              {subscriptionStatus || 'Unknown'}
            </span>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={manageBilling}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ExternalLink size={16} />
            Manage Subscription
          </button>
        </section>

        <section className="sv-card">
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            Save Changes
          </h2>

          <p
            style={{
              margin: '7px 0 18px',
              opacity: 0.65,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Save changes to your organization, QR codes, and host payment settings.
          </p>

          <button
            type="button"
            onClick={saveSettings}
            disabled={!accountId}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              fontWeight: 800,
              cursor: accountId ? 'pointer' : 'not-allowed',
              opacity: accountId ? 1 : 0.55,
            }}
          >
            <Save size={17} />
            Save Settings
          </button>

          {message && (
            <div
              style={{
                marginTop: 14,
                borderRadius: 10,
                padding: '11px 12px',
                background:
                  message.toLowerCase().includes('saved') ||
                  message.toLowerCase().includes('uploaded') ||
                  message.toLowerCase().includes('removed')
                    ? 'rgba(74,222,128,0.1)'
                    : 'rgba(248,113,113,0.1)',
                color:
                  message.toLowerCase().includes('saved') ||
                  message.toLowerCase().includes('uploaded') ||
                  message.toLowerCase().includes('removed')
                    ? '#4ade80'
                    : '#f87171',
                fontSize: 13,
              }}
            >
              {message}
            </div>
          )}
        </section>

        <section className="sv-card">
          <h2
            style={{
              margin: 0,
              fontSize: 20,
            }}
          >
            Session
          </h2>

          <p
            style={{
              margin: '7px 0 18px',
              opacity: 0.65,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Sign out of this StageVotes account on the current device.
          </p>

          <button
            type="button"
            className="secondary"
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              color: '#f87171',
            }}
          >
            <LogOut size={16} />
            Log Out
          </button>
        </section>
      </aside>
    </div>
  </SVShell>
  );
}