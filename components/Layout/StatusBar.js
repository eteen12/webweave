"use client";

const STATUS_CONFIG = {
  booting:    { label: "Booting environment...", color: "#007acc" },
  installing: { label: "Installing dependencies...", color: "#007acc" },
  starting:   { label: "Starting dev server...", color: "#007acc" },
  ready:      { label: "Ready", color: "#388a34" },
  error:      { label: "Error — check console", color: "#c72e0f" },
};

export default function StatusBar({ status = "booting" }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.booting;

  return (
    <div
      style={{
        height: "24px",
        background: config.color,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        paddingLeft: "12px",
        paddingRight: "12px",
        gap: "8px",
        fontSize: "12px",
        flexShrink: 0,
        transition: "background 0.3s",
      }}
    >
      {status !== "ready" && status !== "error" && <PulsingDot />}
      <span>{config.label}</span>
    </div>
  );
}

function PulsingDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.7)",
        animation: "pulse 1.2s ease-in-out infinite",
      }}
    />
  );
}
