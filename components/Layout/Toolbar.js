"use client";

import { useRef } from "react";
import { FilePlus, Upload, Download, Loader } from "lucide-react";

export default function Toolbar({ projectName, onNew, onUpload, onExport, disabled }) {
  const fileInputRef = useRef(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload?.(file);
    // Reset so re-selecting the same file fires onChange again
    e.target.value = "";
  };

  return (
    <div
      style={{
        height: "44px",
        background: "#323233",
        borderBottom: "1px solid #3c3c3c",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 12px",
        flexShrink: 0,
      }}
    >
      {/* Hidden file input for zip upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {/* Brand */}
      <span
        style={{
          fontWeight: 700,
          fontSize: "14px",
          color: "#ffffff",
          letterSpacing: "0.02em",
          marginRight: "8px",
          userSelect: "none",
        }}
      >
        WebWeave
      </span>

      {/* Project name badge */}
      <span
        style={{
          fontSize: "13px",
          padding: "2px 8px",
          borderRadius: "4px",
          background: "#3c3c3c",
          color: "#9d9d9d",
          maxWidth: "200px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {projectName || "Untitled Project"}
      </span>

      <div style={{ flex: 1 }} />

      {/* Loading indicator */}
      {disabled && (
        <span style={{ color: "#858585", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <Loader size={13} style={{ animation: "spin 1s linear infinite" }} />
          Working…
        </span>
      )}

      <ToolbarButton
        icon={<FilePlus size={14} />}
        label="New"
        onClick={onNew}
        disabled={disabled}
        title="Start a fresh Next.js project"
      />
      <ToolbarButton
        icon={<Upload size={14} />}
        label="Upload"
        onClick={handleUploadClick}
        disabled={disabled}
        title="Upload a Next.js project zip"
      />
      <ToolbarButton
        icon={<Download size={14} />}
        label="Export"
        onClick={onExport}
        disabled={disabled}
        title="Download project as zip"
        accent
      />
    </div>
  );
}

function ToolbarButton({ icon, label, onClick, disabled, title, accent }) {
  const base = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "4px 10px",
    borderRadius: "4px",
    fontSize: "13px",
    border: accent ? "none" : "1px solid #3c3c3c",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background 0.15s, opacity 0.15s",
    background: accent ? "#0070f3" : "transparent",
    color: accent ? "#ffffff" : "#9d9d9d",
    userSelect: "none",
  };

  return (
    <button
      style={base}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = accent ? "#005fce" : "#3c3c3c";
        if (!accent) e.currentTarget.style.color = "#cccccc";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = accent ? "#0070f3" : "transparent";
        if (!accent) e.currentTarget.style.color = "#9d9d9d";
      }}
    >
      {icon}
      {label}
    </button>
  );
}
