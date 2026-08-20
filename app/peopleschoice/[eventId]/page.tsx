'use client';

import {
  useEffect,
  useState,
} from 'react';

import Image from 'next/image';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';

type Performer = {
  key: string;
  singerName: string;
  photoUrl: string | null;
};

function getDeviceId() {
  if (typeof window === 'undefined') {
    return '';
  }

  let id =
    window.localStorage.getItem(
      'karavote_device_id'
    );

  if (!id) {
    id = crypto.randomUUID();

    window.localStorage.setItem(
      'karavote_device_id',
      id
    );
  }

  return id;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function PeoplesChoicePage() {
  const params = useParams<{
    eventId: string;
  }>();

  const eventId = params.eventId;

  const [event, setEvent] =
    useState<any>(null);

  const [performers, setPerformers] =
    useState<Performer[]>([]);

  const [
    selectedSinger,
    setSelectedSinger,
  ] = useState<Performer | null>(null);

  const [
    submittedSinger,
    setSubmittedSinger,
  ] = useState<Performer | null>(null);

  const [logoUrl, setLogoUrl] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState('');

  useEffect(() => {
    if (!eventId) return;

    load();

    const channel = supabase
      .channel(
        `peoples-choice-${eventId}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performances',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          loadPerformers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  async function load() {
    setLoading(true);
    setMessage('');

    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !eventData) {
      console.error(
        'Unable to load event:',
        eventError
      );

      setMessage(
        'This StageVotes event could not be loaded.'
      );

      setLoading(false);
      return;
    }

    setEvent(eventData);

    if (eventData.account_id) {
      const {
        data: accountData,
      } = await supabase
        .from('accounts')
        .select('logo_url')
        .eq(
          'id',
          eventData.account_id
        )
        .maybeSingle();

      setLogoUrl(
        accountData?.logo_url || ''
      );
    }

    await loadPerformers();

    /*
     * If this device already voted,
     * show the completed state.
     */
    const deviceId = getDeviceId();

    const {
      data: existingVote,
    } = await supabase
      .from('peoples_choice_votes')
      .select('singer_name')
      .eq('event_id', eventId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (existingVote?.singer_name) {
      setSubmittedSinger({
        key: existingVote.singer_name,
        singerName:
          existingVote.singer_name,
        photoUrl: null,
      });
    }

    setLoading(false);
  }

  async function loadPerformers() {
    const {
      data,
      error,
    } = await supabase
      .from('performances')
      .select(`
        id,
        singer_name,
        singer_profile_id,
        singer_profiles (
          photo_url
        )
      `)
      .eq('event_id', eventId);

    if (error) {
      console.error(
        'Unable to load performers:',
        error
      );

      return;
    }

    const performerMap =
      new Map<string, Performer>();

    (data || []).forEach(
      (performance: any) => {
        const singerName =
          performance.singer_name
            ?.trim();

        if (!singerName) {
          return;
        }

        const profile =
          Array.isArray(
            performance.singer_profiles
          )
            ? performance
                .singer_profiles[0] ||
              null
            : performance
                .singer_profiles ||
              null;

        /*
         * Profile ID is ideal because the
         * singer may have multiple songs.
         * Fall back to the normalized name
         * for walk-up singers.
         */
        const key =
          performance.singer_profile_id ||
          singerName.toLowerCase();

        const existing =
          performerMap.get(key);

        performerMap.set(key, {
          key,
          singerName,
          photoUrl:
            profile?.photo_url ||
            existing?.photoUrl ||
            null,
        });
      }
    );

    const uniquePerformers =
      Array.from(
        performerMap.values()
      ).sort((a, b) =>
        a.singerName.localeCompare(
          b.singerName
        )
      );

    setPerformers(
      uniquePerformers
    );
  }

  async function submitVote() {
    setMessage('');

    if (!selectedSinger) {
      setMessage(
        'Choose your favorite performer first.'
      );

      return;
    }

    setSubmitting(true);

    try {
      const deviceId =
        getDeviceId();

      /*
       * Some events require the audience
       * member to be physically checked in.
       */
      if (
        event?.checkin_required === true
      ) {
        const {
          data: checkin,
          error: checkinError,
        } = await supabase
          .from('event_checkins')
          .select('id')
          .eq('event_id', eventId)
          .eq(
            'device_id',
            deviceId
          )
          .maybeSingle();

        if (
          checkinError ||
          !checkin
        ) {
          setMessage(
            'Please check in at the event before voting.'
          );

          return;
        }
      }

      /*
       * One People’s Choice ballot
       * per device per event.
       */
      const {
        data: existingVote,
      } = await supabase
        .from(
          'peoples_choice_votes'
        )
        .select('id')
        .eq('event_id', eventId)
        .eq(
          'device_id',
          deviceId
        )
        .maybeSingle();

      if (existingVote) {
        setMessage(
          'You already voted for People’s Choice.'
        );

        return;
      }

      const { error } =
        await supabase
          .from(
            'peoples_choice_votes'
          )
          .insert({
            event_id: eventId,
            singer_name:
              selectedSinger.singerName,
            device_id: deviceId,
          });

      if (error) {
        if (
          error.message
            .toLowerCase()
            .includes('duplicate')
        ) {
          setMessage(
            'You already voted for People’s Choice.'
          );
        } else {
          setMessage(
            error.message
          );
        }

        return;
      }

      setSubmittedSinger(
        selectedSinger
      );

      setMessage('');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="pc-page">
        <div className="pc-loading">
          Loading People’s Choice...
        </div>

        <Styles />
      </main>
    );
  }

  return (
    <main className="pc-page">
      <div className="pc-glow pc-glow-one" />
      <div className="pc-glow pc-glow-two" />

      <div className="pc-shell">
        <header className="pc-header">
          <div className="pc-brand-row">
            <Image
              src="/stagevotes-logo.png"
              alt="StageVotes"
              width={190}
              height={95}
              priority
              className="pc-stagevotes-logo"
            />

            {logoUrl && (
              <div className="pc-venue-logo-wrap">
                <img
                  src={logoUrl}
                  alt="Venue logo"
                  className="pc-venue-logo"
                />
              </div>
            )}
          </div>

          <span className="pc-kicker">
            🏆 Audience Award
          </span>

          <h1>
            People’s Choice
          </h1>

         <p className="pc-event-name">
  Vote for tonight&apos;s favorite
</p>
        </header>

        {submittedSinger ? (
          <section className="pc-success-card">
            <div className="pc-success-icon">
              ✓
            </div>

            <span className="pc-kicker">
              Vote Counted
            </span>

            <h2>
              Your choice is in!
            </h2>

            <p>
              You voted for
            </p>

            <div className="pc-success-singer">
              <div className="pc-avatar pc-avatar-large">
                {submittedSinger.photoUrl ? (
                  <img
                    src={
                      submittedSinger.photoUrl
                    }
                    alt={
                      submittedSinger.singerName
                    }
                  />
                ) : (
                  <span>
                    {initials(
                      submittedSinger.singerName
                    )}
                  </span>
                )}
              </div>

              <strong>
                {
                  submittedSinger.singerName
                }
              </strong>
            </div>

            <div className="pc-success-note">
              🏆 Thanks for helping choose
              tonight’s People’s Choice winner.
            </div>
          </section>
        ) : (
          <>
            <section className="pc-intro-card">
              <div>
                <span className="pc-kicker">
                  Your Vote Matters
                </span>

                <h2>
                  Who owned the stage?
                </h2>

                <p>
                  Choose the performer who
                  deserves tonight’s
                  People’s Choice award.
                </p>
              </div>

              <div className="pc-one-vote">
                <strong>1</strong>
                <span>
                  vote per device
                </span>
              </div>
            </section>

            {performers.length === 0 ? (
              <section className="pc-empty-card">
                <div>🎤</div>

                <h2>
                  No performers yet
                </h2>

                <p>
                  Singers will appear here
                  automatically once they
                  join tonight’s show.
                </p>
              </section>
            ) : (
              <section className="pc-performer-section">
                <div className="pc-section-heading">
                  <div>
                    <span className="pc-kicker">
                      Tonight’s Performers
                    </span>

                    <h2>
                      Pick your favorite
                    </h2>
                  </div>

                  <span className="pc-count">
                    {performers.length}{' '}
                    {performers.length === 1
                      ? 'Singer'
                      : 'Singers'}
                  </span>
                </div>

                <div className="pc-performer-grid">
                  {performers.map(
                    (performer) => {
                      const selected =
                        selectedSinger
                          ?.key ===
                        performer.key;

                      return (
                        <button
                          type="button"
                          key={
                            performer.key
                          }
                          className={`pc-performer-card ${
                            selected
                              ? 'pc-performer-selected'
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedSinger(
                              performer
                            );

                            setMessage('');
                          }}
                        >
                          <div className="pc-avatar">
                            {performer.photoUrl ? (
                              <img
                                src={
                                  performer.photoUrl
                                }
                                alt={
                                  performer.singerName
                                }
                              />
                            ) : (
                              <span>
                                {initials(
                                  performer.singerName
                                )}
                              </span>
                            )}
                          </div>

                          <div className="pc-performer-name">
                            {
                              performer.singerName
                            }
                          </div>

                          <div className="pc-vote-indicator">
                            {selected
                              ? '✓ Your Choice'
                              : 'Tap to choose'}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>
            )}

            {selectedSinger && (
              <section className="pc-confirm-card">
                <div className="pc-confirm-copy">
                  <div className="pc-avatar pc-avatar-small">
                    {selectedSinger.photoUrl ? (
                      <img
                        src={
                          selectedSinger.photoUrl
                        }
                        alt={
                          selectedSinger.singerName
                        }
                      />
                    ) : (
                      <span>
                        {initials(
                          selectedSinger.singerName
                        )}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="pc-kicker">
                      Your Pick
                    </span>

                    <strong>
                      {
                        selectedSinger.singerName
                      }
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="pc-submit-button"
                  onClick={
                    submitVote
                  }
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? 'Submitting Vote...'
                    : `🏆 Vote for ${selectedSinger.singerName}`}
                </button>

                <p>
                  Your People’s Choice vote
                  cannot be changed after
                  submission.
                </p>
              </section>
            )}

            {message && (
              <div className="pc-message">
                {message}
              </div>
            )}
          </>
        )}
      </div>

      <Styles />
    </main>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      .pc-page {
        min-height: 100vh;
        position: relative;
        overflow: hidden;
        padding: 2rem 1rem 6rem;
        color: #f8fafc;
        background:
          radial-gradient(
            circle at top left,
            rgba(56, 189, 248, 0.14),
            transparent 34rem
          ),
          radial-gradient(
            circle at top right,
            rgba(249, 115, 22, 0.13),
            transparent 32rem
          ),
          #07111f;
      }

      .pc-glow {
        position: fixed;
        z-index: 0;
        width: 24rem;
        height: 24rem;
        border-radius: 999px;
        filter: blur(90px);
        pointer-events: none;
      }

      .pc-glow-one {
        top: -10rem;
        left: -8rem;
        background:
          rgba(56, 189, 248, 0.12);
      }

      .pc-glow-two {
        right: -8rem;
        bottom: -12rem;
        background:
          rgba(249, 115, 22, 0.13);
      }

      .pc-shell {
        position: relative;
        z-index: 1;
        width: min(920px, 100%);
        margin: 0 auto;
      }

      .pc-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }

      .pc-brand-row {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        min-height: 95px;
        margin-bottom: 0.7rem;
      }

      .pc-stagevotes-logo {
        width: auto;
        height: auto;
        max-width: min(190px, 62vw);
        object-fit: contain;
      }

      .pc-venue-logo-wrap {
        width: 82px;
        height: 82px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 22px;
        background: white;
        border:
          1px solid
          rgba(148, 163, 184, 0.2);
        box-shadow:
          0 16px 34px
          rgba(0, 0, 0, 0.26);
      }

      .pc-venue-logo {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .pc-kicker {
        display: block;
        color: #38bdf8;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }

      .pc-header h1 {
        margin: 0.4rem 0 0;
        font-size:
          clamp(2.7rem, 8vw, 4.8rem);
        line-height: 0.95;
        letter-spacing: -0.055em;
      }

      .pc-event-name {
        margin: 0.8rem 0 0;
        color: #94a3b8;
      }

      .pc-intro-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        padding:
          clamp(1.4rem, 4vw, 2rem);
        border-radius: 28px;
        border:
          1px solid
          rgba(249, 115, 22, 0.27);
        background:
          linear-gradient(
            135deg,
            rgba(10, 30, 50, 0.97),
            rgba(39, 23, 41, 0.96)
          );
        box-shadow:
          0 25px 60px
          rgba(0, 0, 0, 0.24);
      }

      .pc-intro-card h2 {
        margin: 0.45rem 0 0;
        font-size:
          clamp(1.8rem, 5vw, 2.8rem);
        letter-spacing: -0.04em;
      }

      .pc-intro-card p {
        max-width: 560px;
        margin: 0.55rem 0 0;
        color: #94a3b8;
        line-height: 1.55;
      }

      .pc-one-vote {
        flex: 0 0 auto;
        min-width: 110px;
        padding: 1rem;
        text-align: center;
        border-radius: 20px;
        background:
          rgba(7, 17, 31, 0.62);
        border:
          1px solid
          rgba(148, 163, 184, 0.14);
      }

      .pc-one-vote strong {
        display: block;
        color: #f97316;
        font-size: 2rem;
      }

      .pc-one-vote span {
        color: #94a3b8;
        font-size: 0.72rem;
        font-weight: 800;
      }

      .pc-performer-section {
        margin-top: 1.2rem;
      }

      .pc-section-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 1rem;
        margin-bottom: 0.85rem;
      }

      .pc-section-heading h2 {
        margin: 0.3rem 0 0;
        font-size: 1.55rem;
      }

      .pc-count {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 850;
      }

      .pc-performer-grid {
        display: grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(160px, 1fr)
          );
        gap: 0.85rem;
      }

      .pc-performer-card {
        min-width: 0;
        padding: 1.3rem 1rem;
        border-radius: 22px;
        border:
          1px solid
          rgba(148, 163, 184, 0.14);
        color: #f8fafc;
        background:
          rgba(15, 28, 47, 0.92);
        box-shadow:
          0 18px 45px
          rgba(0, 0, 0, 0.18);
        cursor: pointer;
        font: inherit;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          background 160ms ease,
          box-shadow 160ms ease;
      }

      .pc-performer-card:hover {
        transform: translateY(-3px);
        border-color:
          rgba(56, 189, 248, 0.42);
      }

      .pc-performer-selected {
        transform: translateY(-3px);
        border-color: #f97316;
        background:
          linear-gradient(
            145deg,
            rgba(249, 115, 22, 0.12),
            rgba(15, 28, 47, 0.96)
          );
        box-shadow:
          0 0 0 2px
            rgba(249, 115, 22, 0.18),
          0 20px 46px
            rgba(249, 115, 22, 0.12);
      }

      .pc-avatar {
        width: 82px;
        height: 82px;
        display: grid;
        place-items: center;
        margin: 0 auto;
        overflow: hidden;
        border-radius: 50%;
        color: white;
        background:
          linear-gradient(
            135deg,
            #38bdf8,
            #f97316
          );
        border:
          2px solid
          rgba(255, 255, 255, 0.14);
        font-size: 1.25rem;
        font-weight: 950;
      }

      .pc-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .pc-avatar-small {
        width: 56px;
        height: 56px;
        margin: 0;
      }

      .pc-avatar-large {
        width: 112px;
        height: 112px;
      }

      .pc-performer-name {
        margin-top: 0.85rem;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 1rem;
        font-weight: 900;
        white-space: nowrap;
      }

      .pc-vote-indicator {
        margin-top: 0.4rem;
        color: #64748b;
        font-size: 0.72rem;
        font-weight: 800;
      }

      .pc-performer-selected
        .pc-vote-indicator {
        color: #fb923c;
      }

      .pc-confirm-card {
        position: sticky;
        bottom: 0.75rem;
        z-index: 10;
        margin-top: 1rem;
        padding: 1rem;
        border-radius: 24px;
        background:
          rgba(8, 18, 32, 0.95);
        border:
          1px solid
          rgba(148, 163, 184, 0.18);
        box-shadow:
          0 25px 60px
          rgba(0, 0, 0, 0.42);
        backdrop-filter: blur(20px);
      }

      .pc-confirm-copy {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        margin-bottom: 0.9rem;
      }

      .pc-confirm-copy strong {
        display: block;
        margin-top: 0.2rem;
        font-size: 1.2rem;
      }

      .pc-submit-button {
        width: 100%;
        min-height: 60px;
        border: 0;
        border-radius: 17px;
        color: white;
        background:
          linear-gradient(
            135deg,
            #f97316,
            #ea580c
          );
        box-shadow:
          0 14px 32px
          rgba(249, 115, 22, 0.25);
        cursor: pointer;
        font: inherit;
        font-size: 1rem;
        font-weight: 950;
      }

      .pc-submit-button:disabled {
        opacity: 0.55;
        cursor: wait;
      }

      .pc-confirm-card > p {
        margin: 0.7rem 0 0;
        color: #64748b;
        text-align: center;
        font-size: 0.75rem;
      }

      .pc-success-card {
        padding:
          clamp(2rem, 6vw, 3rem);
        text-align: center;
        border-radius: 30px;
        border:
          1px solid
          rgba(34, 197, 94, 0.35);
        background:
          radial-gradient(
            circle at top,
            rgba(34, 197, 94, 0.13),
            transparent 22rem
          ),
          rgba(15, 28, 47, 0.95);
        box-shadow:
          0 28px 70px
          rgba(0, 0, 0, 0.27);
      }

      .pc-success-icon {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        margin: 0 auto 1rem;
        border-radius: 50%;
        color: #052e16;
        background: #4ade80;
        font-size: 1.7rem;
        font-weight: 950;
      }

      .pc-success-card h2 {
        margin: 0.4rem 0 0;
        font-size:
          clamp(2rem, 6vw, 3.2rem);
        letter-spacing: -0.04em;
      }

      .pc-success-card > p {
        margin: 0.75rem 0 0;
        color: #94a3b8;
      }

      .pc-success-singer {
        margin-top: 1.3rem;
      }

      .pc-success-singer strong {
        display: block;
        margin-top: 0.75rem;
        font-size: 1.6rem;
      }

      .pc-success-note {
        max-width: 520px;
        margin: 1.4rem auto 0;
        padding: 1rem;
        border-radius: 16px;
        color: #cbd5e1;
        background:
          rgba(7, 17, 31, 0.55);
        border:
          1px solid
          rgba(148, 163, 184, 0.12);
      }

      .pc-empty-card,
      .pc-loading {
        margin-top: 1rem;
        padding: 3rem 1.5rem;
        text-align: center;
        border-radius: 26px;
        background:
          rgba(15, 28, 47, 0.92);
        border:
          1px solid
          rgba(148, 163, 184, 0.14);
      }

      .pc-empty-card > div {
        font-size: 2.6rem;
      }

      .pc-empty-card h2 {
        margin: 0.7rem 0 0;
      }

      .pc-empty-card p {
        max-width: 480px;
        margin: 0.6rem auto 0;
        color: #94a3b8;
        line-height: 1.55;
      }

      .pc-message {
        margin-top: 1rem;
        padding: 0.9rem 1rem;
        border-radius: 15px;
        color: #fecaca;
        background:
          rgba(239, 68, 68, 0.1);
        border:
          1px solid
          rgba(239, 68, 68, 0.22);
        font-weight: 800;
        text-align: center;
      }

      @media (
        max-width: 680px
      ) {
        .pc-page {
          padding:
            1rem 0.75rem 5rem;
        }

        .pc-intro-card {
          align-items: flex-start;
          flex-direction: column;
        }

        .pc-one-vote {
          min-width: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.65rem;
        }

        .pc-one-vote strong {
          font-size: 1.5rem;
        }

        .pc-performer-grid {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }
      }

      @media (
        max-width: 420px
      ) {
        .pc-brand-row {
          flex-direction: column;
        }

        .pc-performer-grid {
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
        }

        .pc-performer-card {
          padding: 1rem 0.6rem;
        }

        .pc-avatar {
          width: 68px;
          height: 68px;
        }
      }
    `}</style>
  );
}