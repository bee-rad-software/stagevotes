export default function PrivacyPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Privacy Policy</h1>
        <p><strong>Last updated:</strong> June 26, 2026</p>

        <p>
          StageVotes collects the information needed to create accounts, manage karaoke events,
          process voting, and provide subscription access.
        </p>

        <h2>Information We Collect</h2>
        <p>
          We may collect account name, email address, event details, performer names, song entries,
          votes, device identifiers, and limited location/check-in information when enabled by the
          event host.
        </p>

        <h2>How We Use Information</h2>
        <p>
          We use this information to operate events, prevent duplicate voting, manage subscriptions,
          provide support, and improve StageVotes.
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
