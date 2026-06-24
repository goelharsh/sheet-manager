"use client";

import React, { useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronLeft,
  Sparkles,
  Trash2,
  PlusCircle,
  RotateCcw,
  Type,
  Binary,
  Eye,
  EyeOff,
  X,
  Sliders,
} from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import {
  CellData,
  CellStyle,
  ColumnMetadata,
  ImportedSheet,
  RowMetadata,
  getColLabel,
} from "./SpreadsheetGrid";

interface CellControlPanelProps {
  selectedCell: { row: number; col: number };
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  onSheetsChange: (updatedSheets: ImportedSheet[]) => void;
  onCloseCellPanel: () => void;
}

const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Dark Gray", value: "#1f2937" },
  { name: "Blue", value: "#2563eb" },
  { name: "Teal", value: "#0d9488" },
  { name: "Green", value: "#16a34a" },
  { name: "Red", value: "#dc2626" },
  { name: "Purple", value: "#9333ea" },
  { name: "Orange", value: "#ea580c" },
];

const BG_COLORS = [
  { name: "Default", value: "" },
  { name: "Light Gray", value: "#f3f4f6" },
  { name: "Soft Blue", value: "#dbeafe" },
  { name: "Soft Green", value: "#dcfce7" },
  { name: "Soft Red", value: "#fee2e2" },
  { name: "Soft Yellow", value: "#fef9c3" },
  { name: "Soft Purple", value: "#f3e8ff" },
  { name: "Soft Orange", value: "#ffedd5" },
];

export function CellControlPanel({
  selectedCell,
  sheets,
  activeSheetIdx,
  onSheetsChange,
  onCloseCellPanel,
}: CellControlPanelProps) {
  const currentSheet = sheets[activeSheetIdx];
  const { row, col } = selectedCell;
  const cell: CellData = currentSheet?.data[row]?.[col] || {
    value: "",
    style: {},
  };
  const style: CellStyle = cell.style || {};

  const cellRef = `${getColLabel(col)}${row + 1}`;

  const updateCell = (updatedValue: string, updatedStyle: CellStyle) => {
    const updatedSheets = [...sheets];
    const sheetData = updatedSheets[activeSheetIdx].data.map((r) =>
      r.map((c) => ({ ...c, style: { ...c.style } })),
    );

    if (!sheetData[row]) sheetData[row] = [];
    sheetData[row][col] = {
      value: updatedValue,
      style: updatedStyle,
    };

    updatedSheets[activeSheetIdx] = {
      ...updatedSheets[activeSheetIdx],
      data: sheetData,
    };
    onSheetsChange(updatedSheets);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCell(e.target.value, style);
  };

  const toggleStyle = (key: keyof CellStyle) => {
    const nextStyle = { ...style };
    if (key === "bold" || key === "italic" || key === "underline") {
      nextStyle[key] = !nextStyle[key];
    }
    updateCell(cell.value, nextStyle);
  };

  const setAlign = (align: "left" | "center" | "right") => {
    updateCell(cell.value, { ...style, align });
  };

  const setColor = (color: string) => {
    updateCell(cell.value, { ...style, color });
  };

  const setBg = (bg: string) => {
    updateCell(cell.value, { ...style, bg });
  };

  // Text transformations
  const transformText = (type: "upper" | "lower" | "trim" | "number") => {
    let nextVal = cell.value;
    if (type === "upper") nextVal = cell.value.toUpperCase();
    else if (type === "lower") nextVal = cell.value.toLowerCase();
    else if (type === "trim") nextVal = cell.value.trim();
    else if (type === "number") {
      const num = Number(cell.value.replace(/[^0-9.-]/g, ""));
      nextVal = isNaN(num) ? cell.value : String(num);
    }
    updateCell(nextVal, style);
  };

  // Clear cell data
  const clearCell = () => {
    updateCell("", {});
  };

  // Grid Operations inside control panel
  const addRow = (below: boolean) => {
    const updatedSheets = [...sheets];
    const sheet = { ...updatedSheets[activeSheetIdx] };
    const sheetData = sheet.data.map((r) => r.map((c) => ({ ...c })));
    const targetIdx = below ? row + 1 : row;
    const colCount = sheetData[0]?.length || 4;

    const newRow = Array(colCount)
      .fill(null)
      .map(() => ({ value: "", style: {} }));

    sheetData.splice(targetIdx, 0, newRow);
    sheet.data = sheetData;

    const newRowsMeta = sheet.rows
      ? [...sheet.rows]
      : Array(sheetData.length - 1)
          .fill(null)
          .map(() => ({}));
    newRowsMeta.splice(targetIdx, 0, { hidden: false });
    sheet.rows = newRowsMeta;

    updatedSheets[activeSheetIdx] = sheet;
    onSheetsChange(updatedSheets);
  };

  const addCol = (right: boolean) => {
    const updatedSheets = [...sheets];
    const sheet = { ...updatedSheets[activeSheetIdx] };
    const sheetData = sheet.data.map((r) => r.map((c) => ({ ...c })));
    const targetIdx = right ? col + 1 : col;

    sheetData.forEach((r) => {
      r.splice(targetIdx, 0, { value: "", style: {} });
    });
    sheet.data = sheetData;

    const colCount = sheetData[0]?.length;
    const newColsMeta = sheet.cols
      ? [...sheet.cols]
      : Array(colCount - 1)
          .fill(null)
          .map(() => ({}));
    newColsMeta.splice(targetIdx, 0, { hidden: false });
    sheet.cols = newColsMeta;

    updatedSheets[activeSheetIdx] = sheet;
    onSheetsChange(updatedSheets);
  };

  const toggleRowVisibility = (rowIdx: number) => {
    const updatedSheets = [...sheets];
    const sheet = { ...updatedSheets[activeSheetIdx] };
    const rowCount = sheet.data.length;
    const newRowsMeta: RowMetadata[] = sheet.rows
      ? [...sheet.rows]
      : Array(rowCount)
          .fill(null)
          .map(() => ({}));
    const isHidden = !!newRowsMeta[rowIdx]?.hidden;
    newRowsMeta[rowIdx] = { ...newRowsMeta[rowIdx], hidden: !isHidden };
    sheet.rows = newRowsMeta;
    updatedSheets[activeSheetIdx] = sheet;
    onSheetsChange(updatedSheets);
  };

  const toggleColVisibility = (colIdx: number) => {
    const updatedSheets = [...sheets];
    const sheet = { ...updatedSheets[activeSheetIdx] };
    const colCount = sheet.data[0]?.length || 0;
    const newColsMeta: ColumnMetadata[] = sheet.cols
      ? [...sheet.cols]
      : Array(colCount)
          .fill(null)
          .map(() => ({}));
    const isHidden = !!newColsMeta[colIdx]?.hidden;
    newColsMeta[colIdx] = { ...newColsMeta[colIdx], hidden: !isHidden };
    sheet.cols = newColsMeta;
    updatedSheets[activeSheetIdx] = sheet;
    onSheetsChange(updatedSheets);
  };

  const deleteRow = () => {
    const updatedSheets = [...sheets];
    const sheet = { ...updatedSheets[activeSheetIdx] };
    const sheetData = sheet.data.map((r) => r.map((c) => ({ ...c })));

    if (sheetData.length <= 1) return;

    sheetData.splice(row, 1);
    sheet.data = sheetData;

    const newRowsMeta = sheet.rows
      ? [...sheet.rows]
      : Array(sheetData.length + 1)
          .fill(null)
          .map(() => ({}));
    newRowsMeta.splice(row, 1);
    sheet.rows = newRowsMeta;

    updatedSheets[activeSheetIdx] = sheet;
    onSheetsChange(updatedSheets);
    onCloseCellPanel();
  };

  const deleteCol = () => {
    const updatedSheets = [...sheets];
    const sheet = { ...updatedSheets[activeSheetIdx] };
    const sheetData = sheet.data.map((r) => r.map((c) => ({ ...c })));

    if (sheetData[0]?.length <= 1) return;

    sheetData.forEach((r) => {
      r.splice(col, 1);
    });
    sheet.data = sheetData;

    const colCount = sheetData[0]?.length + 1;
    const newColsMeta = sheet.cols
      ? [...sheet.cols]
      : Array(colCount)
          .fill(null)
          .map(() => ({}));
    newColsMeta.splice(col, 1);
    sheet.cols = newColsMeta;

    updatedSheets[activeSheetIdx] = sheet;
    onSheetsChange(updatedSheets);
    onCloseCellPanel();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Return to wizard tab */}
      <button
        onClick={onCloseCellPanel}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          border: "none",
          background: "transparent",
          color: "var(--at-accent)",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
        }}
      >
        <ChevronLeft size={13} />
        Back to step configuration
      </button>

      {/* Cell Reference Header */}
      <div
        style={{
          borderBottom: "1px solid var(--at-border-light)",
          paddingBottom: "12px",
        }}
      >
        <h3
          style={{ fontSize: "16px", fontWeight: 700, color: "var(--at-text)" }}
        >
          Cell {cellRef} Actions
        </h3>
        <p
          style={{
            fontSize: "12px",
            color: "var(--at-text-soft)",
            marginTop: "2px",
          }}
        >
          Modify cell data, styles, visibility, or structure.
        </p>
      </div>

      {/* Accordion 1: Formatting Settings */}
      <CollapsibleSection title="Formatting Settings" defaultOpen={true}>
        {/* Edit Value */}
        <div>
          <label className="field-label" htmlFor="cell-value-textarea">
            Cell Content
          </label>
          <textarea
            id="cell-value-textarea"
            value={cell.value}
            onChange={handleValueChange}
            placeholder="Empty cell..."
            rows={3}
            style={{
              width: "100%",
              padding: "8px 11px",
              border: "1px solid var(--at-border)",
              borderRadius: "var(--radius-sm)",
              background: "var(--at-surface-2)",
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--at-text)",
              resize: "vertical",
              outline: "none",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--at-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--at-border)")
            }
          />
        </div>

        {/* Text Styles & Alignments */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span className="field-label">Typography & Align</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => toggleStyle("bold")}
              style={{
                flex: 1,
                height: "32px",
                border: `1.5px solid ${style.bold ? "var(--at-accent)" : "var(--at-border)"}`,
                background: style.bold
                  ? "var(--at-accent-light)"
                  : "var(--at-surface)",
                color: style.bold ? "var(--at-accent)" : "var(--at-text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Bold"
            >
              <Bold size={15} />
            </button>
            <button
              onClick={() => toggleStyle("italic")}
              style={{
                flex: 1,
                height: "32px",
                border: `1.5px solid ${style.italic ? "var(--at-accent)" : "var(--at-border)"}`,
                background: style.italic
                  ? "var(--at-accent-light)"
                  : "var(--at-surface)",
                color: style.italic ? "var(--at-accent)" : "var(--at-text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Italic"
            >
              <Italic size={15} />
            </button>
            <button
              onClick={() => toggleStyle("underline")}
              style={{
                flex: 1,
                height: "32px",
                border: `1.5px solid ${style.underline ? "var(--at-accent)" : "var(--at-border)"}`,
                background: style.underline
                  ? "var(--at-accent-light)"
                  : "var(--at-surface)",
                color: style.underline
                  ? "var(--at-accent)"
                  : "var(--at-text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Underline"
            >
              <Underline size={15} />
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setAlign("left")}
              style={{
                flex: 1,
                height: "32px",
                border: `1.5px solid ${style.align === "left" || !style.align ? "var(--at-accent)" : "var(--at-border)"}`,
                background:
                  style.align === "left" || !style.align
                    ? "var(--at-accent-light)"
                    : "var(--at-surface)",
                color:
                  style.align === "left" || !style.align
                    ? "var(--at-accent)"
                    : "var(--at-text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Align Left"
            >
              <AlignLeft size={15} />
            </button>
            <button
              onClick={() => setAlign("center")}
              style={{
                flex: 1,
                height: "32px",
                border: `1.5px solid ${style.align === "center" ? "var(--at-accent)" : "var(--at-border)"}`,
                background:
                  style.align === "center"
                    ? "var(--at-accent-light)"
                    : "var(--at-surface)",
                color:
                  style.align === "center"
                    ? "var(--at-accent)"
                    : "var(--at-text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Align Center"
            >
              <AlignCenter size={15} />
            </button>
            <button
              onClick={() => setAlign("right")}
              style={{
                flex: 1,
                height: "32px",
                border: `1.5px solid ${style.align === "right" ? "var(--at-accent)" : "var(--at-border)"}`,
                background:
                  style.align === "right"
                    ? "var(--at-accent-light)"
                    : "var(--at-surface)",
                color:
                  style.align === "right"
                    ? "var(--at-accent)"
                    : "var(--at-text-muted)",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Align Right"
            >
              <AlignRight size={15} />
            </button>
          </div>
        </div>

        {/* Colors Dropdowns */}
        <Dropdown
          label="Text Color"
          options={TEXT_COLORS.map(tc => ({
            label: tc.name,
            value: tc.value,
            color: tc.value || undefined
          }))}
          selectedValue={style.color || ""}
          onSelect={setColor}
          placeholder="Default Text Color"
        />

        <Dropdown
          label="Background Fill"
          options={BG_COLORS.map(bgCol => ({
            label: bgCol.name,
            value: bgCol.value,
            color: bgCol.value || undefined
          }))}
          selectedValue={style.bg || ""}
          onSelect={setBg}
          placeholder="Default Background Fill"
        />
      </CollapsibleSection>

      {/* Accordion 2: Visibility Settings */}
      <CollapsibleSection title="Visibility Settings" defaultOpen={false}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--at-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hide Operations</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={() => toggleRowVisibility(row)}
              className="tbl-ctrl-btn"
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                justifyContent: "flex-start",
                width: "100%",
              }}
              title={`Hide Row ${row + 1}`}
            >
              <EyeOff size={13} />
              Hide Row {row + 1}
            </button>
            <button
              onClick={() => toggleColVisibility(col)}
              className="tbl-ctrl-btn"
              style={{
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                justifyContent: "flex-start",
                width: "100%",
              }}
              title={`Hide Column ${getColLabel(col)}`}
            >
              <EyeOff size={13} />
              Hide Column {getColLabel(col)}
            </button>
          </div>
        </div>

        {/* Hidden Items Checklist */}
        {(() => {
          const hiddenRows = (currentSheet?.rows || [])
            .map((r, rIdx) => ({ hidden: !!r.hidden, idx: rIdx }))
            .filter((r) => r.hidden);
          const hiddenCols = (currentSheet?.cols || [])
            .map((c, cIdx) => ({ hidden: !!c.hidden, idx: cIdx }))
            .filter((c) => c.hidden);

          if (hiddenRows.length === 0 && hiddenCols.length === 0) return null;

          return (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                borderTop: "1px solid var(--at-border-light)",
                paddingTop: "12px",
                marginTop: "4px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--at-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hidden Items</span>

              {hiddenCols.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--at-text-soft)", fontWeight: 600 }}>Columns:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {hiddenCols.map((c) => (
                      <span
                        key={c.idx}
                        onClick={() => toggleColVisibility(c.idx)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "var(--at-surface-2)",
                          border: "1px solid var(--at-border)",
                          color: "var(--at-text-soft)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Click to unhide column"
                      >
                        Col {getColLabel(c.idx)} <span style={{ color: "#ef4444", fontSize: "9px" }}>✕</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hiddenRows.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--at-text-soft)", fontWeight: 600 }}>Rows:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {hiddenRows.map((r) => (
                      <span
                        key={r.idx}
                        onClick={() => toggleRowVisibility(r.idx)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "var(--at-surface-2)",
                          border: "1px solid var(--at-border)",
                          color: "var(--at-text-soft)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Click to unhide row"
                      >
                        Row {r.idx + 1} <span style={{ color: "#ef4444", fontSize: "9px" }}>✕</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </CollapsibleSection>

      {/* Accordion 3: Structure & Actions */}
      <CollapsibleSection title="Structure & Actions" defaultOpen={false}>
        {/* Text Operations */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--at-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Text Operations</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <button
              onClick={() => transformText("upper")}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <Type size={12} />
              UPPER
            </button>
            <button
              onClick={() => transformText("lower")}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <Type size={12} />
              lower
            </button>
            <button
              onClick={() => transformText("trim")}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <Sparkles size={12} />
              Trim
            </button>
            <button
              onClick={() => transformText("number")}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <Binary size={12} />
              Parse
            </button>
          </div>
        </div>

        {/* Grid Structure */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--at-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grid Structure</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <button
              onClick={() => addRow(false)}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <PlusCircle size={12} />
              Row Above
            </button>
            <button
              onClick={() => addRow(true)}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <PlusCircle size={12} />
              Row Below
            </button>
            <button
              onClick={() => addCol(false)}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <PlusCircle size={12} />
              Col Left
            </button>
            <button
              onClick={() => addCol(true)}
              className="tbl-ctrl-btn"
              style={{
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                justifyContent: "center",
              }}
            >
              <PlusCircle size={12} />
              Col Right
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div
          style={{
            borderTop: "1px solid var(--at-border-light)",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Danger Zone</span>
          <button
            onClick={deleteRow}
            className="tbl-ctrl-btn"
            style={{
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              justifyContent: "flex-start",
              color: "#b91c1c",
              width: "100%",
            }}
          >
            <Trash2 size={13} />
            Delete Row {row + 1}
          </button>
          <button
            onClick={deleteCol}
            className="tbl-ctrl-btn"
            style={{
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              justifyContent: "flex-start",
              color: "#b91c1c",
              width: "100%",
            }}
          >
            <Trash2 size={13} />
            Delete Column {getColLabel(col)}
          </button>
          <button
            onClick={() => {
              if (confirm("Are you sure you want to clear this cell's content and styling?")) {
                clearCell();
              }
            }}
            className="btn-secondary"
            style={{
              borderColor: "#fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              padding: "8px 12px",
              width: "100%",
              marginTop: "4px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fef2f2")}
          >
            <RotateCcw size={12} />
            Clear Content & Styles
          </button>
        </div>
      </CollapsibleSection>
    </div>
  );
}
