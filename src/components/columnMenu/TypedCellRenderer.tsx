"use client";

import React from "react";
import { CheckSquare, Square, User } from "lucide-react";
import { ColumnType } from "./types";

const PILL_COLORS = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#fef9c3", color: "#854d0e" },
  { bg: "#ffedd5", color: "#9a3412" },
  { bg: "#f3e8ff", color: "#7e22ce" },
  { bg: "#fce7f3", color: "#9d174d" },
  { bg: "#ccfbf1", color: "#0f766e" },
  { bg: "#e0f2fe", color: "#0369a1" },
];

export function getPillColor(value: string) {
  const idx = Math.abs(
    value.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % PILL_COLORS.length;
  return PILL_COLORS[idx];
}

function Pill({ value }: { value: string }) {
  const { bg, color } = getPillColor(value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 7px",
        background: bg,
        color,
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 500,
        flexShrink: 0,
        whiteSpace: "nowrap",
        lineHeight: 1.6,
      }}
    >
      {value}
    </span>
  );
}

interface TypedCellRendererProps {
  value: string;
  type: ColumnType;
  onToggle?: () => void;
}

export function TypedCellRenderer({ value, type, onToggle }: TypedCellRendererProps) {
  switch (type) {
    case "number": {
      const n = parseFloat(value.replace(/,/g, ""));
      return (
        <span style={{ display: "block", textAlign: "right", color: "var(--at-text)" }}>
          {value === "" ? "" : isNaN(n) ? value : n.toLocaleString()}
        </span>
      );
    }

    case "currency": {
      const n = parseFloat(value.replace(/[$,]/g, ""));
      return (
        <span style={{ display: "block", textAlign: "right", color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
          {value === "" ? "" : isNaN(n) ? value : `$${n.toFixed(2)}`}
        </span>
      );
    }

    case "date": {
      if (!value) return null;
      const d = new Date(value);
      const formatted = isNaN(d.getTime())
        ? value
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return <span style={{ color: "var(--at-text)" }}>{formatted}</span>;
    }

    case "url": {
      if (!value) return null;
      const href = /^https?:\/\//.test(value) ? value : `https://${value}`;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            color: "var(--at-accent)",
            textDecoration: "underline",
            textDecorationColor: "var(--at-border)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
            fontSize: "12.5px",
          }}
        >
          {value}
        </a>
      );
    }

    case "email": {
      if (!value) return null;
      return (
        <a
          href={`mailto:${value}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            color: "var(--at-accent)",
            textDecoration: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
            fontSize: "12.5px",
          }}
        >
          {value}
        </a>
      );
    }

    case "image": {
      if (!value) return null;
      return (
        <img
          src={value}
          alt=""
          style={{
            height: "18px",
            width: "auto",
            maxWidth: "100%",
            objectFit: "cover",
            borderRadius: "3px",
            display: "block",
            verticalAlign: "middle",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    case "checkbox": {
      const checked = value === "true";
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: checked ? "var(--at-accent)" : "var(--at-border)",
            width: "100%",
            height: "100%",
          }}
        >
          {checked ? <CheckSquare size={14} /> : <Square size={14} />}
        </button>
      );
    }

    case "select": {
      if (!value) return null;
      return <Pill value={value} />;
    }

    case "multi-select": {
      const parts = value.split(",").map((v) => v.trim()).filter(Boolean);
      if (!parts.length) return null;
      return (
        <div style={{ display: "flex", gap: "3px", overflow: "hidden", alignItems: "center" }}>
          {parts.map((p, i) => (
            <Pill key={i} value={p} />
          ))}
        </div>
      );
    }

    case "assigned-to": {
      if (!value) return null;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", overflow: "hidden" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "var(--at-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={10} color="#fff" />
          </div>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12.5px" }}>
            {value}
          </span>
        </div>
      );
    }

    case "paragraph":
    case "text":
    default:
      return <>{value}</>;
  }
}
