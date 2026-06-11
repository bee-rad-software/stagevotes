'use client';

import { useEffect, useState } from 'react';
import { supabase, EventRow } from '@/lib/supabase';
import { useParams } from 'next/navigation';

function getDeviceId() {
  if (typeof window === 'undefined') return '';

  let id = window.localStorage.getItem('karavote_device_id');

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('karavote_device_id', id);
  }

  return id;
}

export default function CheckInPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventRow | null>(null);
  const [message, setMessage] = useState('Checking you in...');

  useEffect(() => {
    checkIn();
  }, [eventId]);

  async function checkIn() {
    const deviceId = getDeviceId();

    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    setEvent(ev);

if (!ev?.venue_lat || !ev?.venue_lng) {
  setMessage('Venue location is not set for this event.');
  return;
}

const position = await new Promise<GeolocationPosition>((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  });
});

const distanceMeters = getDistanceMeters(
  position.coords.latitude,
  position.coords.longitude,
  ev.venue_lat,
  ev.venue_lng
);

const allowedRadius = ev.checkin_radius_meters || 150;

if (distanceMeters > allowedRadius) {
  setMessage(
    `You must be at the venue to check in. You appear to be about ${Math.round(
      distanceMeters
    )} meters away.`
  );
  return;
}
    
    const { error } = await supabase
      .from('event_checkins')
      .upsert(
        {
          event_id: eventId,
          device_id: deviceId
        },
        {
          onConflict: 'event_id,device_id'
        }
      );

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage('You are checked in for this event.');
  }

  return (
    <main className="container">
      <div className="card">
        <h1>StageVotes Check-In</h1>
        <p className="small">{event?.name}</p>

        <h2>✅ {message}</h2>

        <p>
          You can now vote from this device during the event.
        </p>
      </div>
    </main>
  );
}
