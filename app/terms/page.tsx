export default function TermsPage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Terms of Service</h1>
        <p><strong>Last updated:</strong> September 23, 2026</p>

        <p>
          StageVotes is a karaoke contest management and voting platform. By using StageVotes,
          you agree to use the service responsibly and only for lawful events and activities.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for maintaining access to your account and for activity that occurs
          under your account.
        </p>

        <h2>Subscriptions</h2>
        <p>
          StageVotes may offer paid subscriptions, free trials, and recurring billing through Stripe.
          You may manage or cancel your subscription through the billing portal.
        </p>

        <h2>Event Content</h2>
        <p>
          You are responsible for event names, performer names, song entries, votes, and other
          information entered into StageVotes.
        </p>

        <h2>Availability</h2>
        <p>
          We aim to keep StageVotes available, but we do not guarantee uninterrupted or error-free
          service.
        </p>

        <h2>SMS Terms</h2>
        <p>
          StageVotes offers optional, time-sensitive karaoke queue notifications by SMS. If you
          opt in through a StageVotes singer signup form, you may receive an on-deck notification
          and a notification when it is your turn to perform, up to two messages per queued song.
          Message frequency depends on the number of songs you submit.
        </p>
        <p>
          Message and data rates may apply. Consent to receive SMS messages is optional and is not
          a condition of participating in karaoke or using StageVotes. Reply STOP to cancel future
          messages. Reply HELP for help. Carriers are not liable for delayed or undelivered messages.
        </p>
        <p>
          For details about how StageVotes handles mobile numbers and SMS consent, review our{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent through the contact page.
        </p>
      </div>
    </main>
  );
}
