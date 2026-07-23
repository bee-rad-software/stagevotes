'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import styles from './venue-editor.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Venue = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  personality_tags: string[];
  music_provider: string | null;
};

type UploadType = 'logo' | 'cover';

const venueFields = `
  id,
  name,
  slug,
  description,
  street_address,
  city,
  state,
  postal_code,
  phone,
  website_url,
  facebook_url,
  instagram_url,
  logo_url,
  cover_photo_url,
  personality_tags,
  music_provider
`;

export default function VenueEditorPage() {
  const params = useParams<{ venueId: string }>();
  const router = useRouter();
  const venueId = params.venueId;

  const [venue, setVenue] = useState<Venue | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] =
    useState<UploadType | null>(null);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [musicProvider, setMusicProvider] = useState('');
  const [personalityTags, setPersonalityTags] = useState('');

  useEffect(() => {
    async function loadVenue() {
      setLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('venues')
        .select(venueFields)
        .eq('id', venueId)
        .maybeSingle();

      if (error) {
        console.error('Unable to load venue:', error);
        setErrorMessage('We could not load this venue.');
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage(
          'Venue not found, or you do not have permission to manage it.'
        );
        setLoading(false);
        return;
      }

      const loadedVenue = data as Venue;

      setVenue(loadedVenue);
      setName(loadedVenue.name || '');
      setDescription(loadedVenue.description || '');
      setStreetAddress(loadedVenue.street_address || '');
      setCity(loadedVenue.city || '');
      setState(loadedVenue.state || '');
      setPostalCode(loadedVenue.postal_code || '');
      setPhone(loadedVenue.phone || '');
      setWebsiteUrl(loadedVenue.website_url || '');
      setFacebookUrl(loadedVenue.facebook_url || '');
      setInstagramUrl(loadedVenue.instagram_url || '');
      setMusicProvider(loadedVenue.music_provider || '');
      setPersonalityTags(
        (loadedVenue.personality_tags || []).join(', ')
      );

      setLoading(false);
    }

    if (venueId) {
      loadVenue();
    }
  }, [router, venueId]);

  async function uploadVenueImage(
    event: ChangeEvent<HTMLInputElement>,
    type: UploadType
  ) {
    const file = event.target.files?.[0];

    if (!file || !venue) {
      return;
    }

    setMessage('');
    setErrorMessage('');

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage(
        'Please choose an image smaller than 8 MB.'
      );
      event.target.value = '';
      return;
    }

    setUploading(type);

    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg';

    const filePath =
      `${venue.id}/${type}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('venue-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error(
        'Venue image upload failed:',
        uploadError
      );

      setErrorMessage(
        `Unable to upload the ${type} image: ${uploadError.message}`
      );

      setUploading(null);
      event.target.value = '';
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('venue-media')
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const databaseField =
      type === 'logo'
        ? 'logo_url'
        : 'cover_photo_url';

    const {
      data: updatedVenue,
      error: updateError,
    } = await supabase
      .from('venues')
      .update({
        [databaseField]: imageUrl,
      })
      .eq('id', venue.id)
      .select(venueFields)
      .maybeSingle();

    if (updateError) {
      console.error(
        'Unable to save venue image URL:',
        updateError
      );

      setErrorMessage(
        `The image uploaded, but StageVotes could not save it: ${updateError.message}`
      );

      setUploading(null);
      event.target.value = '';
      return;
    }

    if (!updatedVenue) {
      console.error(
        'Venue image update affected zero rows.'
      );

      setErrorMessage(
        'The image uploaded successfully, but your account was not allowed to update the venue record.'
      );

      setUploading(null);
      event.target.value = '';
      return;
    }

    setVenue(updatedVenue as Venue);

    setMessage(
      type === 'logo'
        ? 'Venue logo updated.'
        : 'Cover photo updated.'
    );

    setUploading(null);
    event.target.value = '';
  }

  async function saveVenue(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!venue) {
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Venue name is required.');
      return;
    }

    setSaving(true);
    setMessage('');
    setErrorMessage('');

    const parsedTags = personalityTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const {
      data: updatedVenue,
      error,
    } = await supabase
      .from('venues')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        street_address: streetAddress.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        postal_code: postalCode.trim() || null,
        phone: phone.trim() || null,
        website_url: websiteUrl.trim() || null,
        facebook_url: facebookUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        music_provider: musicProvider.trim() || null,
        personality_tags: parsedTags,
      })
      .eq('id', venue.id)
      .select(venueFields)
      .maybeSingle();

    if (error) {
      console.error('Unable to save venue:', error);

      setErrorMessage(
        `Unable to save your venue changes: ${error.message}`
      );

      setSaving(false);
      return;
    }

    if (!updatedVenue) {
      setErrorMessage(
        'Your account does not have permission to update this venue.'
      );

      setSaving(false);
      return;
    }

    setVenue(updatedVenue as Venue);

    setPersonalityTags(
      (
        (updatedVenue as Venue).personality_tags || []
      ).join(', ')
    );

    setMessage('Venue profile saved.');
    setSaving(false);
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.statusCard}>
          <div className={styles.spinner} />
          <p>Loading venue editor…</p>
        </div>
      </main>
    );
  }

  if (!venue) {
    return (
      <main className={styles.page}>
        <div className={styles.statusCard}>
          <div className={styles.statusIcon}>📍</div>

          <h1>Venue unavailable</h1>

          <p>{errorMessage}</p>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push('/account')}
          >
            Back to Account
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Project Atlas
          </span>

          <h1>Manage Venue</h1>

          <p>
            Update how {venue.name} appears throughout
            StageVotes.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push('/account')}
          >
            ← Account
          </button>

          <button
            type="button"
            className={styles.publicButton}
            onClick={() =>
              router.push(`/venues/${venue.slug}`)
            }
          >
            View Public Page ↗
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {(message || errorMessage) && (
          <div
            className={
              errorMessage
                ? styles.errorMessage
                : styles.successMessage
            }
          >
            {errorMessage || message}
          </div>
        )}

        <section className={styles.mediaGrid}>
          <article className={styles.mediaCard}>
            <div>
              <span className={styles.sectionLabel}>
                Cover Photo
              </span>

              <h2>Venue hero image</h2>

              <p>
                Use a wide photo showing the venue, crowd
                or stage.
              </p>
            </div>

            <div className={styles.coverPreview}>
              {venue.cover_photo_url ? (
                <img
                  src={venue.cover_photo_url}
                  alt={`${venue.name} cover`}
                />
              ) : (
                <div className={styles.emptyPreview}>
                  <span>📸</span>
                  <strong>No cover photo yet</strong>
                </div>
              )}
            </div>

            <label className={styles.uploadButton}>
              {uploading === 'cover'
                ? 'Uploading…'
                : 'Upload Cover Photo'}

              <input
                type="file"
                accept="image/*"
                disabled={uploading !== null}
                onChange={(event) =>
                  uploadVenueImage(event, 'cover')
                }
              />
            </label>
          </article>

          <article className={styles.mediaCard}>
            <div>
              <span className={styles.sectionLabel}>
                Venue Logo
              </span>

              <h2>Profile image</h2>

              <p>
                A square logo works best throughout
                StageVotes.
              </p>
            </div>

            <div className={styles.logoPreview}>
              {venue.logo_url ? (
                <img
                  src={venue.logo_url}
                  alt={`${venue.name} logo`}
                />
              ) : (
                <span>🎤</span>
              )}
            </div>

            <label className={styles.uploadButton}>
              {uploading === 'logo'
                ? 'Uploading…'
                : 'Upload Venue Logo'}

              <input
                type="file"
                accept="image/*"
                disabled={uploading !== null}
                onChange={(event) =>
                  uploadVenueImage(event, 'logo')
                }
              />
            </label>
          </article>
        </section>

        <form
          onSubmit={saveVenue}
          className={styles.form}
        >
          <section className={styles.formCard}>
            <div className={styles.formHeading}>
              <span className={styles.sectionLabel}>
                Venue Identity
              </span>

              <h2>Public profile</h2>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span>Venue name</span>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  required
                />
              </label>

              <label
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <span>Description</span>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={4}
                  placeholder="Tell singers what makes this venue special."
                />
              </label>

              <label
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <span>Personality tags</span>

                <input
                  value={personalityTags}
                  onChange={(event) =>
                    setPersonalityTags(
                      event.target.value
                    )
                  }
                  placeholder="Casual Fun, Competitive, Rock, Country"
                />

                <small>
                  Separate each tag with a comma.
                </small>
              </label>

              <label className={styles.field}>
                <span>Music provider</span>

                <input
                  value={musicProvider}
                  onChange={(event) =>
                    setMusicProvider(
                      event.target.value
                    )
                  }
                  placeholder="KaraFun"
                />
              </label>

              <label className={styles.field}>
                <span>Phone</span>

                <input
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                  placeholder="(479) 555-1234"
                />
              </label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.formHeading}>
              <span className={styles.sectionLabel}>
                Location
              </span>

              <h2>Help singers find you</h2>
            </div>

            <div className={styles.fieldGrid}>
              <label
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <span>Street address</span>

                <input
                  value={streetAddress}
                  onChange={(event) =>
                    setStreetAddress(
                      event.target.value
                    )
                  }
                />
              </label>

              <label className={styles.field}>
                <span>City</span>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(event.target.value)
                  }
                />
              </label>

              <label className={styles.field}>
                <span>State</span>

                <input
                  value={state}
                  onChange={(event) =>
                    setState(event.target.value)
                  }
                />
              </label>

              <label className={styles.field}>
                <span>Postal code</span>

                <input
                  value={postalCode}
                  onChange={(event) =>
                    setPostalCode(
                      event.target.value
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.formHeading}>
              <span className={styles.sectionLabel}>
                Online
              </span>

              <h2>Website and social links</h2>
            </div>

            <div className={styles.fieldGrid}>
              <label
                className={`${styles.field} ${styles.fullWidth}`}
              >
                <span>Website</span>

                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(event) =>
                    setWebsiteUrl(event.target.value)
                  }
                  placeholder="https://"
                />
              </label>

              <label className={styles.field}>
                <span>Facebook</span>

                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(event) =>
                    setFacebookUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://facebook.com/..."
                />
              </label>

              <label className={styles.field}>
                <span>Instagram</span>

                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(event) =>
                    setInstagramUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://instagram.com/..."
                />
              </label>
            </div>
          </section>

          <div className={styles.saveBar}>
            <div>
              <strong>Ready to publish?</strong>

              <span>
                Changes update the public venue page
                immediately.
              </span>
            </div>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : 'Save Venue Profile'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}