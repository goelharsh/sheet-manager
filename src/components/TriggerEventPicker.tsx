"use client";

import React, { useState } from "react";
import {
  Table,
  RefreshCw,
  Target,
  Trash2,
  Globe,
  Clock,
  ChevronLeft,
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  Copy,
  CheckCircle2,
  Zap,
  X,
} from "lucide-react";
import { getColLabel, ImportedSheet } from "./SpreadsheetGrid";
import { Trigger } from "./TriggersConsole";
import { useTriggerForm } from "@/components/hooks/useTriggerForm";

interface TriggerEventPickerProps {
  sheets: ImportedSheet[];
  activeSheetIdx: number;
  triggers: Trigger[];
  onAddTrigger: (trigger: Omit<Trigger, "id"> & { id?: string }) => void;
  onToggleTrigger: (id: string) => void;
  onDeleteTrigger: (id: string) => void;
}

type EventKey =
  | "rows_created"
  | "rows_updated"
  | "specific_field_updated"
  | "rows_deleted"
  | "http_trigger"
  | "periodic_trigger";

interface EventDef {
  key: EventKey;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
  type: Trigger["type"];
}

const EVENT_DEFS: EventDef[] = [
  {
    key: "rows_created",
    icon: Table,
    title: "Rows are created",
    description: "Triggered when new rows are added to this sheet.",
    type: "row_added",
  },
  {
    key: "rows_updated",
    icon: RefreshCw,
    title: "Rows are updated",
    description: "Triggered when any field in a row is updated.",
    type: "cell_changed",
  },
  {
    key: "specific_field_updated",
    icon: Target,
    title: "Specific field values are updated",
    description: "Triggered when a chosen column's value changes.",
    type: "cell_changed",
  },
  {
    key: "rows_deleted",
    icon: Trash2,
    title: "Rows are deleted",
    description: "Triggered when rows are removed from this sheet.",
    type: "rows_deleted",
  },
  {
    key: "http_trigger",
    icon: Globe,
    title: "HTTP trigger",
    description: "Receive HTTP requests to trigger this workbook's automations.",
    type: "http_trigger",
  },
  {
    key: "periodic_trigger",
    icon: Clock,
    title: "Periodic trigger",
    description: "Runs automatically on a fixed time interval.",
    type: "periodic_trigger",
  },
];

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `trigger-${crypto.randomUUID()}`;
  }
  return `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whk_";
  for (let i = 0; i < 28; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function templateHint(key: EventKey): string {
  if (key === "http_trigger") return "Templates: {{row}}, {{timestamp}}, {{body.<field>}}";
  if (key === "rows_updated" || key === "specific_field_updated") {
    return "Templates: {{row}}, {{timestamp}}, {{prev}}, {{value}}";
  }
  return "Templates: {{row}}, {{timestamp}}";
}

export function TriggerEventPicker({
  sheets,
  activeSheetIdx,
  triggers,
  onAddTrigger,
  onToggleTrigger,
  onDeleteTrigger,
}: TriggerEventPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<"picker" | "config" | "created">("picker");
  const [selectedEvent, setSelectedEvent] = useState<EventDef | null>(null);
  const [createdTrigger, setCreatedTrigger] = useState<Trigger | null>(null);
  const [origin, setOrigin] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const currentSheet = sheets[activeSheetIdx];
  const colCount = currentSheet?.data[0]?.length || 4;

  const form = useTriggerForm({ initialSheetName: currentSheet?.name || "All" });

  const scopedTriggers = triggers.filter(
    (t) => t.sheetName === "All" || t.sheetName === currentSheet?.name,
  );

  const openPicker = () => {
    setSelectedEvent(null);
    setCreatedTrigger(null);
    setView("picker");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setView("picker");
    setSelectedEvent(null);
    setCreatedTrigger(null);
  };

  const selectEvent = (def: EventDef) => {
    setSelectedEvent(def);
    form.setTriggerName("");
    form.setActionValue("");
    form.setEventType(def.type);
    form.setSheetName(def.key === "http_trigger" ? currentSheet?.name || "" : "All");
    form.setTargetColumn(def.key === "specific_field_updated" ? 0 : -1);
    form.setActionType("log_only");
    form.setActionColumn(0);
    form.setActionRow(0);
    form.setIntervalMinutes(15);
    setView("config");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (selectedEvent.key === "http_trigger") {
      const id = generateId();
      const secretKey = generateSecret();
      const payload = form.buildPayload(id);
      if (!payload) return;
      const finalPayload = { ...payload, secretKey };
      onAddTrigger(finalPayload);
      setCreatedTrigger({ ...finalPayload, id } as Trigger);
      setView("created");
      return;
    }

    const payload = form.buildPayload();
    if (!payload) return;
    onAddTrigger(payload);
    closeModal();
  };

  const copy = (text: string, which: "url" | "secret") => {
    navigator.clipboard.writeText(text);
    if (which === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const showActionFields = !!selectedEvent && selectedEvent.key !== "rows_deleted";
  const isFixedCellEvent =
    selectedEvent?.key === "http_trigger" || selectedEvent?.key === "periodic_trigger";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* ── Scoped trigger list (always visible in the accordion) ───────── */}
      {scopedTriggers.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--at-border)",
            borderRadius: "var(--radius-sm)",
            padding: "16px",
            textAlign: "center",
            color: "var(--at-text-muted)",
            fontSize: "12px",
          }}
        >
          No triggers configured for this sheet yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {scopedTriggers.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "8px 10px",
                border: "1px solid var(--at-border-light)",
                borderRadius: "var(--radius-sm)",
                background: t.isActive ? "var(--at-surface)" : "var(--at-surface-2)",
                opacity: t.isActive ? 1 : 0.6,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "var(--at-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontSize: "11px", color: "var(--at-text-muted)" }}>
                  {t.type.replace(/_/g, " ")} &middot; {t.sheetName}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => onToggleTrigger(t.id)}
                  title={t.isActive ? "Deactivate" : "Activate"}
                  style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
                >
                  {t.isActive ? (
                    <ToggleRight size={20} color="var(--clr-success)" />
                  ) : (
                    <ToggleLeft size={20} color="var(--at-text-soft)" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTrigger(t.id)}
                  title="Delete trigger"
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#b91c1c", display: "flex" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={openPicker} className="btn-secondary" style={{ width: "100%" }}>
        <PlusCircle size={14} />
        Add Trigger
      </button>

      {/* ── Popup: Choose an event / configure / created ─────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(17, 24, 39, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "var(--at-surface)",
              width: "380px",
              maxWidth: "90%",
              maxHeight: "85vh",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--at-border)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "14px 16px",
                borderBottom: "1px solid var(--at-border-light)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                {view === "config" && (
                  <button
                    type="button"
                    onClick={() => setView("picker")}
                    title="Back"
                    style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: "var(--at-text-muted)" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {view === "config" && selectedEvent && (
                  <selectedEvent.icon size={16} color="var(--at-accent)" />
                )}
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--at-text)",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {view === "picker" && "Choose an event..."}
                  {view === "config" && selectedEvent?.title}
                  {view === "created" && "Trigger created"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                title="Close"
                style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", color: "var(--at-text-muted)", flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Picker step */}
              {view === "picker" &&
                EVENT_DEFS.map((def) => {
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => selectEvent(def)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        width: "100%",
                        padding: "10px",
                        border: "1px solid var(--at-border-light)",
                        borderRadius: "var(--radius-sm)",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background-color 0.12s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--at-tab-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <Icon size={16} color="var(--at-accent)" />
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--at-text)" }}>
                          {def.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--at-text-muted)", marginTop: "2px" }}>
                          {def.description}
                        </div>
                      </div>
                    </button>
                  );
                })}

              {/* Config step */}
              {view === "config" && selectedEvent && (
                <form
                  id="trigger-config-form"
                  onSubmit={handleCreate}
                  style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
                  <div>
                    <label className="field-label">Trigger Name</label>
                    <input
                      type="text"
                      className="field-input"
                      placeholder="e.g. Notify on new order"
                      value={form.triggerName}
                      onChange={(e) => form.setTriggerName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="field-label">Target Sheet</label>
                    <select
                      className="field-select"
                      value={form.sheetName}
                      onChange={(e) => form.setSheetName(e.target.value)}
                    >
                      {selectedEvent.key !== "http_trigger" && <option value="All">All Sheets</option>}
                      {sheets.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedEvent.key === "specific_field_updated" && (
                    <div>
                      <label className="field-label">Trigger on column</label>
                      <select
                        className="field-select"
                        value={form.targetColumn}
                        onChange={(e) => form.setTargetColumn(Number(e.target.value))}
                      >
                        {Array.from({ length: colCount }).map((_, idx) => (
                          <option key={idx} value={idx}>
                            Column {getColLabel(idx)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedEvent.key === "periodic_trigger" && (
                    <div>
                      <label className="field-label">Run every (minutes)</label>
                      <input
                        type="number"
                        min={1}
                        className="field-input"
                        value={form.intervalMinutes}
                        onChange={(e) => form.setIntervalMinutes(Math.max(1, Number(e.target.value)))}
                        required
                      />
                      <span style={{ fontSize: "10.5px", color: "var(--at-text-soft)" }}>
                        Fires only while this app is open in a browser tab (no server cron).
                      </span>
                    </div>
                  )}

                  {showActionFields && (
                    <div>
                      <label className="field-label">Action</label>
                      <select
                        className="field-select"
                        value={form.actionType}
                        onChange={(e) => form.setActionType(e.target.value as "auto_fill" | "log_only")}
                      >
                        <option value="log_only">Write description to Change Log only</option>
                        <option value="auto_fill">Auto-fill a cell</option>
                      </select>
                    </div>
                  )}

                  {showActionFields && form.actionType === "auto_fill" && (
                    <>
                      {isFixedCellEvent && (
                        <div>
                          <label className="field-label">Target Row</label>
                          <input
                            type="number"
                            min={1}
                            className="field-input"
                            value={form.actionRow + 1}
                            onChange={(e) => form.setActionRow(Math.max(0, Number(e.target.value) - 1))}
                            required
                          />
                        </div>
                      )}
                      <div>
                        <label className="field-label">Target Column</label>
                        <select
                          className="field-select"
                          value={form.actionColumn}
                          onChange={(e) => form.setActionColumn(Number(e.target.value))}
                        >
                          {Array.from({ length: colCount }).map((_, idx) => (
                            <option key={idx} value={idx}>
                              Column {getColLabel(idx)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Value / Template</label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="e.g. {{timestamp}}"
                          value={form.actionValue}
                          onChange={(e) => form.setActionValue(e.target.value)}
                          required
                        />
                        <span style={{ fontSize: "10.5px", color: "var(--at-text-soft)" }}>
                          {templateHint(selectedEvent.key)}
                        </span>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* Created step */}
              {view === "created" && createdTrigger && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--clr-success)" }}>
                    <CheckCircle2 size={16} />
                    <strong style={{ fontSize: "13px" }}>Trigger "{createdTrigger.name}" created!</strong>
                  </div>

                  {createdTrigger.type === "http_trigger" && (
                    <>
                      <div>
                        <label className="field-label">Inbound URL (POST)</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            readOnly
                            className="field-input"
                            value={`${origin}/api/triggers/http/${createdTrigger.id}`}
                            style={{ fontFamily: "monospace", fontSize: "11px" }}
                          />
                          <button
                            type="button"
                            className="tbl-ctrl-btn"
                            onClick={() => copy(`${origin}/api/triggers/http/${createdTrigger.id}`, "url")}
                          >
                            {copiedUrl ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Secret Key</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            readOnly
                            className="field-input"
                            value={createdTrigger.secretKey || ""}
                            style={{ fontFamily: "monospace", fontSize: "11px" }}
                          />
                          <button
                            type="button"
                            className="tbl-ctrl-btn"
                            onClick={() => copy(createdTrigger.secretKey || "", "secret")}
                          >
                            {copiedSecret ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                        <span style={{ fontSize: "10.5px", color: "var(--at-text-soft)" }}>
                          Pass this as <code>Authorization: Bearer {"<secret>"}</code> or <code>?key=</code>.
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {view === "config" && (
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--at-border-light)",
                  background: "var(--at-surface-2)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
                <button type="button" onClick={closeModal} className="btn-secondary" style={{ padding: "6px 14px", fontSize: "12px", width: "auto" }}>
                  Cancel
                </button>
                <button type="submit" form="trigger-config-form" className="btn-primary" style={{ padding: "6px 14px", fontSize: "12px", width: "auto" }}>
                  <Zap size={13} />
                  Create Trigger
                </button>
              </div>
            )}

            {view === "created" && (
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--at-border-light)",
                  background: "var(--at-surface-2)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button type="button" className="btn-primary" style={{ padding: "6px 14px", fontSize: "12px", width: "auto" }} onClick={closeModal}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
