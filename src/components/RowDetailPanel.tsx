"use client";

import React from "react";
import { Bold, Italic, Underline, ChevronLeft, Hash } from "lucide-react";
import { ImportedSheet, CellStyle, getColLabel } from "./SpreadsheetGrid";

interface RowDetailPanelProps {
  rowIdx: number;
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  onSheetsChange: (sheets: ImportedSheet[]) => void;
  onClose: () => void;
}

export function RowDetailPanel({
  rowIdx,
  sheets,
  activeSheetIdx,
  onSheetsChange,
  onClose,
}: RowDetailPanelProps) {
  const currentSheet = sheets[activeSheetIdx];
  const colCount = currentSheet?.data[0]?.length || 0;
  const rowData = currentSheet?.data[rowIdx] || [];
  const headerData = currentSheet?.data[0] || [];
  const colsMeta = currentSheet?.cols || [];

  const isColHidden = (colIdx: number) => !!colsMeta[colIdx]?.hidden;
  const isHeaderRow = rowIdx === 0;
  const hiddenColCount = colsMeta.filter((c) => c.hidden).length;

  const getFieldLabel = (colIdx: number): string => {
    if (isHeaderRow) return "";
    const headerVal = headerData[colIdx]?.value?.trim();
    return headerVal || "";
  };

  const getCell = (colIdx: number) =>
    rowData[colIdx] || { value: "", style: {} };

  const updateCellValue = (colIdx: number, newValue: string) => {
    const updatedSheets = [...sheets];
    const sheetData = updatedSheets[activeSheetIdx].data.map((r) =>
      r.map((c) => ({ ...c, style: { ...c.style } })),
    );
    if (!sheetData[rowIdx]) sheetData[rowIdx] = [];
    if (!sheetData[rowIdx][colIdx])
      sheetData[rowIdx][colIdx] = { value: "", style: {} };
    sheetData[rowIdx][colIdx] = {
      ...sheetData[rowIdx][colIdx],
      value: newValue,
    };
    updatedSheets[activeSheetIdx] = {
      ...updatedSheets[activeSheetIdx],
      data: sheetData,
    };
    onSheetsChange(updatedSheets);
  };

  const toggleStyle = (colIdx: number, key: "bold" | "italic" | "underline") => {
    const updatedSheets = [...sheets];
    const sheetData = updatedSheets[activeSheetIdx].data.map((r) =>
      r.map((c) => ({ ...c, style: { ...c.style } })),
    );
    if (!sheetData[rowIdx]) sheetData[rowIdx] = [];
    if (!sheetData[rowIdx][colIdx])
      sheetData[rowIdx][colIdx] = { value: "", style: {} };
    const style: CellStyle = { ...(sheetData[rowIdx][colIdx].style || {}) };
    style[key] = !style[key];
    sheetData[rowIdx][colIdx] = { ...sheetData[rowIdx][colIdx], style };
    updatedSheets[activeSheetIdx] = {
      ...updatedSheets[activeSheetIdx],
      data: sheetData,
    };
    onSheetsChange(updatedSheets);
  };

  const visibleColIndices = Array.from({ length: colCount }, (_, i) => i).filter(
    (i) => !isColHidden(i),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Back button */}
      <button
        onClick={onClose}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          border: "none",
          background: "transparent",
          color: "var(--at-accent)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          width: "fit-content",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--at-accent-dark)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--at-accent)")
        }
      >
        <ChevronLeft size={14} />
        Back to step configuration
      </button>

      {/* Row summary header */}
      <div
        style={{
          background: "var(--at-surface-2)",
          border: "1px solid var(--at-border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "var(--at-accent-light)",
            border: "1px solid #c7dffe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Hash size={14} color="var(--at-accent)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--at-text)",
              }}
            >
              Row {rowIdx + 1}
            </span>
            {isHeaderRow && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  background: "var(--at-accent-light)",
                  color: "var(--at-accent)",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  border: "1px solid #c7dffe",
                }}
              >
                Header Row
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              color: "var(--at-text-soft)",
              marginTop: "2px",
            }}
          >
            {visibleColIndices.length} visible field
            {visibleColIndices.length !== 1 ? "s" : ""}
            {hiddenColCount > 0 ? ` · ${hiddenColCount} hidden` : ""}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--at-border-light)" }} />

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {visibleColIndices.map((colIdx) => {
          const cell = getCell(colIdx);
          const style: CellStyle = cell.style || {};
          const letterLabel = getColLabel(colIdx);
          const namedLabel = getFieldLabel(colIdx);

          return (
            <div
              key={colIdx}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              {/* Field label row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                {/* Column identifier */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      background: "var(--at-surface-2)",
                      border: "1px solid var(--at-border)",
                      borderRadius: "3px",
                      padding: "1px 5px",
                      color: "var(--at-accent)",
                      userSelect: "none",
                      flexShrink: 0,
                    }}
                  >
                    {letterLabel}
                  </span>
                  {namedLabel && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--at-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {namedLabel}
                    </span>
                  )}
                </div>

                {/* Compact B / I / U toggles */}
                <div
                  style={{
                    display: "flex",
                    border: "1px solid var(--at-border)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    height: "22px",
                    flexShrink: 0,
                  }}
                >
                  {(
                    [
                      { key: "bold" as const, Icon: Bold, title: "Bold" },
                      { key: "italic" as const, Icon: Italic, title: "Italic" },
                      {
                        key: "underline" as const,
                        Icon: Underline,
                        title: "Underline",
                      },
                    ] as const
                  ).map(({ key, Icon, title }, btnIdx) => (
                    <button
                      key={key}
                      type="button"
                      title={title}
                      onClick={() => toggleStyle(colIdx, key)}
                      style={{
                        width: "22px",
                        height: "22px",
                        border: "none",
                        borderRight:
                          btnIdx < 2
                            ? "1px solid var(--at-border-light)"
                            : "none",
                        background: style[key]
                          ? "var(--at-accent-light)"
                          : "var(--at-surface)",
                        color: style[key]
                          ? "var(--at-accent)"
                          : "var(--at-text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "background 0.1s",
                      }}
                    >
                      <Icon size={10} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable value input */}
              <input
                type="text"
                value={cell.value}
                onChange={(e) => updateCellValue(colIdx, e.target.value)}
                placeholder={`${namedLabel || letterLabel}…`}
                style={{
                  border: "1px solid var(--at-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "7px 10px",
                  fontSize: "13px",
                  background: style.bg || "var(--at-surface)",
                  color: style.color || "var(--at-text)",
                  fontWeight: style.bold ? "bold" : "normal",
                  fontStyle: style.italic ? "italic" : "normal",
                  textDecoration: style.underline ? "underline" : "none",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--at-accent)";
                  e.target.style.boxShadow =
                    "0 0 0 2px var(--at-accent-light)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--at-border)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {visibleColIndices.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "var(--at-text-soft)",
            fontSize: "12px",
          }}
        >
          No visible columns in this sheet.
        </div>
      )}
    </div>
  );
}
