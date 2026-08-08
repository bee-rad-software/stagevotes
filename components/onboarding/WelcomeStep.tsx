import type { ReactNode } from 'react';
import {
  CheckCircle2,
  ListOrdered,
  MonitorPlay,
  Star,
  Trophy,
} from 'lucide-react';

export default function WelcomeStep() {
  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">
        Built for hosts and venues
      </div>

      <h1>Welcome to StageVotes</h1>

      <p className="onboarding-lead">
        Everything you need to run unforgettable karaoke nights—from
        singer signups and live voting to judge scoring, People&apos;s
        Choice, and league-ready competition.
      </p>

      <div className="onboarding-feature-grid">
        <FeatureCard
          icon={<ListOrdered size={24} strokeWidth={2.2} />}
          title="Smarter queue management"
          description="Keep singers informed and your show moving."
        />

        <FeatureCard
          icon={<Star size={24} strokeWidth={2.2} />}
          title="Live voting"
          description="Support judges, audiences, and People's Choice."
        />

        <FeatureCard
          icon={<Trophy size={24} strokeWidth={2.2} />}
          title="League ready"
          description="Build repeat engagement with rankings and profiles."
        />

        <FeatureCard
          icon={<MonitorPlay size={24} strokeWidth={2.2} />}
          title="Live displays"
          description="Keep the room involved with a polished TV experience."
        />
      </div>

      <div className="onboarding-trust-list">
        <TrustItem label="7-Day Free Trial" />
        <TrustItem label="No Setup Fees" />
        <TrustItem label="Cancel Anytime" />
      </div>
    </div>
  );
}

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="onboarding-feature-card">
      <div className="onboarding-feature-icon">{icon}</div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <div className="onboarding-trust-item">
      <CheckCircle2 size={18} />
      <span>{label}</span>
    </div>
  );
}