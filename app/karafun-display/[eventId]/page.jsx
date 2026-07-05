"use client";

import { useParams } from "next/navigation";

export default function KaraFunDisplay() {
  const params = useParams();
  const eventId = params.eventId;

  return (
    <div
  style={{
    width: "100vw",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #07111f, #111827)",
    color: "white",
    padding: "18px 16px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  }}
>
     <div style={{ textAlign: "center", marginBottom: 16 }}>
  <div style={{ fontSize: 34, fontWeight: 900, color: "#38bdf8" }}>
    StageVotes
  </div>
  <div style={{ fontSize: 13, color: "#cbd5e1" }}>
    KaraFun Sidecar
  </div>
</div>

<div
  style={{
    background: "linear-gradient(135deg, #0ea5e9, #f97316)",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  }}
>
  <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4 }}>
    NOW SINGING
  </div>

  <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8 }}>
    🎤 Waiting...
  </div>

  <div style={{ fontSize: 16, opacity: 0.9, marginTop: 6 }}>
    Song will appear here
  </div>
</div>

<div
  style={{
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  }}
>
  <div
    style={{
      fontSize: 12,
      color: "#38bdf8",
      fontWeight: 900,
      letterSpacing: 1.4,
      marginBottom: 10,
    }}
  >
    UP NEXT
  </div>

  {["Next singer", "Next singer", "Next singer", "Next singer", "Next singer"].map(
    (name, index) => (
      <div
        key={index}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 21,
          fontWeight: 800,
          padding: "8px 0",
          borderBottom:
            index < 4 ? "1px solid rgba(148,163,184,0.18)" : "none",
        }}
      >
        <span style={{ color: "#f97316", minWidth: 28 }}>
          {index + 1}.
        </span>
        <span>{name}</span>
      </div>
    )
  )}
</div>

<div
  style={{
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 22,
    padding: 16,
    textAlign: "center",
  }}
>
  <div
    style={{
      width: 96,
      height: 96,
      background: "white",
      color: "#0f172a",
      borderRadius: 14,
      margin: "0 auto 10px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: 22,
    }}
  >
    QR
  </div>

  <div style={{ fontSize: 20, fontWeight: 900 }}>
    Scan to Join
  </div>

  <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>
    Add your song from your phone
  </div>
</div>
    </div>
  );
}
