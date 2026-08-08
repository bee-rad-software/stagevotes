'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, Building2 } from 'lucide-react';

import { signupHost } from '@/lib/auth/signupHost';

type AccountStepProps = {
  onComplete: (data: {
    userId: string;
    accountId: string;
    email: string;
    accountName: string;
  }) => void;
};

export default function AccountStep({
  onComplete,
}: AccountStepProps) {
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [showPassword, setShowPassword] =
    useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) return;

    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Your passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signupHost({
        accountName,
        email,
        password,
      });

      if (result.emailConfirmationRequired) {
        setMessage(
          'Check your email to confirm your account, then return to StageVotes.'
        );
        setIsLoading(false);
        return;
      }

      onComplete({
        userId: result.userId,
        accountId: result.accountId,
        email: email.trim(),
        accountName: accountName.trim(),
      });
    } catch (error) {
      console.error(
        'StageVotes onboarding signup failed:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'We could not create your account. Please try again.'
      );

      setIsLoading(false);
    }
  }

  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">
        Create your host account
      </div>

      <h1>Let&apos;s get you set up</h1>

      <p className="onboarding-lead">
        Create the account you&apos;ll use to manage shows,
        venues, voting, and your StageVotes subscription.
      </p>

      <form
        className="onboarding-form"
        onSubmit={handleSubmit}
      >
        <div className="onboarding-field">
          <label htmlFor="onboarding-account-name">
            Account or business name
          </label>

          <div className="onboarding-input-wrap">
            <Building2 size={19} />

            <input
              id="onboarding-account-name"
              autoFocus
              type="text"
              value={accountName}
              onChange={(event) =>
                setAccountName(event.target.value)
              }
              placeholder="Your venue or host business"
              autoComplete="organization"
              required
              disabled={isLoading}
            />
          </div>

          <p>
            You can add specific venue details on the next
            step.
          </p>
        </div>

        <div className="onboarding-field">
          <label htmlFor="onboarding-email">
            Email address
          </label>

          <div className="onboarding-input-wrap">
            <Mail size={19} />

            <input
              id="onboarding-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="onboarding-form-grid">
          <div className="onboarding-field">
            <label htmlFor="onboarding-password">
              Password
            </label>

            <div className="onboarding-input-wrap">
              <LockKeyhole size={19} />

              <input
                id="onboarding-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={isLoading}
              />

              <button
                type="button"
                className="onboarding-password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword
                    ? 'Hide passwords'
                    : 'Show passwords'
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="onboarding-field">
            <label htmlFor="onboarding-confirm-password">
              Confirm password
            </label>

            <div className="onboarding-input-wrap">
              <LockKeyhole size={19} />

              <input
                id="onboarding-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Enter it again"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {message && (
          <div
            className="onboarding-message onboarding-message-error"
            role="alert"
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          className="onboarding-submit-button"
          disabled={isLoading}
        >
          {isLoading
            ? 'Creating your account...'
            : 'Create Account and Continue'}
        </button>
      </form>
    </div>
  );
}