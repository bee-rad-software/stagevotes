'use client';

import {
  LogIn,
  Sparkles,
  UserPlus,
} from 'lucide-react';

type SVSingerProfilePromptProps = {
  onCreateProfile: () => void;
  onSignIn: () => void;
};

export default function SVSingerProfilePrompt({
  onCreateProfile,
  onSignIn,
}: SVSingerProfilePromptProps) {
  return (
    <section className="sv-singer-profile-prompt">
      <div className="sv-singer-profile-prompt-icon">
        <Sparkles size={24} />
      </div>

      <div className="sv-singer-profile-prompt-copy">
        <div className="sv-mobile-kicker">
          Save your StageVotes history
        </div>

        <h2>Make your singer profile yours</h2>

        <p>
          Create a free profile to keep your performances,
          stats, achievements, and favorite songs wherever
          you sing.
        </p>
      </div>

      <div className="sv-singer-profile-prompt-actions">
        <button
          type="button"
          className="sv-primary-button"
          onClick={onCreateProfile}
        >
          <UserPlus size={18} />
          Create Free Profile
        </button>

        <button
          type="button"
          className="sv-secondary-button"
          onClick={onSignIn}
        >
          <LogIn size={18} />
          Sign In
        </button>
      </div>
    </section>
  );
}