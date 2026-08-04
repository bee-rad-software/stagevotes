'use client';

import {
  FormEvent,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewTournamentPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] =
    useState('');
  const [startsAt, setStartsAt] =
    useState('');
  const [endsAt, setEndsAt] =
    useState('');
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim() || saving) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'Sign in before creating a tournament.'
        );
      }

      const {
        data: accountUser,
        error: accountError,
      } = await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (accountError) {
        throw accountError;
      }

      if (!accountUser?.account_id) {
        throw new Error(
          'No StageVotes account was found.'
        );
      }

      const slugBase =
        createSlug(name) || 'tournament';

      const uniqueSlug =
        `${slugBase}-${Date.now()}`;

      const {
        data: tournament,
        error,
      } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          slug: uniqueSlug,
          description:
            description.trim() || null,
          status: 'draft',
          starts_at:
            startsAt || null,
          ends_at:
            endsAt || null,
          created_by_account_id:
            accountUser.account_id,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      router.push(
        `/tournament-director/${tournament.id}`
      );
    } catch (error) {
      console.error(
        'Unable to create tournament:',
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create tournament.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="sv-director-form-page">
      <form
        onSubmit={handleSubmit}
        className="sv-director-form"
      >
        <div className="sv-director-eyebrow">
          New Tournament
        </div>

        <h1>Create a championship</h1>

        <p>
          You will add qualifier venues,
          advancement paths, and rounds next.
        </p>

        <label>
          Tournament name

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="2027 Arkansas Championship"
            required
          />
        </label>

        <label>
          Description

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
            placeholder="Describe the championship and qualification path."
            rows={5}
          />
        </label>

        <div className="sv-director-form-grid">
          <label>
            Starts

            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) =>
                setStartsAt(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Ends

            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) =>
                setEndsAt(
                  event.target.value
                )
              }
            />
          </label>
        </div>

        {message && (
          <div className="sv-director-form-error">
            {message}
          </div>
        )}

        <div className="sv-director-form-actions">
          <button
            type="button"
            onClick={() => router.back()}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? 'Creating...'
              : 'Create Tournament'}
          </button>
        </div>
      </form>
    </main>
  );
}