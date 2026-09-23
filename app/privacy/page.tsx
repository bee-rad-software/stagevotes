export default function PrivacyPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Privacy Policy</h1>
        <p><strong>Last updated:</strong> September 23, 2026</p>

        <p>
          StageVotes collects the information needed to create accounts, manage karaoke events,
          process voting, and provide subscription access.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We may collect account name, email address, event details, performer names, song entries,
          votes, device identifiers, optional mobile phone numbers, SMS consent records, and limited
          location/check-in information when enabled by the event host.
        </p>

        <h2>How We Use Information</h2>
        <p>
          We use this information to operate events, prevent duplicate voting, manage subscriptions,
          provide support, and improve StageVotes.
        </p>

        <h2>SMS Queue Notifications</h2>
        <p>
          Singers may optionally provide a mobile phone number and actively opt in to receive
          time-sensitive karaoke queue notifications. These messages may notify a singer when they
          are on deck and when it is their turn to perform. StageVotes does not use this consent for
          marketing. Consent is optional and is not required to participate in an event.
        </p>
        <p>
          We do not sell or share your SMS opt-in data or personal information with third parties
          for marketing purposes. Mobile information will not be shared with third parties or
          affiliates for marketing or promotional purposes. We may provide limited information to
          service providers, such as our messaging provider, only as necessary to deliver requested
          StageVotes notifications.
        </p>
        <p>
          You may reply STOP to opt out of SMS messages or HELP for assistance. Message and data
          rates may apply.
        </p>

        <h2>Payments</h2>
        <p>
          Payments are processed by Stripe. StageVotes does not store full credit card numbers.
        </p>

        <h2>Data Sharing</h2>
        <p>
          We do not sell personal information. We may share limited data with service providers
          needed to operate the platform, such as hosting, database, authentication, and payment
          services.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions can be sent through the contact page.
        </p>
      </div>
    </main>
  );
}
