"use client";

import React, { useState } from "react";
import {
  Zap,
  Sparkles,
  Settings2,
  MessageSquare,
  GitBranch,
  AtSign,
  Calendar,
  CheckSquare,
  Circle,
  Link2,
  List,
  User,
  Image as ImageIcon,
  DollarSign,
} from "lucide-react";
import { ColumnType } from "./columnMenu/types";
import { ToastType } from "./ui/Toast";

const MENU_WIDTH = 228;

interface AddColumnMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onAddColumn: (type: ColumnType, name: string) => void;
  toast?: (type: ToastType, title: string, description?: string) => void;
}

// ── Static item lists ─────────────────────────────────────────────────────────

const ADVANCED_ITEMS = [
  { icon: <Zap size={13} />,           label: "Add enrichment" },
  { icon: <Sparkles size={13} />,      label: "Use AI" },
  { icon: <Settings2 size={13} />,     label: "Functions" },
  { icon: <MessageSquare size={13} />, label: "Message" },
  { icon: <GitBranch size={13} />,     label: "Waterfall" },
  {
    icon: <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "serif" }}>ƒ</span>,
    label: "Formula",
  },
  { icon: <span style={{ fontSize: "12px" }}>⇅</span>, label: "Merge columns" },
];

const DATA_TYPE_ITEMS: { type: ColumnType; icon: React.ReactNode; label: string }[] = [
  { type: "text",     icon: <span style={{ fontSize: "12px", fontWeight: 700 }}>T</span>, label: "Text" },
  { type: "number",   icon: <span style={{ fontSize: "12px", fontWeight: 700 }}>#</span>, label: "Number" },
  { type: "currency", icon: <DollarSign size={13} />, label: "Currency" },
  { type: "date",     icon: <Calendar size={13} />,   label: "Date" },
  { type: "url",      icon: <Link2 size={13} />,      label: "URL" },
  { type: "email",    icon: <AtSign size={13} />,     label: "Email" },
  { type: "image",    icon: <ImageIcon size={13} />,  label: "Image from URL" },
];

const SELECTION_ITEMS: { type: ColumnType; icon: React.ReactNode; label: string }[] = [
  { type: "checkbox",     icon: <CheckSquare size={13} />, label: "Checkbox" },
  { type: "select",       icon: <Circle size={13} />,      label: "Select" },
  { type: "multi-select", icon: <List size={13} />,        label: "Multi-select" },
  { type: "assigned-to",  icon: <User size={13} />,        label: "Assigned to" },
];

// ── Primitive UI components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "8px 14px 3px",
        fontSize: "9.5px",
        fontWeight: 700,
        color: "var(--at-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        userSelect: "none",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ height: "1px", background: "var(--at-border-light)", margin: "3px 0" }} />
  );
}

function MenuItem({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 14px",
        height: "33px",
        width: "100%",
        border: "none",
        background: hov && !disabled ? "var(--at-tab-hover)" : "transparent",
        color: disabled ? "var(--at-text-muted)" : "var(--at-text)",
        fontSize: "12.5px",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        transition: "background 0.1s",
        userSelect: "none",
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          color: "var(--at-text-soft)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          width: "16px",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {disabled && (
        <span
          style={{
            fontSize: "9px",
            padding: "1px 5px",
            background: "var(--at-surface-2)",
            border: "1px solid var(--at-border)",
            borderRadius: "3px",
            color: "var(--at-text-muted)",
            fontWeight: 700,
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          SOON
        </span>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AddColumnMenu({ position, onClose, onAddColumn, toast }: AddColumnMenuProps) {
  const menuX = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  // Pin to max available height so items never overflow off-screen
  const maxH = window.innerHeight - position.y - 12;
  const menuY = position.y;

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        style={{
          position: "fixed",
          left: menuX,
          top: menuY,
          width: MENU_WIDTH,
          maxHeight: Math.max(maxH, 300),
          background: "var(--at-surface)",
          border: "1px solid var(--at-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
          zIndex: 1000,
          animation: "fadeIn 0.1s ease-out",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Scrollable body */}
        <div style={{ overflowY: "auto", padding: "4px 0", flex: 1 }}>
          {/* ── Advanced (coming soon) ─────────────────────── */}
          <SectionLabel>Advanced</SectionLabel>
          {ADVANCED_ITEMS.map(({ icon, label }) => (
            <MenuItem
              key={label}
              icon={icon}
              label={label}
              disabled
              onClick={() =>
                toast?.(
                  "info",
                  "Coming soon",
                  `"${label}" will be available in a future update.`
                )
              }
            />
          ))}

          <Divider />

          {/* ── Data types ────────────────────────────────── */}
          <SectionLabel>Data types</SectionLabel>
          {DATA_TYPE_ITEMS.map(({ type, icon, label }) => (
            <MenuItem
              key={type}
              icon={icon}
              label={label}
              onClick={() => {
                onAddColumn(type, label);
                onClose();
              }}
            />
          ))}

          <Divider />

          {/* ── Selection ─────────────────────────────────── */}
          <SectionLabel>Selection</SectionLabel>
          {SELECTION_ITEMS.map(({ type, icon, label }) => (
            <MenuItem
              key={type}
              icon={icon}
              label={label}
              onClick={() => {
                onAddColumn(type, label);
                onClose();
              }}
            />
          ))}

          <div style={{ height: "4px" }} />
        </div>
      </div>
    </>
  );
}
