'use client';

export default function PricingPage() {
  async function subscribe() {
    const email = prompt('Enter your email');

    if (!email) return;

    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Unable to start checkout');
    }
  }

  return (
    <main className="container">
      <div className="card">
        <h1>StageVotes Pro</h1>
        <h2>$19.99/month</h2>

        <p>Karaoke contest queue, judge voting, audience voting, and live leaderboard.</p>

        <button onClick={subscribe}>
          Start Subscription
        </button>
      </div>
    </main>
  );
}
