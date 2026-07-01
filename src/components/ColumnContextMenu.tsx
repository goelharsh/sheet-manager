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
  EyeOff,
  Trash2,
  ChevronRight,
  Layers,
  ListFilter,
  ShuffleIcon,
} from "lucide-react";
import { ImportedSheet, ColumnMetadata } from "./SpreadsheetGrid";
import { ToastType } from "./ui/Toast";
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

const MENU_WIDTH = 232;

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
  const typeLabel =
    COLUMN_TYPES.find((t) => t.type === currentType)?.label ?? "Text";

  const [activeSubmenu, setActiveSubmenu] = useState<ActiveSubmenu | null>(null);
  const [onSubmenuPanel, setOnSubmenuPanel] = useState(false);
  const [t2cModal, setT2cModal] = useState(false);
  const [delimiter, setDelimiter] = useState(",");
  const [descModal, setDescModal] = useState(false);
  const [descValue, setDescValue] = useState(colMeta.description ?? "");

  // Adjust menu position to avoid viewport overflow
  const menuX = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  const menuY = Math.min(position.y, window.innerHeight - 540);
  const submenuX = menuX + MENU_WIDTH - 4;

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Apply action and close menu
  const act = (fn: () => ImportedSheet[]) => {
    onSheetsChange(fn());
    close();
  };

  // Trigger submenu on hover; clear when entering a non-submenu item
  const openSubmenu = (key: SubmenuKey, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveSubmenu({ key, anchorY: rect.top });
    setOnSubmenuPanel(false);
  };
  const clearSubmenu = () => {
    if (!onSubmenuPanel) setActiveSubmenu(null);
  };

  const showSubmenu =
    activeSubmenu !== null && (activeSubmenu !== null || onSubmenuPanel);

  // ── Menu item helper ──────────────────────────────────────────────────────

  function MenuItem({
    id,
    icon,
    label,
    danger,
    arrow,
    submenuKey,
    onClick,
  }: {
    id: string;
    icon: React.ReactNode;
    label: string;
    danger?: boolean;
    arrow?: boolean;
    submenuKey?: SubmenuKey;
    onClick?: () => void;
  }) {
    const [hov, setHov] = useState(false);
    const isActive = activeSubmenu?.key === submenuKey;
    return (
      <button
        type="button"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "9px",
          padding: "7px 14px",
          fontSize: "12.5px",
          cursor: "pointer",
          background: hov || isActive ? "var(--at-tab-hover)" : "transparent",
          color: danger
            ? hov ? "#b91c1c" : "#dc2626"
            : "var(--at-text)",
          border: "none",
          width: "100%",
          textAlign: "left",
          transition: "background 0.1s",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          setHov(true);
          if (submenuKey) openSubmenu(submenuKey, e);
          else clearSubmenu();
        }}
        onMouseLeave={() => setHov(false)}
        onClick={onClick}
        data-id={id}
      >
        <span style={{ color: danger ? "inherit" : "var(--at-text-muted)", flexShrink: 0 }}>
          {icon}
        </span>
        <span style={{ flex: 1 }}>{label}</span>
        {arrow && <ChevronRight size={13} style={{ color: "var(--at-text-muted)" }} />}
      </button>
    );
  }

  const Divider = () => (
    <div style={{ height: "1px", background: "var(--at-border-light)", margin: "4px 0" }} />
  );

  const colName =
    colMeta.name ||
    sheet?.data?.[0]?.[colIdx]?.value ||
    `Column ${colIdx + 1}`;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={close}
        onContextMenu={(e) => { e.preventDefault(); close(); }}
      />

      {/* Main menu */}
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
        {/* Column label header */}
        <div
          style={{
            padding: "4px 14px 8px",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--at-text-muted)",
            borderBottom: "1px solid var(--at-border-light)",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {colName}
        </div>

        <MenuItem
          id="rename"
          icon={<Pencil size={13} />}
          label="Rename column"
          onClick={() => { onRenameStart(); close(); }}
        />
        <MenuItem
          id="edit"
          icon={<Settings2 size={13} />}
          label="Edit column"
          onClick={() => { onEditColumn(); close(); }}
        />
        <MenuItem
          id="insertLeft"
          icon={<ArrowLeft size={13} />}
          label="Insert column left"
          arrow
          submenuKey="insertLeft"
        />
        <MenuItem
          id="insertRight"
          icon={<ArrowRight size={13} />}
          label="Insert column right"
          arrow
          submenuKey="insertRight"
        />

        <Divider />

        <MenuItem
          id="desc"
          icon={<Info size={13} />}
          label="Edit description"
          onClick={() => setDescModal(true)}
        />
        <MenuItem
          id="color"
          icon={<Palette size={13} />}
          label="Change color"
          arrow
          submenuKey="changeColor"
        />
        <MenuItem
          id="type"
          icon={<Type size={13} />}
          label={typeLabel}
          arrow
          submenuKey="columnType"
        />

        <Divider />

        <MenuItem
          id="usedIn"
          icon={<Link2 size={13} />}
          label="Used in..."
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
          id="duplicate"
          icon={<Copy size={13} />}
          label="Duplicate"
          onClick={() => act(() => duplicateColumn(sheets, activeSheetIdx, colIdx))}
        />
        <MenuItem
          id="saveFunc"
          icon={<Layers size={13} />}
          label="Save as function"
          onClick={() => { toast?.("info", "Coming soon", "Save as function is not yet available."); close(); }}
        />
        <MenuItem
          id="textToCol"
          icon={<Scissors size={13} />}
          label="Text to columns"
          onClick={() => setT2cModal(true)}
        />
        <MenuItem
          id="sortAZ"
          icon={<ArrowUp size={13} />}
          label="Sort A → Z"
          onClick={() => act(() => sortByColumn(sheets, activeSheetIdx, colIdx, "asc"))}
        />
        <MenuItem
          id="sortZA"
          icon={<ArrowDown size={13} />}
          label="Sort Z → A"
          onClick={() => act(() => sortByColumn(sheets, activeSheetIdx, colIdx, "desc"))}
        />

        <Divider />

        <MenuItem
          id="dedupe"
          icon={<ShuffleIcon size={13} />}
          label="Dedupe"
          onClick={() => act(() => dedupeByColumn(sheets, activeSheetIdx, colIdx))}
        />
        <MenuItem
          id="filter"
          icon={<ListFilter size={13} />}
          label="Filter on this column"
          onClick={() => { onFilterColumn?.(); close(); }}
        />

        <Divider />

        <MenuItem
          id="pin"
          icon={<Pin size={13} />}
          label={colMeta.pinned ? "Unpin column" : "Pin column"}
          onClick={() =>
            act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { pinned: !colMeta.pinned }))
          }
        />
        <MenuItem
          id="hide"
          icon={<EyeOff size={13} />}
          label="Hide"
          onClick={() =>
            act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { hidden: true }))
          }
        />
        <MenuItem
          id="delete"
          icon={<Trash2 size={13} />}
          label="Delete"
          danger
          onClick={() => act(() => deleteColumn(sheets, activeSheetIdx, colIdx))}
        />
      </div>

      {/* Submenus */}
      {showSubmenu && activeSubmenu?.key === "insertLeft" && (
        <div
          onMouseEnter={() => setOnSubmenuPanel(true)}
          onMouseLeave={() => { setOnSubmenuPanel(false); setActiveSubmenu(null); }}
        >
          <InsertSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            direction="left"
            onInsert={(count) =>
              act(() => insertColumns(sheets, activeSheetIdx, colIdx, count, false))
            }
          />
        </div>
      )}
      {showSubmenu && activeSubmenu?.key === "insertRight" && (
        <div
          onMouseEnter={() => setOnSubmenuPanel(true)}
          onMouseLeave={() => { setOnSubmenuPanel(false); setActiveSubmenu(null); }}
        >
          <InsertSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            direction="right"
            onInsert={(count) =>
              act(() => insertColumns(sheets, activeSheetIdx, colIdx, count, true))
            }
          />
        </div>
      )}
      {showSubmenu && activeSubmenu?.key === "changeColor" && (
        <div
          onMouseEnter={() => setOnSubmenuPanel(true)}
          onMouseLeave={() => { setOnSubmenuPanel(false); setActiveSubmenu(null); }}
        >
          <ColorSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            currentColor={colMeta.color}
            onSelect={(color) =>
              act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { color }))
            }
          />
        </div>
      )}
      {showSubmenu && activeSubmenu?.key === "columnType" && (
        <div
          onMouseEnter={() => setOnSubmenuPanel(true)}
          onMouseLeave={() => { setOnSubmenuPanel(false); setActiveSubmenu(null); }}
        >
          <TypeSubmenu
            x={submenuX}
            y={activeSubmenu.anchorY}
            currentType={colMeta.type as ColumnType | undefined}
            onSelect={(type) =>
              act(() => updateColMeta(sheets, activeSheetIdx, colIdx, { type }))
            }
          />
        </div>
      )}

      {/* Text to columns modal */}
      {t2cModal && (
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
            <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700 }}>
              Text to columns
            </h3>
            <label
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--at-text-muted)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Delimiter
            </label>
            <input
              autoFocus
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              placeholder='e.g.  ,  or  ;  or  |'
              style={{
                width: "100%",
                padding: "7px 10px",
                border: "1px solid var(--at-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "var(--at-text-soft)",
                margin: "6px 0 16px",
              }}
            >
              Splits cell values by this character and fills adjacent columns.
            </p>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
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
                Split
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
            background: "rgba(0,0,0,0.3)",
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
            <h3 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700 }}>
              Column description
            </h3>
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
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "14px" }}>
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
