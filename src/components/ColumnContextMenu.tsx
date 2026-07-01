"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  Settings2,
  ArrowLeft,
  ArrowRight,
  Info,
  Palette,
  Type,
  Link2,
  Copy,
  Scissors,
  ArrowUp,
  ArrowDown,
  Pin,
  Eye,
  EyeOff,
  Trash2,
  ChevronRight,
  ListFilter,
  ShuffleIcon,
  Eraser,
} from "lucide-react";
import { ImportedSheet, ColumnMetadata } from "./SpreadsheetGrid";
import { ColumnType, ActiveSubmenu, SubmenuKey } from "./columnMenu/types";
import { InsertSubmenu, ColorSubmenu, TypeSubmenu, COLUMN_TYPES } from "./columnMenu/Submenus";
import {
  insertColumns,
  updateColMeta,
  sortByColumn,
  dedupeByColumn,
  duplicateColumn,
  deleteColumn,
  textToColumns,
} from "./columnMenu/actions";
import { ToastType } from "./ui/Toast";

const MENU_WIDTH = 240;

interface ColumnContextMenuProps {
  colIdx: number;
  position: { x: number; y: number };
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  onClose: () => void;
  onSheetsChange: (sheets: ImportedSheet[]) => void;
  onRenameStart: () => void;
  onEditColumn: () => void;
  onFilterColumn?: () => void;
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

function MenuItem({
  icon,
  label,
  danger,
  right,
  submenuKey,
  activeSubmenu,
  onHover,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  right?: React.ReactNode;
  submenuKey?: SubmenuKey;
  activeSubmenu?: ActiveSubmenu | null;
  onHover?: (key: SubmenuKey | null, e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const isActive = submenuKey != null && activeSubmenu?.key === submenuKey;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => {
        setHov(true);
        onHover?.(submenuKey ?? null, e);
      }}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "0 14px",
        height: "32px",
        fontSize: "12.5px",
        cursor: "pointer",
        background: hov || isActive ? "var(--at-tab-hover)" : "transparent",
        color: danger ? (hov || isActive ? "#b91c1c" : "#dc2626") : "var(--at-text)",
        border: "none",
        width: "100%",
        textAlign: "left",
        transition: "background 0.12s",
        userSelect: "none",
      }}
    >
      <span
        style={{
          color: danger ? "inherit" : "var(--at-text-muted)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {right}
      {submenuKey && (
        <ChevronRight size={12} style={{ color: "var(--at-text-muted)", flexShrink: 0 }} />
      )}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ColumnContextMenu({
  colIdx,
  position,
  sheets,
  activeSheetIdx,
  onClose,
  onSheetsChange,
  onRenameStart,
  onEditColumn,
  onFilterColumn,
  toast,
}: ColumnContextMenuProps) {
  const sheet = sheets[activeSheetIdx];
  const colMeta: ColumnMetadata = sheet?.cols?.[colIdx] || {};
  const currentType: ColumnType = (colMeta.type as ColumnType) || "text";
  const typeLabel = COLUMN_TYPES.find((t) => t.type === currentType)?.label ?? "Text";

  const [activeSubmenu, setActiveSubmenu] = useState<ActiveSubmenu | null>(null);
  const [onSubmenuPanel, setOnSubmenuPanel] = useState(false);
  const [t2cModal, setT2cModal] = useState(false);
  const [delimiter, setDelimiter] = useState(",");
  const [descModal, setDescModal] = useState(false);
  const [descValue, setDescValue] = useState(colMeta.description ?? "");

  const menuX = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  const menuY = Math.min(position.y, window.innerHeight - 560);
  const submenuX = menuX + MENU_WIDTH - 4;

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const act = (fn: () => ImportedSheet[]) => {
    onSheetsChange(fn());
    close();
  };

  const handleHover = (key: SubmenuKey | null, e: React.MouseEvent) => {
    if (key) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setActiveSubmenu({ key, anchorY: rect.top });
      setOnSubmenuPanel(false);
    } else if (!onSubmenuPanel) {
      setActiveSubmenu(null);
    }
  };

  const hiddenColCount = (sheet?.cols ?? []).filter((c) => c.hidden).length;

  const handleShowAllHiddenCols = () => {
    const next = sheets.map((s, si) => {
      if (si !== activeSheetIdx) return s;
      const colCount = s.data[0]?.length ?? 0;
      const newCols = (s.cols ?? Array.from({ length: colCount }, () => ({}))).map((c) => ({ ...c, hidden: false }));
      return { ...s, cols: newCols };
    });
    onSheetsChange(next);
    close();
  };

  const colName =
    colMeta.name || sheet?.data?.[0]?.[colIdx]?.value || `Column ${colIdx + 1}`;

  const showSubmenu = activeSubmenu !== null || onSubmenuPanel;

  const wrapSubmenu = (node: React.ReactNode) => (
    <div
      onMouseEnter={() => setOnSubmenuPanel(true)}
      onMouseLeave={() => { setOnSubmenuPanel(false); setActiveSubmenu(null); }}
    >
      {node}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={close}
        onContextMenu={(e) => { e.preventDefault(); close(); }}
      />

      {/* Menu */}
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
        {/* Column name header */}
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
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {colName}
        </div>

        {/* Column actions */}
        <MenuItem
          icon={<Pencil size={13} />}
          label="Rename column"
          onHover={handleHover}
          onClick={() => { onRenameStart(); close(); }}
        />
        <MenuItem
          icon={<Settings2 size={13} />}
          label="Edit column"
          onHover={handleHover}
          onClick={() => { onEditColumn(); close(); }}
        />

        <Divider />

        {/* Structure */}
        <SectionLabel>Structure</SectionLabel>
        <MenuItem
          icon={<ArrowLeft size={13} />}
          label="Insert column left"
          submenuKey="insertLeft"
          activeSubmenu={activeSubmenu}
          onHover={handleHover}
        />
        <MenuItem
          icon={<ArrowRight size={13} />}
          label="Insert column right"
          submenuKey="insertRight"
          activeSubmenu={activeSubmenu}
          onHover={handleHover}
        />
        <MenuItem
          icon={<Copy size={13} />}
          label="Duplicate column"
          onHover={handleHover}
          onClick={() => act(() => duplicateColumn(sheets, activeSheetIdx, colIdx))}
        />

        <Divider />

        {/* Sort & Filter */}
        <SectionLabel>Sort & Filter</SectionLabel>
        <MenuItem
          icon={<ArrowUp size={13} />}
          label="Sort A → Z"
          onHover={handleHover}
          onClick={() => act(() => sortByColumn(sheets, activeSheetIdx, colIdx, "asc"))}
        />
        <MenuItem
          icon={<ArrowDown size={13} />}
          label="Sort Z → A"
          onHover={handleHover}
          onClick={() => act(() => sortByColumn(sheets, activeSheetIdx, colIdx, "desc"))}
        />
        <MenuItem
          icon={<ShuffleIcon size={13} />}
          label="Dedupe rows"
          onHover={handleHover}
          onClick={() => act(() => dedupeByColumn(sheets, activeSheetIdx, colIdx))}
        />
        <MenuItem
          icon={<ListFilter size={13} />}
          label="Filter on this column"
          onHover={handleHover}
          onClick={() => { onFilterColumn?.(); close(); }}
        />

        <Divider />

        {/* Display */}
        <SectionLabel>Display</SectionLabel>
        <MenuItem
          icon={<Palette size={13} />}
          label="Change color"
          submenuKey="changeColor"
          activeSubmenu={activeSubmenu}
          onHover={handleHover}
        />
        <MenuItem
          icon={<Type size={13} />}
          label={typeLabel}
          submenuKey="columnType"
          activeSubmenu={activeSubmenu}
          onHover={handleHover}
        />
        <MenuItem
          icon={<Info size={13} />}
          label="Edit description"
          onHover={handleHover}
          onClick={() => setDescModal(true)}
        />
        <MenuItem
          icon={<Pin size={13} />}
          label={colMeta.pinned ? "Unpin column" : "Pin column"}
          onHover={handleHover}
          onClick={() =>
            act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { pinned: !colMeta.pinned }))
          }
        />
        <MenuItem
          icon={<EyeOff size={13} />}
          label="Hide column"
          onHover={handleHover}
          onClick={() =>
            act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { hidden: true }))
          }
        />
        {hiddenColCount > 0 && (
          <MenuItem
            icon={<Eye size={13} />}
            label={`Show ${hiddenColCount} hidden column${hiddenColCount === 1 ? "" : "s"}`}
            onHover={handleHover}
            onClick={handleShowAllHiddenCols}
          />
        )}

        <Divider />

        {/* Tools */}
        <SectionLabel>Tools</SectionLabel>
        <MenuItem
          icon={<Scissors size={13} />}
          label="Text to columns"
          onHover={handleHover}
          onClick={() => setT2cModal(true)}
        />
        <MenuItem
          icon={<Link2 size={13} />}
          label="Used in..."
          onHover={handleHover}
          onClick={() => {
            const count = (sheet.data.slice(1) || []).filter(
              (r) => (r[colIdx]?.value ?? "") !== ""
            ).length;
            toast?.(
              "info",
              "Column usage",
              `Used in ${count} of ${sheet.data.length - 1} row${sheet.data.length - 1 === 1 ? "" : "s"}.`
            );
            close();
          }}
        />
        <MenuItem
          icon={<Eraser size={13} />}
          label="Clear column contents"
          onHover={handleHover}
          onClick={() => {
            const next = sheets.map((s, si) => {
              if (si !== activeSheetIdx) return s;
              return {
                ...s,
                data: s.data.map((r, ri) =>
                  ri === 0
                    ? r.map((c) => ({ ...c }))
                    : r.map((c, ci) => ci === colIdx ? { ...c, value: "" } : { ...c })
                ),
              };
            });
            onSheetsChange(next);
            close();
          }}
        />

        <Divider />

        <MenuItem
          icon={<Trash2 size={13} />}
          label="Delete column"
          danger
          onHover={handleHover}
          onClick={() => act(() => deleteColumn(sheets, activeSheetIdx, colIdx))}
        />
      </div>

      {/* Submenus */}
      {showSubmenu && activeSubmenu?.key === "insertLeft" &&
        wrapSubmenu(
          <InsertSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            direction="left"
            onInsert={(count) =>
              act(() => insertColumns(sheets, activeSheetIdx, colIdx, count, false))
            }
          />
        )}
      {showSubmenu && activeSubmenu?.key === "insertRight" &&
        wrapSubmenu(
          <InsertSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            direction="right"
            onInsert={(count) =>
              act(() => insertColumns(sheets, activeSheetIdx, colIdx, count, true))
            }
          />
        )}
      {showSubmenu && activeSubmenu?.key === "changeColor" &&
        wrapSubmenu(
          <ColorSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            currentColor={colMeta.color}
            onSelect={(color) =>
              act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { color }))
            }
          />
        )}
      {showSubmenu && activeSubmenu?.key === "columnType" &&
        wrapSubmenu(
          <TypeSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            currentType={colMeta.type as ColumnType | undefined}
            onSelect={(type) =>
              act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { type }))
            }
          />
        )}

      {/* Text to columns modal */}
      {t2cModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 1002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setT2cModal(false)}
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
            <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700 }}>
              Text to columns
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--at-text-muted)" }}>
              Split cell values by a delimiter into adjacent columns.
            </p>
            <label
              style={{
                fontSize: "11.5px",
                fontWeight: 600,
                color: "var(--at-text-muted)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Delimiter character
            </label>
            <input
              autoFocus
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              placeholder='e.g.  ,  or  ;  or  |'
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--at-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none",
                fontFamily: "monospace",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "18px" }}>
              <button
                onClick={() => setT2cModal(false)}
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
                  if (delimiter) {
                    act(() => textToColumns(sheets, activeSheetIdx, colIdx, delimiter));
                  }
                  setT2cModal(false);
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
                Split column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description modal */}
      {descModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 1002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setDescModal(false)}
        >
          <div
            style={{
              background: "var(--at-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              width: "380px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700 }}>
              Column description
            </h3>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--at-text-muted)" }}>
              Shown as a tooltip on the column header.
            </p>
            <textarea
              autoFocus
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              rows={4}
              placeholder="Describe what this column contains..."
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
              style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "14px" }}
            >
              <button
                onClick={() => setDescModal(false)}
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
                  act(() =>
                    updateColMeta(sheets, activeSheetIdx, colIdx, { description: descValue })
                  );
                  setDescModal(false);
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
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
