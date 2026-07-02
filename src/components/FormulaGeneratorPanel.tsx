"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  Zap,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ImportedSheet, getColLabel, ColumnMetadata } from "./SpreadsheetGrid";
import { ToastType } from "./ui/Toast";

// ── Formula evaluation ────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function evalFormula(formula: string, rowData: Record<string, string>): string {
  let expr = formula;
  for (const [col, val] of Object.entries(rowData)) {
    expr = expr.replace(
      new RegExp(`\\{\\{${escapeRegex(col)}\\}\\}`, "g"),
      JSON.stringify(val)
    );
  }
  // Replace any remaining unreplaced {{...}} with empty string
  expr = expr.replace(/\{\{[^}]*\}\}/g, '""');

  try {
    const result = new Function('"use strict"; return (' + expr + ");")();
    return result == null ? "" : String(result);
  } catch {
    try {
      const result = new Function('"use strict"; ' + expr)();
      return result == null ? "" : String(result);
    } catch {
      return "#ERR";
    }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FormulaGeneratorPanelProps {
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  onSheetsChange: (sheets: ImportedSheet[]) => void;
  onClose: () => void;
  toast?: (type: ToastType, title: string, description?: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FormulaGeneratorPanel({
  sheets,
  activeSheetIdx,
  onSheetsChange,
  onClose,
  toast,
}: FormulaGeneratorPanelProps) {
  const [instruction, setInstruction] = useState("");
  const [formula, setFormula] = useState("");
  const [outputName, setOutputName] = useState("Formula Result");
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error" | "applied">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [formulaOpen, setFormulaOpen] = useState(true);
  const [refsOpen, setRefsOpen] = useState(true);
  const [showColPicker, setShowColPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const slashPosRef = useRef(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  const sheet = sheets[activeSheetIdx];

  // Column names: prefer explicit name → header cell value → column label
  const columnNames = useMemo(() => {
    if (!sheet) return [];
    const colCount = sheet.data[0]?.length ?? 0;
    return Array.from({ length: colCount }, (_, i) => {
      const meta = sheet.cols?.[i];
      const headerVal = sheet.data[0]?.[i]?.value ?? "";
      return (meta?.name || headerVal || getColLabel(i)).trim();
    }).filter(Boolean);
  }, [sheet]);

  // {{...}} tokens found in instruction + formula
  const referencedCols = useMemo(() => {
    const tokens = new Set<string>();
    const re = /\{\{([^}]+)\}\}/g;
    let m: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(instruction)) !== null) tokens.add(m[1].trim());
    re.lastIndex = 0;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(formula)) !== null) tokens.add(m[1].trim());
    return Array.from(tokens);
  }, [instruction, formula]);

  // Live preview: formula evaluated on first 3 data rows
  const previewRows = useMemo(() => {
    if (!formula.trim() || !sheet) return [];
    const count = Math.min(3, sheet.data.length - 1);
    return Array.from({ length: Math.max(0, count) }, (_, i) => {
      const rowIdx = i + 1;
      const rowData: Record<string, string> = {};
      columnNames.forEach((name, ci) => {
        rowData[name] = sheet.data[rowIdx]?.[ci]?.value ?? "";
      });
      return { rowIdx, output: evalFormula(formula, rowData) };
    });
  }, [formula, sheet, columnNames]);

  // Focus picker search when it opens
  useEffect(() => {
    if (showColPicker) {
      setPickerSearch("");
      const t = setTimeout(() => pickerSearchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [showColPicker]);

  const filteredCols = useMemo(
    () => columnNames.filter((n) => n.toLowerCase().includes(pickerSearch.toLowerCase())),
    [columnNames, pickerSearch]
  );

  // ── Instruction textarea ────────────────────────────────────────────────────

  const handleInstructionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = e.target.value;
      const cursor = e.target.selectionStart ?? newVal.length;
      // Detect freshly typed '/'
      if (newVal.length === instruction.length + 1 && newVal[cursor - 1] === "/") {
        slashPosRef.current = cursor - 1;
        setShowColPicker(true);
      }
      setInstruction(newVal);
    },
    [instruction]
  );

  const insertColumnRef = useCallback(
    (colName: string) => {
      const slashPos = slashPosRef.current;
      const before = slashPos >= 0 ? instruction.slice(0, slashPos) : instruction;
      const after = slashPos >= 0 ? instruction.slice(slashPos + 1) : "";
      const token = `{{${colName}}}`;
      setInstruction(before + token + after);
      setShowColPicker(false);
      slashPosRef.current = -1;
      const newCursor = (slashPos >= 0 ? slashPos : instruction.length) + token.length;
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(newCursor, newCursor);
        }
      }, 0);
    },
    [instruction]
  );

  // ── AI generation ───────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!instruction.trim()) return;
    setStatus("generating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/formula/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, columns: columnNames }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      setFormula(data.formula);
      setFormulaOpen(true);
      setRefsOpen(true);
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate formula.");
      setStatus("error");
    }
  }, [instruction, columnNames]);

  // ── Apply formula ───────────────────────────────────────────────────────────

  const handleApply = useCallback(() => {
    if (!formula.trim() || !sheet) return;

    const colName = outputName.trim() || "Formula Result";
    const allValues: string[] = [];

    for (let r = 0; r < sheet.data.length; r++) {
      if (r === 0) {
        allValues.push(colName);
        continue;
      }
      const rowData: Record<string, string> = {};
      columnNames.forEach((name, ci) => {
        rowData[name] = sheet.data[r]?.[ci]?.value ?? "";
      });
      allValues.push(evalFormula(formula, rowData));
    }

    const updatedSheets = [...sheets];
    const updatedSheet = { ...updatedSheets[activeSheetIdx] };

    updatedSheet.data = updatedSheet.data.map((row, ri) => [
      ...row.map((c) => ({ ...c })),
      { value: allValues[ri] ?? "", style: {} },
    ]);

    const newColCount = updatedSheet.data[0].length;
    const existingCols: ColumnMetadata[] = updatedSheet.cols
      ? [...updatedSheet.cols.map((c) => ({ ...c }))]
      : Array.from({ length: newColCount - 1 }, () => ({} as ColumnMetadata));

    while (existingCols.length < newColCount - 1) existingCols.push({} as ColumnMetadata);
    existingCols.push({ name: colName, type: "text" });

    updatedSheet.cols = existingCols;
    updatedSheets[activeSheetIdx] = updatedSheet;
    onSheetsChange(updatedSheets);

    setStatus("applied");
    toast?.("success", "Column added!", `"${colName}" column was created from your formula.`);
    setTimeout(onClose, 1000);
  }, [formula, outputName, sheet, sheets, activeSheetIdx, columnNames, onSheetsChange, toast, onClose]);

  const colExists = (name: string) => columnNames.includes(name);
  const canGenerate = instruction.trim().length > 0 && status !== "generating";
  const isApplied = (status as string) === "applied";
  const canApply = formula.trim().length > 0 && !isApplied;
  const saveBtnBg = !canApply ? "var(--at-surface-2)" : isApplied ? "#16a34a" : "var(--at-accent)";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* ── Description + Instruction ────────────────────────── */}
      <div>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--at-text)",
            margin: "0 0 5px",
          }}
        >
          What formula would you like to create?
        </h3>
        <p
          style={{
            fontSize: "12px",
            color: "var(--at-text-muted)",
            margin: "0 0 12px",
            lineHeight: 1.55,
          }}
        >
          Describe what you want to calculate or transform. The system will generate a
          formula and apply it to your data.
        </p>

        {/* Textarea wrapper */}
        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={handleInstructionChange}
            onKeyDown={(e) => {
              if (e.key === "Escape" && showColPicker) {
                e.preventDefault();
                setShowColPicker(false);
              }
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder={`E.g., Get the domain name from the column "Email"`}
            rows={5}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--at-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--at-surface-2)",
              fontSize: "13px",
              color: "var(--at-text)",
              fontFamily: "var(--font-body)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.55,
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--at-accent)";
            }}
            onBlur={(e) => {
              if (!showColPicker) e.currentTarget.style.borderColor = "var(--at-border)";
            }}
          />

          {/* Column picker dropdown */}
          {showColPicker && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 50 }}
                onClick={() => setShowColPicker(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: "2px",
                  background: "var(--at-surface)",
                  border: "1px solid var(--at-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
                  zIndex: 100,
                  overflow: "hidden",
                  animation: "fadeIn 0.1s ease-out",
                }}
              >
                {/* Search */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--at-border-light)",
                  }}
                >
                  <Search size={12} color="var(--at-text-muted)" />
                  <input
                    ref={pickerSearchRef}
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setShowColPicker(false);
                      if (e.key === "Enter" && filteredCols.length > 0) {
                        insertColumnRef(filteredCols[0]);
                      }
                    }}
                    placeholder="Search columns…"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "12px",
                      background: "transparent",
                      color: "var(--at-text)",
                    }}
                  />
                </div>

                {/* Column list */}
                <div style={{ maxHeight: "160px", overflowY: "auto", padding: "3px 0" }}>
                  {filteredCols.length === 0 ? (
                    <div
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                        color: "var(--at-text-muted)",
                        textAlign: "center",
                      }}
                    >
                      No columns found
                    </div>
                  ) : (
                    filteredCols.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => insertColumnRef(col)}
                        style={{
                          width: "100%",
                          padding: "7px 12px",
                          border: "none",
                          background: "transparent",
                          textAlign: "left",
                          fontSize: "12.5px",
                          color: "var(--at-text)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--at-tab-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "11px",
                            color: "var(--at-accent)",
                          }}
                        >
                          {"{{"}
                        </span>
                        <span style={{ fontWeight: 500 }}>{col}</span>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "11px",
                            color: "var(--at-accent)",
                          }}
                        >
                          {"}}"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Hint row + Generate button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "8px",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--at-text-muted)", flexShrink: 0 }}>
            Type{" "}
            <kbd
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
              }}
            >
              /
            </kbd>{" "}
            to insert column
          </span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 13px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: canGenerate ? "var(--at-accent)" : "var(--at-surface-2)",
              color: canGenerate ? "#fff" : "var(--at-text-muted)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: canGenerate ? "pointer" : "default",
              transition: "background 0.15s",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {status === "generating" ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <Zap size={12} />
            )}
            {status === "generating" ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Error banner */}
        {status === "error" && errorMsg && (
          <div
            style={{
              marginTop: "10px",
              padding: "9px 12px",
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              color: "#b91c1c",
              display: "flex",
              alignItems: "flex-start",
              gap: "7px",
            }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: "1px" }} />
            {errorMsg}
          </div>
        )}
      </div>

      {/* ── Formula collapsible ───────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--at-border-light)", marginTop: "16px" }}>
        <button
          type="button"
          onClick={() => setFormulaOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--at-text)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Formula
          {formulaOpen ? (
            <ChevronUp size={14} color="var(--at-text-muted)" />
          ) : (
            <ChevronDown size={14} color="var(--at-text-muted)" />
          )}
        </button>

        {formulaOpen && (
          <div style={{ paddingBottom: "14px" }}>
            <input
              type="text"
              value={formula}
              onChange={(e) => {
                setFormula(e.target.value);
                if (status === "applied") setStatus("ready");
              }}
              placeholder={`"Hello " + {{First Name}}`}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--at-border)",
                borderRadius: "var(--radius-sm)",
                background: "#1e1e2e",
                color: "#cdd6f4",
                fontSize: "12.5px",
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--at-accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--at-border)";
              }}
            />

            {/* Live preview rows */}
            {previewRows.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <div
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    color: "var(--at-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: "6px",
                  }}
                >
                  Preview
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    padding: "8px 10px",
                    background: "var(--at-surface-2)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--at-border-light)",
                  }}
                >
                  {previewRows.map(({ rowIdx, output }) => (
                    <div
                      key={rowIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "11.5px",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--at-text-muted)",
                          minWidth: "36px",
                          flexShrink: 0,
                          fontSize: "10.5px",
                        }}
                      >
                        Row {rowIdx}
                      </span>
                      <span style={{ color: "var(--at-border)", fontSize: "10px" }}>→</span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "11.5px",
                          color: output === "#ERR" ? "#b91c1c" : "#16a34a",
                          background: output === "#ERR" ? "#fef2f2" : "#f0fdf4",
                          padding: "1px 7px",
                          borderRadius: "3px",
                          maxWidth: "160px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {output || "(empty)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Referenced columns collapsible ───────────────────── */}
      <div style={{ borderTop: "1px solid var(--at-border-light)" }}>
        <button
          type="button"
          onClick={() => setRefsOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--at-text)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Referenced columns
          {refsOpen ? (
            <ChevronUp size={14} color="var(--at-text-muted)" />
          ) : (
            <ChevronDown size={14} color="var(--at-text-muted)" />
          )}
        </button>

        {refsOpen && (
          <div style={{ paddingBottom: "14px" }}>
            {referencedCols.length === 0 ? (
              <span
                style={{
                  fontSize: "12.5px",
                  color: "var(--at-text-muted)",
                  fontStyle: "italic",
                }}
              >
                No columns referenced yet
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {referencedCols.map((col) => {
                  const exists = colExists(col);
                  return (
                    <span
                      key={col}
                      title={exists ? `Column "${col}" found` : `Column "${col}" not found in sheet`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "2px 9px",
                        background: exists ? "#dbeafe" : "#fee2e2",
                        color: exists ? "#1d4ed8" : "#b91c1c",
                        borderRadius: "9999px",
                        fontSize: "11.5px",
                        fontWeight: 500,
                        gap: "4px",
                      }}
                    >
                      {col}
                      {!exists && (
                        <span style={{ fontSize: "9px", opacity: 0.8 }}>⚠ not found</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Save column footer ────────────────────────────────── */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "16px",
          borderTop: "1px solid var(--at-border-light)",
        }}
      >
        {/* Output column name */}
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{
              display: "block",
              fontSize: "10.5px",
              fontWeight: 700,
              color: "var(--at-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "5px",
            }}
          >
            Output column name
          </label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="Formula Result"
            style={{
              width: "100%",
              padding: "7px 10px",
              border: "1px solid var(--at-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--at-surface-2)",
              fontSize: "12.5px",
              color: "var(--at-text)",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--at-accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--at-border)";
            }}
          />
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          style={{
            width: "100%",
            padding: "9px 14px",
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: saveBtnBg,
            color: !canApply ? "var(--at-text-muted)" : "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: canApply ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "background 0.15s",
          }}
        >
          {isApplied ? (
            <>
              <CheckCircle2 size={14} />
              Column saved!
            </>
          ) : (
            "Save column"
          )}
        </button>
      </div>
    </div>
  );
}
