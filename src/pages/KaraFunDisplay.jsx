import React from "react";
import { useParams } from "react-router-dom";

export default function KaraFunDisplay() {
  const { eventId } = useParams();

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>StageVotes</div>
        <div style={styles.sub}>KaraFun Layout</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Current Singer</div>
        <div style={styles.currentName}>Waiting...</div>
        <div style={styles.song}>No song selected</div>
      </div>

      <div style={styles.section}>
        <div style={styles.label}>Up Next</div>
        <ol style={styles.list}>
          <li>Next singer</li>
          <li>Next singer</li>
          <li>Next singer</li>
          <li>Next singer</li>
          <li>Next singer</li>
        </ol>
      </div>

      <div style={styles.qrBox}>
        <div style={styles.qrPlaceholder}>QR</div>
        <div>
          <div style={styles.qrTitle}>Scan to Sing</div>
          <div style={styles.qrText}>Join the queue from your phone</div>
        </div>
      </div>

      <div style={styles.footer}>
        Event ID: {eventId}
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "380px",
    height: "100vh",
    background: "linear-gradient(180deg, #0f172a, #1e293b)",
    color: "white",
    padding: "22px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
  },
  header: {
    marginBottom: "28px",
  },
  logo: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#38bdf8",
  },
  sub: {
    fontSize: "14px",
    opacity: 0.8,
  },
  section: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: "18px",
    padding: "18px",
    marginBottom: "18px",
  },
  label: {
    fontSize: "14px",
    textTransform: "uppercase",
    opacity: 0.75,
    marginBottom: "8px",
  },
  currentName: {
    fontSize: "34px",
    fontWeight: "800",
  },
  song: {
    fontSize: "18px",
    opacity: 0.85,
    marginTop: "6px",
  },
  list: {
    margin: 0,
    paddingLeft: "24px",
    fontSize: "22px",
    lineHeight: "1.7",
  },
  qrBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "18px",
    padding: "14px",
  },
  qrPlaceholder: {
    width: "80px",
    height: "80px",
    background: "white",
    color: "#111827",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
  },
  qrTitle: {
    fontSize: "20px",
    fontWeight: "800",
  },
  qrText: {
    fontSize: "14px",
    opacity: 0.8,
  },
  footer: {
    position: "absolute",
    bottom: "12px",
    fontSize: "11px",
    opacity: 0.45,
  },
};
