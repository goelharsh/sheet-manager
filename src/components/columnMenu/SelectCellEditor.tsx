"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { getPillColor } from "./TypedCellRenderer";

interface SelectCellEditorProps {
  type: "select" | "multi-select";
  value: string;
  position: { x: number; y: number };
  existingValues: string[];
  onCommit: (value: string) => void;
  onClose: () => void;
}

const PANEL_W = 224;

export function SelectCellEditor({
  type,
  value,
  position,
  existingValues,
  onCommit,
  onClose,
}: SelectCellEditorProps) {
  const isMulti = type === "multi-select";
  const initial = value.split(",").map((v) => v.trim()).filter(Boolean);
  const [selected, setSelected] = useState<string[]>(isMulti ? initial : initial.slice(0, 1));
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const menuX = Math.min(position.x, window.innerWidth - PANEL_W - 8);
  const menuY = Math.min(position.y + 2, window.innerHeight - 340);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commit = (vals: string[]) => {
    onCommit(vals.join(", "));
  };

  const toggle = (val: string) => {
    if (!isMulti) {
      commit([val]);
      return;
    }
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const removeSelected = (val: string) =>
    setSelected((prev) => prev.filter((v) => v !== val));

  const addNew = () => {
    const val = search.trim();
    if (!val) return;
    if (!isMulti) {
      commit([val]);
      return;
    }
    if (!selected.includes(val)) {
      setSelected((prev) => [...prev, val]);
    }
    setSearch("");
  };

  const filtered = existingValues.filter(
    (v) =>
      v.toLowerCase().includes(search.toLowerCase()) &&
      (isMulti || !selected.includes(v))
  );
  const canCreate = search.trim() !== "" && !existingValues.map((v) => v.toLowerCase()).includes(search.trim().toLowerCase());

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 1099 }}
        onClick={() => (isMulti ? commit(selected) : onClose())}
      />
      <div
        style={{
          position: "fixed",
          left: menuX,
          top: menuY,
          width: PANEL_W,
          background: "var(--at-surface)",
          border: "1px solid var(--at-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
          zIndex: 1100,
          overflow: "hidden",
          animation: "fadeIn 0.1s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Selected chips (multi only) */}
        {isMulti && selected.length > 0 && (
          <div
            style={{
              padding: "7px 10px 5px",
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              borderBottom: "1px solid var(--at-border-light)",
            }}
          >
            {selected.map((val) => {
              const { bg, color } = getPillColor(val);
              return (
                <span
                  key={val}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 6px",
                    background: bg,
                    color,
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  {val}
                  <button
                    type="button"
                    onClick={() => removeSelected(val)}
                    style={{ background: "none", border: "none", cursor: "pointer", color, padding: 0, display: "flex", alignItems: "center" }}
                  >
                    <X size={9} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Search input */}
        <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--at-border-light)", display: "flex", alignItems: "center" }}>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNew();
            }}
            placeholder={isMulti ? "Search or create options…" : "Search or create…"}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "12.5px",
              background: "transparent",
              color: "var(--at-text)",
              minWidth: 0,
            }}
          />
        </div>

        {/* Options list */}
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          {canCreate && (
            <button
              type="button"
              onClick={addNew}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                textAlign: "left",
                fontSize: "12px",
                cursor: "pointer",
                color: "var(--at-accent)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--at-tab-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: "13px", fontWeight: 700 }}>+</span>
              Create &quot;{search.trim()}&quot;
            </button>
          )}

          {filtered.map((val) => {
            const { bg, color } = getPillColor(val);
            const isChosen = selected.includes(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => toggle(val)}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--at-tab-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {isMulti && (
                  <span
                    style={{
                      width: "14px",
                      height: "14px",
                      border: `1.5px solid ${isChosen ? "var(--at-accent)" : "var(--at-border)"}`,
                      borderRadius: "3px",
                      background: isChosen ? "var(--at-accent)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "background 0.12s, border-color 0.12s",
                    }}
                  >
                    {isChosen && <Check size={9} color="#fff" />}
                  </span>
                )}
                <span
                  style={{
                    padding: "1px 7px",
                    background: bg,
                    color,
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 500,
                  }}
                >
                  {val}
                </span>
              </button>
            );
          })}

          {!filtered.length && !canCreate && (
            <div
              style={{
                padding: "14px 12px",
                fontSize: "12px",
                color: "var(--at-text-muted)",
                textAlign: "center",
              }}
            >
              {existingValues.length === 0
                ? "Type above to create your first option"
                : "No options match"}
            </div>
          )}
        </div>

        {/* Done footer for multi-select */}
        {isMulti && (
          <div
            style={{
              padding: "8px 10px",
              borderTop: "1px solid var(--at-border-light)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "5px 12px",
                border: "1px solid var(--at-border)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                color: "var(--at-text-soft)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => commit(selected)}
              style={{
                padding: "5px 14px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: "var(--at-accent)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
