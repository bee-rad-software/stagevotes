'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StaticSignupRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    loadCurrentEvent();
  }, []);

  async function loadCurrentEvent() {
    const accountId = params.accountId as string;

  const { data: venue, error } = await supabase
  .from('venues')
  .select('current_event_id')
  .eq('account_id', accountId)
  .not('current_event_id', 'is', null)
  .limit(1)
  .maybeSingle();

if (error) {
  console.error(
    'Unable to resolve static signup event:',
    error
  );
  return;
}

if (!venue?.current_event_id) {
  return;
}

router.replace(
  `/signup/${venue.current_event_id}`
);

   if (!venue?.current_event_id) {
  return;
}

   router.replace(
  `/signup/${venue.current_event_id}`
);
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Loading Signup...</h1>
        <p>Please wait.</p>
      </div>
    </main>
  );
}
