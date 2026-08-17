'use client';

import {
  Award,
  Check,
  ChevronRight,
  Heart,
  MapPin,
  Mic2,
  Plus,
  QrCode,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams  } from 'next/navigation';
import { Suspense } from 'react';

import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { createStageVotesEvent } from '@/lib/events/createStageVotesEvent';

type AudienceToggleProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function AudienceToggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: AudienceToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: 16,
        textAlign: 'left',
        color: '#f8fafc',
        cursor: 'pointer',
        borderRadius: 18,
        border: checked
          ? '1px solid rgba(56,189,248,0.4)'
          : '1px solid rgba(148,163,184,0.16)',
        background: checked
          ? 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(249,115,22,0.08))'
          : 'rgba(255,255,255,0.035)',
        transition: '180ms ease',
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 15,
          color: checked ? '#ffffff' : '#94a3b8',
          background: checked
            ? 'linear-gradient(135deg, #38bdf8, #0284c7)'
            : 'rgba(148,163,184,0.1)',
        }}
      >
        <Icon size={22} />
      </span>

      <span style={{ minWidth: 0, flex: 1 }}>
        <strong
          style={{
            display: 'block',
            fontSize: 15,
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: 'block',
            marginTop: 3,
            color: '#94a3b8',
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {description}
        </span>
      </span>

      <span
        style={{
          width: 48,
          height: 27,
          flex: '0 0 auto',
          position: 'relative',
          borderRadius: 999,
          background: checked
            ? '#22c55e'
            : 'rgba(148,163,184,0.22)',
          transition: '180ms ease',
        }}
      >
        <span
          style={{
            width: 21,
            height: 21,
            position: 'absolute',
            top: 3,
            left: checked ? 24 : 3,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 999,
            color: '#22c55e',
            background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            transition: '180ms ease',
          }}
        >
          {checked && <Check size={13} strokeWidth={3} />}
        </span>
      </span>
    </button>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<CreatePageLoading />}>
      <CreatePageContent />
    </Suspense>
  );
}

function CreatePageLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#07111f',
        color: '#ffffff',
      }}
    >
      Loading...
    </main>
  );
}

function CreatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const recurringShowId =
    searchParams.get('recurringShow');

  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');

  const [createdId, setCreatedId] =
    useState<string | null>(null);

  const [error, setError] = useState('');
  const [billingMessage, setBillingMessage] =
    useState('');

  const [categories, setCategories] =
    useState<string[]>([
      'Overall Performance',
    ]);

  const [
    tiebreakerCategory,
    setTiebreakerCategory,
  ] = useState('Overall Performance');

  const [judgingEnabled, setJudgingEnabled] =
  useState(true);

  const [showSignupQR, setShowSignupQR] =
    useState(true);

  const [showVotingQR, setShowVotingQR] =
    useState(true);

  const [
    showPeoplesChoiceQR,
    setShowPeoplesChoiceQR,
  ] = useState(true);

  const [
    subscriptionStatus,
    setSubscriptionStatus,
  ] = useState('');

  const [recurringVenueId, setRecurringVenueId] =
  useState<string | null>(null);

  const validCategories = useMemo(
    () =>
      categories
        .map((category) => category.trim())
        .filter(Boolean),
    [categories]
  );

  useEffect(() => {
  async function loadCreatePage() {
    await loadMyAccount();

    if (recurringShowId) {
      await loadRecurringShowDefaults();
    }
  }

  loadCreatePage();
}, [recurringShowId]);

  useEffect(() => {
    if (
      validCategories.length === 0
    ) {
      setTiebreakerCategory('');
      return;
    }

    if (
      !validCategories.includes(
        tiebreakerCategory
      )
    ) {
      setTiebreakerCategory(
        validCategories[0]
      );
    }
  }, [
    validCategories,
    tiebreakerCategory,
  ]);

  async function getMyAccountId() {
    const { data: userData } =
      await supabase.auth.getUser();

    if (!userData.user) {
      router.push('/login');
      return null;
    }

    const {
      data: accountUser,
      error: accountUserError,
    } = await supabase
      .from('account_users')
      .select('account_id')
      .eq(
        'user_id',
        userData.user.id
      )
      .single();

    if (
      accountUserError ||
      !accountUser
    ) {
      setError(
        'No account was found for this user.'
      );

      return null;
    }

    return accountUser.account_id;
  }

  async function loadMyAccount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: accountUser } =
      await supabase
        .from('account_users')
        .select('account_id')
        .eq('user_id', user.id)
        .single();

    if (!accountUser) {
      return;
    }

    const { data: account } =
      await supabase
        .from('accounts')
        .select(
          'name, subscription_status'
        )
        .eq(
          'id',
          accountUser.account_id
        )
        .single();

    if (account?.name) {
      setVenue(account.name);
    }

    setSubscriptionStatus(
      account?.subscription_status || ''
    );
  }

  async function loadRecurringShowDefaults() {
  if (!recurringShowId) return;

  const {
    data,
    error,
  } = await supabase
    .from('venue_recurring_shows')
    .select(`
      id,
      title,
      venue_id,
      venues (
        id,
        name
      )
    `)
    .eq('id', recurringShowId)
    .single();

  if (error) {
    console.error(
      'Unable to load recurring show:',
      error
    );
    return;
  }

  const recurringVenue =
    Array.isArray(data?.venues)
      ? data.venues[0] || null
      : data?.venues || null;

  if (data?.venue_id) {
  setRecurringVenueId(
    data.venue_id
  );
}
  
      if (data?.title) {
    setName(data.title);
  }

  if (recurringVenue?.name) {
    setVenue(recurringVenue.name);
  }
}

  function updateCategory(
    index: number,
    value: string
  ) {
    setCategories((current) =>
      current.map(
        (category, categoryIndex) =>
          categoryIndex === index
            ? value
            : category
      )
    );
  }

  function addCategory() {
    setCategories((current) => [
      ...current,
      '',
    ]);
  }

  function removeCategory(index: number) {
    setCategories((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (_, categoryIndex) =>
          categoryIndex !== index
      );
    });
  }

  async function createEvent() {
    setError('');
    setBillingMessage('');

    if (
      !['active', 'trialing'].includes(
        subscriptionStatus
      )
    ) {
      setBillingMessage(
        'Your subscription is inactive. Please update billing to create a show.'
      );

      return;
    }

    if (!name.trim()) {
      setError(
        'Please enter a name for tonight’s show.'
      );

      return;
    }

    if (!venue.trim()) {
      setError(
        'Please enter the venue name.'
      );

      return;
    }

    if (
  judgingEnabled &&
  validCategories.length === 0
) {
  setError(
    'Please add at least one voting category.'
  );

  return;
}

    const accountId =
      await getMyAccountId();

    if (!accountId) {
      return;
    }

   try {
  const result = await createStageVotesEvent({
  accountId,
  venueName: venue,
  name,
  judgingEnabled,
  categories: validCategories,
  tiebreakerCategory,
  showSignupQR,
  showVotingQR,
  showPeoplesChoiceQR,
});

if (recurringShowId) {
  const {
    error: recurringLinkError,
  } = await supabase
    .from('events')
    .update({
      recurring_show_id:
        recurringShowId,
      venue_id:
        recurringVenueId,
    })
    .eq(
      'id',
      result.eventId
    )
    .eq(
      'account_id',
      accountId
    );

  if (recurringLinkError) {
    throw recurringLinkError;
  }
}

setCreatedId(result.eventId);
} catch (error) {
  console.error(
    'StageVotes event creation failed:',
    error
  );

  setError(
    error instanceof Error
      ? error.message
      : 'Your show could not be created. Please try again.'
  );
}
  }

  const pageBackground =
    'radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 32rem), radial-gradient(circle at top right, rgba(249,115,22,0.13), transparent 32rem), #07111f';

  const cardStyle:
    React.CSSProperties = {
    padding: 22,
    borderRadius: 24,
    border:
      '1px solid rgba(56,189,248,0.18)',
    background:
      'linear-gradient(145deg, rgba(18,31,56,0.94), rgba(12,23,43,0.96))',
    boxShadow:
      '0 24px 60px rgba(0,0,0,0.2)',
  };

  const inputStyle:
    React.CSSProperties = {
    width: '100%',
    padding: '14px 15px',
    color: '#f8fafc',
    fontSize: 15,
    outline: 'none',
    borderRadius: 14,
    border:
      '1px solid rgba(148,163,184,0.2)',
    background:
      'rgba(2,8,23,0.55)',
  };

  const labelStyle:
    React.CSSProperties = {
    display: 'block',
    marginBottom: 8,
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 800,
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '28px 16px 80px',
        color: '#f8fafc',
        background: pageBackground,
      }}
    >
      <div
        style={{
          width: 'min(1120px, 100%)',
          margin: '0 auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 18,
            marginBottom: 28,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: 20,
              fontWeight: 950,
            }}
          >
<Image
  src="/icon-512.png"
  alt="StageVotes"
  width={42}
  height={42}
  priority
  style={{
    width: 42,
    height: 42,
    borderRadius: 12,
    objectFit: 'contain',
    boxShadow: '0 8px 20px rgba(249,115,22,0.25)',
  }}
/>

            StageVotes
          </Link>

          <Link
            href="/account"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              color: '#bae6fd',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 800,
              border:
                '1px solid rgba(56,189,248,0.18)',
              background:
                'rgba(56,189,248,0.06)',
            }}
          >
            <Settings size={16} />
            Account Settings
          </Link>
        </header>

        <section
          style={{
            position: 'relative',
            padding: '32px 26px',
            marginBottom: 24,
            overflow: 'hidden',
            borderRadius: 28,
            border:
              '1px solid rgba(249,115,22,0.24)',
            background:
              'linear-gradient(135deg, rgba(22,39,70,0.98), rgba(38,28,53,0.98))',
            boxShadow:
              '0 30px 80px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at top right, rgba(249,115,22,0.24), transparent 38%), radial-gradient(circle at bottom left, rgba(56,189,248,0.16), transparent 42%)',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'grid',
              gridTemplateColumns:
                'auto minmax(0, 1fr)',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 22,
                background:
                  'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow:
                  '0 18px 38px rgba(249,115,22,0.28)',
              }}
            >
              <Mic2 size={31} />
            </div>

            <div>
              <div
                style={{
                  color: '#38bdf8',
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                Host setup
              </div>

              <h1
                style={{
                  margin: '5px 0 7px',
                  fontSize:
                    'clamp(2rem, 6vw, 3.5rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                }}
              >
                Create Tonight&apos;s Show
              </h1>

              <p
                style={{
                  maxWidth: 650,
                  margin: 0,
                  color: '#cbd5e1',
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                Set up your show, judging,
                and audience experience in
                just a few minutes.
              </p>
            </div>
          </div>
        </section>

        {billingMessage && (
          <section
            style={{
              ...cardStyle,
              marginBottom: 20,
              border:
                '1px solid rgba(249,115,22,0.35)',
              background:
                'rgba(249,115,22,0.08)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 19,
              }}
            >
              Subscription Required
            </h2>

            <p
              style={{
                color: '#fdba74',
                lineHeight: 1.5,
              }}
            >
              {billingMessage}
            </p>

            <Link href="/account">
              <button
                type="button"
                style={{
                  padding: '11px 15px',
                  border: 0,
                  borderRadius: 12,
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 900,
                  background: '#f97316',
                }}
              >
                Manage Subscription
              </button>
            </Link>
          </section>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0, 1.4fr) minmax(300px, 0.75fr)',
            gap: 20,
            alignItems: 'start',
          }}
          className="sv-create-layout"
        >
          <div
            style={{
              display: 'grid',
              gap: 20,
            }}
          >
            <section style={cardStyle}>
              <SectionHeading
                icon={Sparkles}
                eyebrow="Show details"
                title="Set the stage"
                description="Give tonight’s event a name and confirm where it is happening."
              />

              <div
  className="sv-show-details-grid"
  style={{
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 17,
    marginTop: 22,
  }}
>
                <div>
                  <label
                    htmlFor="show-name"
                    style={labelStyle}
                  >
                    Show name
                  </label>

                  <div
                    style={{
                      position: 'relative',
                    }}
                  >
                    <Mic2
                      size={18}
                      style={{
                        position: 'absolute',
                        top: 15,
                        left: 14,
                        color: '#38bdf8',
                      }}
                    />

                    <input
                      id="show-name"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      placeholder="Friday Night Karaoke"
                      style={{
                        ...inputStyle,
                        paddingLeft: 44,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="venue"
                    style={labelStyle}
                  >
                    Venue
                  </label>

                  <div
                    style={{
                      position: 'relative',
                    }}
                  >
                    <MapPin
                      size={18}
                      style={{
                        position: 'absolute',
                        top: 15,
                        left: 14,
                        color: '#38bdf8',
                      }}
                    />

                    <input
                      id="venue"
                      value={venue}
                      onChange={(event) =>
                        setVenue(
                          event.target.value
                        )
                      }
                      placeholder="Venue name"
                      style={{
                        ...inputStyle,
                        paddingLeft: 44,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section style={cardStyle}>
  <SectionHeading
    icon={Award}
    eyebrow="Event format"
    title="Will this event include judging?"
    description="Turn judging on for scored competitions, or leave it off for regular karaoke."
  />

  <div style={{ marginTop: 22 }}>
    <AudienceToggle
      icon={Trophy}
      title="Judged Event"
      description={
        judgingEnabled
          ? 'Judges will score singers using categories.'
          : 'No judges or category scores will be used.'
      }
      checked={judgingEnabled}
      onChange={(checked) => {
        setJudgingEnabled(checked);

        if (!checked) {
          setShowVotingQR(false);
        } else {
          setShowVotingQR(true);
        }
      }}
    />
  </div>
</section>


{judgingEnabled && (
            <section style={cardStyle}>
              <SectionHeading
                icon={Award}
                eyebrow="Judging"
                title="Choose scoring categories"
                description="Judges will score each singer using these categories."
              />

              <div
                style={{
                  display: 'grid',
                  gap: 11,
                  marginTop: 22,
                }}
              >
                {categories.map(
                  (category, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(0, 1fr) auto',
                        gap: 9,
                      }}
                    >
                      <input
                        value={category}
                        onChange={(event) =>
                          updateCategory(
                            index,
                            event.target.value
                          )
                        }
                        placeholder={`Category ${index + 1}`}
                        style={inputStyle}
                      />

                      <button
                        type="button"
                        aria-label="Remove category"
                        disabled={
                          categories.length === 1
                        }
                        onClick={() =>
                          removeCategory(index)
                        }
                        style={{
                          width: 48,
                          borderRadius: 14,
                          border:
                            '1px solid rgba(239,68,68,0.18)',
                          color:
                            categories.length ===
                            1
                              ? '#475569'
                              : '#fca5a5',
                          cursor:
                            categories.length ===
                            1
                              ? 'not-allowed'
                              : 'pointer',
                          background:
                            'rgba(239,68,68,0.06)',
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={addCategory}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 12,
                  padding: 13,
                  borderRadius: 14,
                  color: '#7dd3fc',
                  cursor: 'pointer',
                  fontWeight: 900,
                  border:
                    '1px dashed rgba(56,189,248,0.35)',
                  background:
                    'rgba(56,189,248,0.06)',
                }}
              >
                <Plus size={18} />
                Add Category
              </button>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 20,
                  borderTop:
                    '1px solid rgba(148,163,184,0.12)',
                }}
              >
                <label
                  htmlFor="tiebreaker"
                  style={labelStyle}
                >
                  Tiebreaker category
                </label>

                <select
                  id="tiebreaker"
                  value={tiebreakerCategory}
                  onChange={(event) =>
                    setTiebreakerCategory(
                      event.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    appearance: 'auto',
                  }}
                >
                  {validCategories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>
              </section>
)}

            <section style={cardStyle}>
              <SectionHeading
                icon={Users}
                eyebrow="Audience experience"
                title="Choose what guests can access"
                description="These options control the QR codes shown on the live display."
              />

              <div
                style={{
                  display: 'grid',
                  gap: 11,
                  marginTop: 22,
                }}
              >
                <AudienceToggle
                  icon={QrCode}
                  title="Singer Signup"
                  description="Let singers join the rotation from their phones."
                  checked={showSignupQR}
                  onChange={setShowSignupQR}
                />

                {judgingEnabled && (
  <AudienceToggle
    icon={Award}
    title="Judge Voting"
    description="Show the QR code judges use to score singers."
    checked={showVotingQR}
    onChange={setShowVotingQR}
  />
)}

                <AudienceToggle
                  icon={Heart}
                  title="People’s Choice"
                  description="Let the audience vote for their favorite performer."
                  checked={
                    showPeoplesChoiceQR
                  }
                  onChange={
                    setShowPeoplesChoiceQR
                  }
                />
              </div>
            </section>
          </div>

          <aside
            style={{
              position: 'sticky',
              top: 20,
              display: 'grid',
              gap: 16,
            }}
          >
            <section
  style={{
    ...cardStyle,
    padding: 20,
  }}
>
  <SectionHeading
    icon={QrCode}
    eyebrow="Live preview"
    title="What guests will see"
    description="This preview updates as you change the show settings."
  />

  <div
    style={{
      display: 'grid',
      placeItems: 'center',
      marginTop: 24,
    }}
  >
    <div
      style={{
        width: 'min(300px, 100%)',
        padding: 10,
        borderRadius: 34,
        border:
          '1px solid rgba(148,163,184,0.2)',
        background:
          'linear-gradient(145deg, #020617, #0f172a)',
        boxShadow:
          '0 30px 70px rgba(0,0,0,0.38)',
      }}
    >
      <div
        style={{
          width: 92,
          height: 22,
          margin: '0 auto 10px',
          borderRadius: 999,
          background: '#000000',
        }}
      />

      <div
        style={{
          minHeight: 520,
          padding: '22px 16px',
          overflow: 'hidden',
          borderRadius: 26,
          color: '#f8fafc',
          background:
            'radial-gradient(circle at top right, rgba(249,115,22,0.18), transparent 40%), radial-gradient(circle at bottom left, rgba(56,189,248,0.14), transparent 44%), #07111f',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 22,
          }}
        >
          <Image
            src="/icon-512.png"
            alt="StageVotes"
            width={34}
            height={34}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              objectFit: 'contain',
            }}
          />

          <strong
            style={{
              fontSize: 15,
            }}
          >
            StageVotes
          </strong>
        </div>

        <div
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              color: '#38bdf8',
              fontSize: 10,
              fontWeight: 950,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {judgingEnabled
              ? 'Judged competition'
              : 'Open karaoke'}
          </div>

          <h3
            style={{
              margin: '7px 0 5px',
              fontSize: 26,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
            }}
          >
            {name.trim() ||
              'Tonight’s Show'}
          </h3>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#94a3b8',
              fontSize: 13,
            }}
          >
            <MapPin size={14} />

            {venue.trim() ||
              'Choose a venue'}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 10,
          }}
        >
          {showSignupQR && (
            <PreviewAction
              icon={Mic2}
              title="Join the Queue"
              description="Choose a song and sign up"
              accent="#38bdf8"
            />
          )}

          {judgingEnabled &&
            showVotingQR && (
              <PreviewAction
                icon={Award}
                title="Judge Voting"
                description={`${validCategories.length} scoring ${
                  validCategories.length === 1
                    ? 'category'
                    : 'categories'
                }`}
                accent="#f97316"
              />
            )}

          {showPeoplesChoiceQR && (
            <PreviewAction
              icon={Heart}
              title="People’s Choice"
              description="Vote for your favorite singer"
              accent="#ec4899"
            />
          )}

          <PreviewAction
            icon={Trophy}
            title="Leaderboard"
            description={
              judgingEnabled
                ? 'Follow scores and rankings'
                : 'See tonight’s favorites'
            }
            accent="#facc15"
          />
        </div>

        <div
          style={{
            marginTop: 22,
            padding: 14,
            borderRadius: 16,
            border:
              '1px solid rgba(148,163,184,0.12)',
            background:
              'rgba(255,255,255,0.035)',
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Tonight’s format
          </div>

          <strong
            style={{
              display: 'block',
              marginTop: 5,
              fontSize: 14,
            }}
          >
            {judgingEnabled
              ? `${validCategories.length} judged ${
                  validCategories.length === 1
                    ? 'category'
                    : 'categories'
                }`
              : 'No judges or scores'}
          </strong>
        </div>
      </div>
    </div>
  </div>

  <button
    type="button"
    onClick={createEvent}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 20,
      padding: '15px 16px',
      border: 0,
      borderRadius: 16,
      color: '#ffffff',
      cursor: 'pointer',
      fontSize: 15,
      fontWeight: 950,
      background:
        'linear-gradient(135deg, #f97316, #ea580c)',
      boxShadow:
        '0 16px 35px rgba(249,115,22,0.25)',
    }}
  >
    <Mic2 size={19} />
    Create Tonight&apos;s Show
    <ChevronRight size={18} />
  </button>

  {error && (
    <p
      style={{
        margin: '14px 0 0',
        padding: 12,
        color: '#fecaca',
        fontSize: 13,
        lineHeight: 1.45,
        borderRadius: 12,
        border:
          '1px solid rgba(239,68,68,0.2)',
        background:
          'rgba(239,68,68,0.08)',
      }}
    >
      {error}
    </p>
  )}
</section>

            {createdId && (
              <section
                style={{
                  ...cardStyle,
                  border:
                    '1px solid rgba(34,197,94,0.3)',
                  background:
                    'linear-gradient(145deg, rgba(20,83,45,0.28), rgba(12,23,43,0.96))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    color: '#86efac',
                    fontWeight: 950,
                  }}
                >
                  <Check size={20} />
                  Show created
                </div>

                <p
                  style={{
                    color: '#cbd5e1',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Your show is ready. Open
                  the host dashboard to begin.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gap: 9,
                  }}
                >
                  <Link
                    href={`/host/${createdId}`}
                    style={{
                      textDecoration: 'none',
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        width: '100%',
                        padding: 13,
                        border: 0,
                        borderRadius: 13,
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontWeight: 900,
                        background:
                          '#22c55e',
                      }}
                    >
                      Open Host Dashboard
                    </button>
                  </Link>

                  <Link
                    href={`/vote/${createdId}`}
                    style={{
                      color: '#bae6fd',
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                  >
                    Open Audience Voting →
                  </Link>

                  <Link
                    href={`/leaderboard/${createdId}`}
                    style={{
                      color: '#bae6fd',
                      fontSize: 13,
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                  >
                    Open Leaderboard →
                  </Link>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <style jsx global>{`
  @media (max-width: 820px) {
    .sv-create-layout {
      grid-template-columns: 1fr !important;
    }

    .sv-create-layout aside {
      position: static !important;
    }

    .sv-show-details-grid {
      grid-template-columns: 1fr !important;
    }
  }
`}</style>
    </main>
  );
}

type SectionHeadingProps = {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
};

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'auto minmax(0, 1fr)',
        gap: 13,
        alignItems: 'start',
      }}
    >
      <span
        style={{
          width: 42,
          height: 42,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 14,
          color: '#38bdf8',
          background:
            'rgba(56,189,248,0.1)',
          border:
            '1px solid rgba(56,189,248,0.16)',
        }}
      >
        <Icon size={20} />
      </span>

      <div>
        <div
          style={{
            color: '#38bdf8',
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>

        <h2
          style={{
            margin: '4px 0 5px',
            fontSize: 20,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: 0,
            color: '#94a3b8',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

type PreviewActionProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
};

function PreviewAction({
  icon: Icon,
  title,
  description,
  accent,
}: PreviewActionProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 11,
        padding: 13,
        borderRadius: 16,
        border:
          '1px solid rgba(148,163,184,0.12)',
        background:
          'rgba(255,255,255,0.04)',
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 13,
          color: accent,
          background: `${accent}18`,
          border: `1px solid ${accent}35`,
        }}
      >
        <Icon size={18} />
      </span>

      <span
        style={{
          minWidth: 0,
        }}
      >
        <strong
          style={{
            display: 'block',
            fontSize: 13,
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: 'block',
            marginTop: 2,
            color: '#94a3b8',
            fontSize: 11,
            lineHeight: 1.35,
          }}
        >
          {description}
        </span>
      </span>

      <ChevronRight
        size={16}
        color="#64748b"
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent:
          'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom:
          '1px solid rgba(148,163,184,0.1)',
      }}
    >
      <span
        style={{
          color: '#94a3b8',
          fontSize: 13,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          maxWidth: '58%',
          color: '#f8fafc',
          fontSize: 13,
          textAlign: 'right',
        }}
      >
        {value}
      </strong>
    </div>
  );
}