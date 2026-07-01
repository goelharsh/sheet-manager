"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Play,
  Scissors,
  Copy,
  Clipboard,
  Plus,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { ImportedSheet } from "./SpreadsheetGrid";
import { ToastType } from "./ui/Toast";

const MENU_WIDTH = 244;
const MENU_HEIGHT = 300;

interface RowContextMenuProps {
  rowIdx: number;
  position: { x: number; y: number };
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  onClose: () => void;
  onSheetsChange: (sheets: ImportedSheet[]) => void;
  onRunRow?: (rowIdx: number) => void;
  toast?: (type: ToastType, title: string, description?: string) => void;
}

export function RowContextMenu({
  rowIdx,
  position,
  sheets,
  activeSheetIdx,
  onClose,
  onSheetsChange,
  onRunRow,
  toast,
}: RowContextMenuProps) {
  const sheet = sheets[activeSheetIdx];
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const menuX = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  const menuY = Math.min(position.y, window.innerHeight - MENU_HEIGHT - 8);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // ── Clipboard helpers ─────────────────────────────────────────────────────

  const copyRowToClipboard = async () => {
    const row = sheet.data[rowIdx] || [];
    const tsv = row.map((c) => c.value ?? "").join("\t");
    try { await navigator.clipboard.writeText(tsv); } catch { /* deny is fine */ }
  };

  const handleCopy = async () => {
    await copyRowToClipboard();
    close();
  };

  const handleCut = async () => {
    await copyRowToClipboard();
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
    close();
  };

  const handlePaste = async () => {
    let text = "";
    try { text = await navigator.clipboard.readText(); } catch { close(); return; }
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

  // ── Row mutation helpers ──────────────────────────────────────────────────

  const handleInsertRow = () => {
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      const colCount = s.data[0]?.length || 1;
      const emptyRow = Array.from({ length: colCount }, () => ({ value: "", style: {} }));
      const newData = [...s.data];
      newData.splice(rowIdx, 0, emptyRow);
      const newRows = s.rows ? [...s.rows] : s.data.map(() => ({}));
      newRows.splice(rowIdx, 0, {});
      return { ...s, data: newData, rows: newRows };
    });
    onSheetsChange(next);
    close();
  };

  const handleDeleteRow = () => {
    if (sheet.data.length <= 1) { close(); return; }
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

  // ── Menu item sub-component ───────────────────────────────────────────────

  function MenuItem({
    icon,
    label,
    shortcut,
    danger,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
    danger?: boolean;
    onClick: () => void;
  }) {
    const [hov, setHov] = useState(false);
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "7px 14px",
          fontSize: "12.5px",
          cursor: "pointer",
          background: hov ? "var(--at-tab-hover)" : "transparent",
          color: danger ? (hov ? "#b91c1c" : "#dc2626") : "var(--at-text)",
          border: "none",
          width: "100%",
          textAlign: "left",
          transition: "background 0.1s",
          userSelect: "none",
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <span style={{ color: danger ? "inherit" : "var(--at-text-muted)", flexShrink: 0 }}>
          {icon}
        </span>
        <span style={{ flex: 1 }}>{label}</span>
        {shortcut && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--at-text-muted)",
              fontFamily: "monospace",
              letterSpacing: "0.02em",
            }}
          >
            {shortcut}
          </span>
        )}
      </button>
    );
  }

  const Divider = () => (
    <div style={{ height: "1px", background: "var(--at-border-light)", margin: "4px 0" }} />
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={close}
        onContextMenu={(e) => { e.preventDefault(); close(); }}
      />

      {/* Menu panel */}
      <div
        style={{
          position: "fixed",
          left: menuX,
          top: menuY,
          width: MENU_WIDTH,
          background: "var(--at-surface)",
          border: "1px solid var(--at-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
          zIndex: 1000,
          padding: "6px 0",
          animation: "fadeIn 0.1s ease-out",
        }}
      >
        <MenuItem
          icon={<Play size={13} />}
          label="Run 1 cell"
          onClick={() => {
            if (onRunRow) {
              onRunRow(rowIdx);
              close();
            } else {
              toast?.(
                "warning",
                "No action configured",
                "Set up an HTTP action in the HTTP API panel first."
              );
              close();
            }
          }}
        />

        <Divider />

        <MenuItem
          icon={<Scissors size={13} />}
          label="Cut"
          shortcut="Ctrl+X"
          onClick={handleCut}
        />
        <MenuItem
          icon={<Copy size={13} />}
          label="Copy"
          shortcut="Ctrl+C"
          onClick={handleCopy}
        />
        <MenuItem
          icon={<Clipboard size={13} />}
          label="Paste"
          shortcut="Ctrl+V"
          onClick={handlePaste}
        />

        <Divider />

        <MenuItem
          icon={<Plus size={13} />}
          label="Insert row"
          onClick={handleInsertRow}
        />
        <MenuItem
          icon={<MessageSquare size={13} />}
          label="Leave feedback"
          onClick={() => setFeedbackModal(true)}
        />

        <Divider />

        <MenuItem
          icon={<Trash2 size={13} />}
          label="Delete 1 row"
          danger
          onClick={handleDeleteRow}
        />
      </div>

      {/* Feedback modal */}
      {feedbackModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 1002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => { setFeedbackModal(false); close(); }}
        >
          <div
            style={{
              background: "var(--at-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              width: "360px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {feedbackSent ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "28px", marginBottom: "10px" }}>✓</div>
                <p style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "var(--at-text)" }}>
                  Thanks for the feedback!
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700 }}>
                  Leave feedback
                </h3>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: "12px",
                    color: "var(--at-text-muted)",
                  }}
                >
                  Row {rowIdx + 1} — what would you like to share?
                </p>
                <textarea
                  autoFocus
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  placeholder="Describe what's working well or what could be improved..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--at-border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-body)",
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                    marginTop: "14px",
                  }}
                >
                  <button
                    onClick={() => { setFeedbackModal(false); close(); }}
                    style={{
                      padding: "7px 16px",
                      border: "1px solid var(--at-border)",
                      borderRadius: "var(--radius-sm)",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setFeedbackSent(true);
                      setTimeout(() => { setFeedbackModal(false); close(); }, 1500);
                    }}
                    style={{
                      padding: "7px 16px",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--at-accent)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
