import Image from 'next/image';

type Props = {
  logoUrl?: string | null;
  title?: string;
};

export default function SVLogoHeader({
  logoUrl,
  title = 'Signup',
}: Props) {
  return (
    <section className="sv-logo-header">
      <Image
        src="/stagevotes-logo.png"
        alt="StageVotes"
        width={250}
        height={125}
        priority
      />

      {logoUrl && (
        <img
          src={logoUrl}
          alt="Venue Logo"
          className="sv-venue-logo"
        />
      )}

      <h1>{title}</h1>
    </section>
  );
}