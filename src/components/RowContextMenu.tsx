"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Scissors,
  Copy,
  Clipboard,
  ArrowUp,
  ArrowDown,
  Eraser,
  EyeOff,
  Trash2,
  Check,
  Layers,
} from "lucide-react";
import { ImportedSheet } from "./SpreadsheetGrid";
import { ToastType } from "./ui/Toast";

const MENU_WIDTH = 256;

interface RowContextMenuProps {
  rowIdx: number;
  position: { x: number; y: number };
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  onClose: () => void;
  onSheetsChange: (sheets: ImportedSheet[]) => void;
  toast?: (type: ToastType, title: string, description?: string) => void;
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: "1px", background: "var(--at-border-light)", margin: "3px 0" }} />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: "8px 14px 2px",
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

function Kbd({ children }: { children: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 5px",
        background: "var(--at-surface-2)",
        border: "1px solid var(--at-border)",
        borderRadius: "3px",
        fontSize: "10px",
        fontFamily: "monospace",
        color: "var(--at-text-muted)",
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  success,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  success?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);

  const textColor = success
    ? "#15803d"
    : danger
    ? hov ? "#b91c1c" : "#dc2626"
    : disabled
    ? "var(--at-text-muted)"
    : "var(--at-text)";

  const bg = success
    ? "#f0fdf4"
    : hov && !disabled
    ? "var(--at-tab-hover)"
    : "transparent";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 14px",
        height: "32px",
        fontSize: "12.5px",
        cursor: disabled ? "default" : "pointer",
        background: bg,
        color: textColor,
        border: "none",
        width: "100%",
        textAlign: "left",
        transition: "background 0.12s, color 0.12s",
        userSelect: "none",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span
        style={{
          color: success ? "#15803d" : danger ? "inherit" : "var(--at-text-muted)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          transition: "color 0.12s",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, fontWeight: success ? 600 : 400 }}>{label}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RowContextMenu({
  rowIdx,
  position,
  sheets,
  activeSheetIdx,
  onClose,
  onSheetsChange,
  toast,
}: RowContextMenuProps) {
  const sheet = sheets[activeSheetIdx];
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [cutState, setCutState] = useState<"idle" | "cut">("idle");

  // Estimate menu height for viewport clamping
  const MENU_HEIGHT = 310;
  const menuX = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  const menuY = Math.min(position.y, window.innerHeight - MENU_HEIGHT - 8);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // ── Clipboard ──────────────────────────────────────────────────────────────

  const copyRowToClipboard = async () => {
    const row = sheet.data[rowIdx] || [];
    const tsv = row.map((c) => c.value ?? "").join("\t");
    try {
      await navigator.clipboard.writeText(tsv);
    } catch {
      /* clipboard denied — skip silently */
    }
  };

  const handleCopy = async () => {
    await copyRowToClipboard();
    setCopyState("copied");
    setTimeout(() => close(), 900);
  };

  const handleCut = async () => {
    await copyRowToClipboard();
    setCutState("cut");
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      return {
        ...s,
        data: s.data.map((r, ri) =>
          ri === rowIdx
            ? r.map((c) => ({ ...c, value: "" }))
            : r.map((c) => ({ ...c }))
        ),
      };
    });
    onSheetsChange(next);
    setTimeout(() => close(), 600);
  };

  const handlePaste = async () => {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast?.("error", "Clipboard unavailable", "Grant clipboard permission and try again.");
      close();
      return;
    }
    if (!text) { close(); return; }
    const values = text.split("\t");
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      return {
        ...s,
        data: s.data.map((r, ri) => {
          if (ri !== rowIdx) return r.map((c) => ({ ...c }));
          return r.map((c, ci) => ({
            ...c,
            value: ci < values.length ? values[ci] : c.value,
          }));
        }),
      };
    });
    onSheetsChange(next);
    close();
  };

  // ── Mutations ──────────────────────────────────────────────────────────────

  const insertRow = (at: number) => {
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      const colCount = s.data[0]?.length || 1;
      const emptyRow = Array.from({ length: colCount }, () => ({ value: "", style: {} }));
      const newData = [...s.data];
      newData.splice(at, 0, emptyRow);
      const newRows = s.rows ? [...s.rows] : s.data.map(() => ({}));
      newRows.splice(at, 0, {});
      return { ...s, data: newData, rows: newRows };
    });
    onSheetsChange(next);
    close();
  };

  const handleDuplicate = () => {
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      const dupRow = s.data[rowIdx].map((c) => ({ ...c, style: { ...c.style } }));
      const newData = [...s.data];
      newData.splice(rowIdx + 1, 0, dupRow);
      const newRows = s.rows ? [...s.rows] : s.data.map(() => ({}));
      newRows.splice(rowIdx + 1, 0, { ...(s.rows?.[rowIdx] || {}) });
      return { ...s, data: newData, rows: newRows };
    });
    onSheetsChange(next);
    close();
  };

  const handleClearRow = () => {
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      return {
        ...s,
        data: s.data.map((r, ri) =>
          ri === rowIdx ? r.map((c) => ({ ...c, value: "" })) : r.map((c) => ({ ...c }))
        ),
      };
    });
    onSheetsChange(next);
    close();
  };

  const handleHideRow = () => {
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      const rowCount = s.data.length;
      const newRows = s.rows
        ? s.rows.map((r) => ({ ...r }))
        : Array.from({ length: rowCount }, () => ({}));
      newRows[rowIdx] = { ...newRows[rowIdx], hidden: true };
      return { ...s, rows: newRows };
    });
    onSheetsChange(next);
    close();
  };

  const handleDeleteRow = () => {
    if (sheet.data.length <= 1) {
      toast?.("warning", "Cannot delete", "The sheet must have at least one row.");
      close();
      return;
    }
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      return {
        ...s,
        data: s.data.filter((_, ri) => ri !== rowIdx),
        rows: s.rows ? s.rows.filter((_, ri) => ri !== rowIdx) : undefined,
      };
    });
    onSheetsChange(next);
    close();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={close}
        onContextMenu={(e) => { e.preventDefault(); close(); }}
      />

      <div
        style={{
          position: "fixed",
          left: menuX,
          top: menuY,
          width: MENU_WIDTH,
          background: "var(--at-surface)",
          border: "1px solid var(--at-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
          zIndex: 1000,
          padding: "4px 0",
          animation: "fadeIn 0.1s ease-out",
          overflow: "hidden",
        }}
      >
        {/* Row label */}
        <div
          style={{
            padding: "8px 14px 6px",
            fontSize: "10.5px",
            fontWeight: 700,
            color: "var(--at-text-muted)",
            borderBottom: "1px solid var(--at-border-light)",
            marginBottom: "3px",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Row {rowIdx + 1}
        </div>

        {/* Clipboard */}
        <SectionLabel>Clipboard</SectionLabel>
        <MenuItem
          icon={cutState === "cut" ? <Check size={13} /> : <Scissors size={13} />}
          label={cutState === "cut" ? "Cut!" : "Cut row"}
          shortcut={cutState === "idle" ? "Ctrl+X" : undefined}
          success={cutState === "cut"}
          onClick={handleCut}
        />
        <MenuItem
          icon={copyState === "copied" ? <Check size={13} /> : <Copy size={13} />}
          label={copyState === "copied" ? "Copied to clipboard" : "Copy row"}
          shortcut={copyState === "idle" ? "Ctrl+C" : undefined}
          success={copyState === "copied"}
          onClick={handleCopy}
        />
        <MenuItem
          icon={<Clipboard size={13} />}
          label="Paste"
          shortcut="Ctrl+V"
          onClick={handlePaste}
        />

        <Divider />

        {/* Insert */}
        <SectionLabel>Insert</SectionLabel>
        <MenuItem
          icon={<ArrowUp size={13} />}
          label="Insert row above"
          onClick={() => insertRow(rowIdx)}
        />
        <MenuItem
          icon={<ArrowDown size={13} />}
          label="Insert row below"
          onClick={() => insertRow(rowIdx + 1)}
        />
        <MenuItem
          icon={<Layers size={13} />}
          label="Duplicate row"
          onClick={handleDuplicate}
        />

        <Divider />

        {/* Manage */}
        <SectionLabel>Manage</SectionLabel>
        <MenuItem
          icon={<Eraser size={13} />}
          label="Clear row contents"
          onClick={handleClearRow}
        />
        <MenuItem
          icon={<EyeOff size={13} />}
          label="Hide row"
          onClick={handleHideRow}
        />

        <Divider />

        <MenuItem
          icon={<Trash2 size={13} />}
          label="Delete 1 row"
          danger
          onClick={handleDeleteRow}
        />
      </div>
    </>
  );
}
