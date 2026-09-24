import { redirect } from 'next/navigation';
import { desktopPlatform } from '@/lib/desktopDownloadIntent';

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ download?: string }>;
}) {
  const platform = desktopPlatform((await searchParams).download);
  redirect(platform ? `/onboarding?download=${platform}` : '/onboarding');
}
