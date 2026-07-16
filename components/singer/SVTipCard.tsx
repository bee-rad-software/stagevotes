import { Heart } from 'lucide-react';

type Props = {
  tipsEnabled: boolean;
  venmoUrl?: string | null;
  cashappUrl?: string | null;
  applePayUrl?: string | null;
};

export default function SVTipCard({
  tipsEnabled,
  venmoUrl,
  cashappUrl,
  applePayUrl,
}: Props) {
  if (!tipsEnabled || (!venmoUrl && !cashappUrl && !applePayUrl)) {
    return null;
  }

  return (
    <section className="sv-tip-card">
      <Heart size={28} />

      <div>
        <div className="sv-mobile-kicker">Love the show?</div>
        <h2>Tip your host</h2>
        <p>Support the person keeping the music going tonight.</p>
      </div>

      <div className="sv-tip-row">
        {venmoUrl && (
          <a href={venmoUrl} target="_blank" rel="noopener noreferrer">
            <button type="button">Venmo</button>
          </a>
        )}

        {cashappUrl && (
          <a href={cashappUrl} target="_blank" rel="noopener noreferrer">
            <button type="button">Cash App</button>
          </a>
        )}

        {applePayUrl && (
          <a href={applePayUrl} target="_blank" rel="noopener noreferrer">
            <button type="button">Apple Pay</button>
          </a>
        )}
      </div>
    </section>
  );
}