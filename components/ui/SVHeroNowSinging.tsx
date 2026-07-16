import { Mic2, Clock3 } from 'lucide-react';

export default function SVHeroNowSinging() {
  return (
    <section className="sv-hero">

      <div className="sv-hero-stage-light" />

      <div className="sv-hero-live">

        <span className="sv-live-dot" />

        LIVE NOW

      </div>

      <div className="sv-hero-content">

        <div className="sv-hero-left">

          <div className="sv-hero-avatar">
            BB
          </div>

          <div>

            <div className="sv-hero-name">
              Brad Bock
            </div>

            <div className="sv-hero-song">
              ♪ Are You Gonna Be My Girl
            </div>

          </div>

        </div>

        <div className="sv-hero-right">

          <Mic2 size={56} />

        </div>

      </div>

      <div className="sv-hero-footer">

        <div>

          <Clock3 size={18} />

          <span>1:42 elapsed</span>

        </div>

        <div>

          Voting Open

        </div>

      </div>

    </section>
  );
}