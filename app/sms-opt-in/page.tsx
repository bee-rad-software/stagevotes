'use client';

import AppQRCode from '@/components/AppQRCode';

const proofUrl =
  'https://app.stagevotes.com/sms-opt-in#example-form';

export default function SmsOptInPage() {
  return (
    <main className="container" style={{ maxWidth: 900 }}>
      <div className="card" style={{ padding: 28 }}>
        <div style={{ color: '#38bdf8', fontWeight: 900, letterSpacing: '.08em' }}>
          STAGEVOTES SINGER ALERTS
        </div>
        <h1>SMS Opt-In Process</h1>
        <p className="small" style={{ fontSize: 16, lineHeight: 1.65 }}>
          This page documents how singers voluntarily request time-sensitive StageVotes karaoke
          queue notifications. The alerts are transactional and are never used for marketing.
        </p>

        <div className="grid" style={{ marginTop: 24, alignItems: 'start' }}>
          <section>
            <h2>1. Scan the venue QR code</h2>
            <p className="small" style={{ lineHeight: 1.6 }}>
              Each venue displays a StageVotes QR code. It opens that venue&apos;s current public
              singer signup form. The demonstration QR below opens the example form on this page.
            </p>
            <div className="qr-box" aria-label="StageVotes SMS opt-in demonstration QR code">
              <AppQRCode value={proofUrl} size={190} />
            </div>
          </section>

          <section id="example-form">
            <h2>2. Opt in on the web form</h2>
            <div
              style={{
                padding: 20,
                border: '1px solid rgba(56,189,248,.35)',
                borderRadius: 18,
                background: '#0b1220',
              }}
            >
              <label htmlFor="proof-name" style={{ fontWeight: 800 }}>Your Name</label>
              <input id="proof-name" value="Example Singer" readOnly />

              <label htmlFor="proof-phone" style={{ fontWeight: 800 }}>
                Mobile Number <span className="small">(optional)</span>
              </label>
              <input id="proof-phone" value="(479) 555-0123" readOnly />

              <label
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr',
                  gap: 12,
                  alignItems: 'start',
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  aria-label="Example SMS consent checkbox"
                  style={{ width: 20, height: 20, margin: 2 }}
                />
                <span>
                  Text me when I&apos;m on deck and when it&apos;s my turn. Up to 2 messages per queued
                  song. Message and data rates may apply. Reply STOP to opt out or HELP for help.
                  Consent is optional and is not required to participate.
                </span>
              </label>
            </div>
          </section>
        </div>

        <section style={{ marginTop: 28 }}>
          <h2>3. Receive requested queue alerts</h2>
          <p className="small" style={{ fontSize: 15, lineHeight: 1.65 }}>
            After actively checking the consent box and submitting a song, a singer may receive an
            on-deck alert and a you&apos;re-up alert for that queued performance. The checkbox is
            unchecked by default. Phone numbers are not purchased, rented, or obtained from third
            parties, and consent is not shared.
          </p>
          <p>
            <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a>
          </p>
        </section>
      </div>
    </main>
  );
}
