'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function StaticPeopleRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    loadCurrentEvent();
  }, []);

  async function loadCurrentEvent() {
    const accountId = params.accountId as string;

    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_show_ended', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!event) return;

    router.replace(`/peoples-choice/${event.id}`);
  }

  return (
    <main className="container">
      <div className="card">
        <h1>Loading People's Choice...</h1>
      </div>
    </main>
  );
}
