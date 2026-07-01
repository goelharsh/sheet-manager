"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { ColumnType } from "./types";

// ── Shared panel style ──────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: "fixed",
  background: "var(--at-surface)",
  border: "1px solid var(--at-border)",
  borderRadius: "var(--radius-md)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
  zIndex: 1001,
  minWidth: "180px",
  padding: "6px 0",
  animation: "fadeIn 0.1s ease-out",
};

const subHeader: React.CSSProperties = {
  padding: "4px 14px 8px",
  fontSize: "10.5px",
  fontWeight: 700,
  color: "var(--at-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function SubItem({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 14px",
        fontSize: "12.5px",
        cursor: active ? "default" : "pointer",
        background: hov && !active ? "var(--at-tab-hover)" : "transparent",
        color: active ? "var(--at-text-muted)" : "var(--at-text)",
        fontWeight: active ? 600 : 400,
        border: "none",
        width: "100%",
        textAlign: "left",
        transition: "background 0.1s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

// ── Insert columns submenu ──────────────────────────────────────────────────

const INSERT_COUNTS = [1, 2, 3, 5, 10];

interface InsertSubmenuProps {
  x: number;
  y: number;
  direction: "left" | "right";
  onInsert: (count: number) => void;
}

export function InsertSubmenu({ x, y, direction, onInsert }: InsertSubmenuProps) {
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 200);
  return (
    <div style={{ ...panelStyle, left: adjustedX, top: adjustedY }}>
      <div style={subHeader}>Insert {direction}</div>
      {INSERT_COUNTS.map((n) => (
        <SubItem key={n} onClick={() => onInsert(n)}>
          {n} {n === 1 ? "column" : "columns"}
        </SubItem>
      ))}
    </div>
  );
}

// ── Change color submenu ────────────────────────────────────────────────────

const COL_COLORS = [
  { label: "Default", value: "" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Green", value: "#dcfce7" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Red", value: "#fee2e2" },
  { label: "Purple", value: "#f3e8ff" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Teal", value: "#ccfbf1" },
];

interface ColorSubmenuProps {
  x: number;
  y: number;
  currentColor?: string;
  onSelect: (color: string) => void;
}

export function ColorSubmenu({ x, y, currentColor, onSelect }: ColorSubmenuProps) {
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 200);
  return (
    <div style={{ ...panelStyle, left: adjustedX, top: adjustedY, minWidth: "190px" }}>
      <div style={subHeader}>Header color</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "0 14px 10px" }}>
        {COL_COLORS.map(({ label, value }) => {
          const isSelected = currentColor === value || (!currentColor && value === "");
          return (
            <button
              key={label}
              title={label}
              onClick={() => onSelect(value)}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                border: isSelected
                  ? "2px solid var(--at-accent)"
                  : "1.5px solid var(--at-border)",
                background: value || "#f4f4f2",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {isSelected && <Check size={12} color={value ? "#374151" : "#9ca3af"} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Column type submenu ─────────────────────────────────────────────────────

const COLUMN_TYPES: { type: ColumnType; label: string; icon: string }[] = [
  { type: "checkbox",     label: "Checkbox",      icon: "☑" },
  { type: "number",       label: "Number",        icon: "#" },
  { type: "text",         label: "Text",          icon: "T" },
  { type: "url",          label: "URL",           icon: "↗" },
  { type: "date",         label: "Date",          icon: "▦" },
  { type: "select",       label: "Select",        icon: "○" },
  { type: "multi-select", label: "Multi-select",  icon: "≡" },
  { type: "email",        label: "Email",         icon: "@" },
  { type: "currency",     label: "Currency",      icon: "$" },
  { type: "paragraph",    label: "Paragraph",     icon: "¶" },
];

interface TypeSubmenuProps {
  x: number;
  y: number;
  currentType?: ColumnType;
  onSelect: (type: ColumnType) => void;
}

export function TypeSubmenu({ x, y, currentType, onSelect }: TypeSubmenuProps) {
  const adjustedX = Math.min(x, window.innerWidth - 210);
  const adjustedY = Math.min(y, window.innerHeight - 340);
  const active = currentType ?? "text";
  return (
    <div style={{ ...panelStyle, left: adjustedX, top: adjustedY }}>
      <div style={subHeader}>Change column type</div>
      {COLUMN_TYPES.map(({ type, label, icon }) => (
        <SubItem
          key={type}
          onClick={type === active ? undefined : () => onSelect(type)}
          active={type === active}
        >
          <span style={{ width: "16px", textAlign: "center", fontSize: "12px", flexShrink: 0 }}>
            {icon}
          </span>
          <span style={{ flex: 1 }}>{label}</span>
          {type === active && <Check size={11} style={{ color: "var(--at-accent)" }} />}
        </SubItem>
      ))}
    </div>
  );
}

export { COLUMN_TYPES };
