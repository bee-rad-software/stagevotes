"use client";

import { useParams } from "next/navigation";

export default function KaraFunDisplay() {
  const params = useParams();
  const eventId = params.eventId;

  return (
    <div style={{ width: 380, height: "100vh", background: "#0f172a", color: "white", padding: 22 }}>
      <h1>StageVotes</h1>
      <p>KaraFun Layout</p>
      <h2>Current Singer</h2>
      <p>Waiting...</p>
      <h2>Up Next</h2>
      <ol>
        <li>Next singer</li>
        <li>Next singer</li>
        <li>Next singer</li>
        <li>Next singer</li>
        <li>Next singer</li>
      </ol>
      <p>Event ID: {eventId}</p>
    </div>
  );
}
