"use client";

import React, { useState } from "react";
import { RightSidebar } from "@/components/RightSidebar";
import { CreateSheet } from "@/components/steps/CreateSheet";
import { HideTabs } from "@/components/steps/HideTabs";
import { ShareSheet } from "@/components/steps/ShareSheet";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { useSheetsApi, CreatedSheet } from "@/hooks/useSheetsApi";
import {
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  ChevronRight,
  Eye,
  Share2,
  Plus,
  Table,
} from "lucide-react";

type Step = 1 | 2 | 3;

const STEPS = [
  { id: 1 as Step, label: "Create Sheet",  icon: Table,         sidebarTitle: "New Sheet Setup" },
  { id: 2 as Step, label: "Tab Visibility", icon: Eye,          sidebarTitle: "Manage Tab Visibility" },
  { id: 3 as Step, label: "Share",          icon: Share2,       sidebarTitle: "Share Your Sheet" },
];

export function SheetManager() {
  const [step, setStep]               = useState<Step>(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createdSheet, setCreatedSheet] = useState<CreatedSheet | null>(null);
  const [sheetName, setSheetName]     = useState("");

  const { toasts, dismiss, toast } = useToast();
  const { isLoading, createSheet, hideTabs, shareSheet } = useSheetsApi();

  const reachedStep = createdSheet
    ? step >= 3 ? 3 : step
    : 1;

  const handleCreated = (sheet: CreatedSheet, name: string) => {
    setCreatedSheet(sheet);
    setSheetName(name);
    setStep(2);
    setSidebarOpen(false);
    setTimeout(() => setSidebarOpen(true), 120);
  };

  const handleTabsHidden = () => {
    setStep(3);
    setSidebarOpen(false);
    setTimeout(() => setSidebarOpen(true), 120);
  };

  const openSidebarForStep = (s: Step) => {
    setStep(s);
    setSidebarOpen(true);
  };

  const currentStepMeta = STEPS.find((s) => s.id === step)!;

  /* ─── Sidebar content per step ───────────────────────────────── */
  const sidebarContent = () => {
    if (step === 1) {
      return (
        <CreateSheet
          onCreated={handleCreated}
          createSheet={createSheet}
          isLoading={isLoading}
          onToast={toast}
        />
      );
    }
    if (step === 2 && createdSheet) {
      return (
        <HideTabs
          tabs={createdSheet.tabs}
          spreadsheetId={createdSheet.spreadsheetId}
          hideTabs={hideTabs}
          isLoading={isLoading}
          onDone={handleTabsHidden}
          onToast={toast}
        />
      );
    }
    if (step === 3 && createdSheet) {
      return (
        <ShareSheet
          spreadsheetId={createdSheet.spreadsheetId}
          shareSheet={shareSheet}
          isLoading={isLoading}
          onToast={toast}
        />
      );
    }
    return null;
  };

  /* ─── Main content per step ──────────────────────────────────── */
  const mainContent = () => {
    /* Step 1 idle — nothing created yet */
    if (!createdSheet) {
      return (
        <div className="at-idle-state">
          <div className="at-idle-icon">
            <FileSpreadsheet size={28} color="var(--at-accent)" strokeWidth={1.5} />
          </div>
          <h2 className="at-idle-title">No sheet yet</h2>
          <p className="at-idle-desc">
            Create a Google Sheet, configure tab visibility, then generate a shareable link — all in three steps.
          </p>
          <button
            className="at-cta-btn"
            onClick={() => openSidebarForStep(1)}
          >
            <Plus size={14} />
            Create your first sheet
          </button>
        </div>
      );
    }

    /* Steps 2 & 3 — sheet exists, show summary */
    return (
      <div style={{ maxWidth: 680, width: "100%" }}>
        {/* Summary cards */}
        <div className="at-summary-grid">
          <div className="at-summary-card">
            <span className="at-summary-card-label">Sheet name</span>
            <span className="at-summary-card-value">{sheetName}</span>
          </div>
          <div className="at-summary-card">
            <span className="at-summary-card-label">Tabs</span>
            <span className="at-summary-card-value">{createdSheet.tabs.length} sheets</span>
          </div>
          <div className="at-summary-card">
            <span className="at-summary-card-label">Status</span>
            <span className="at-summary-card-value" style={{ color: step >= 3 ? "var(--clr-success)" : "var(--at-accent)" }}>
              {step === 2 ? "Configuring visibility" : "Ready to share"}
            </span>
          </div>
        </div>

        {/* Progress steps */}
        <div
          style={{
            background: "var(--at-surface)",
            border: "1px solid var(--at-border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {STEPS.map((s, idx) => {
            const isDone   = s.id < step;
            const isActive = s.id === step;
            const isLocked = s.id > step;
            const Icon = s.icon;

            return (
              <div
                key={s.id}
                onClick={() => {
                  if (!isLocked) openSidebarForStep(s.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  borderBottom: idx < STEPS.length - 1 ? "1px solid var(--at-border-light)" : "none",
                  cursor: isLocked ? "default" : "pointer",
                  background: isActive ? "var(--at-accent-light)" : "transparent",
                  transition: "background 0.15s",
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isLocked && !isActive) e.currentTarget.style.background = "var(--at-tab-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: isDone
                      ? "var(--clr-success-bg)"
                      : isActive
                      ? "var(--at-accent-light)"
                      : "var(--at-bg)",
                    border: `1.5px solid ${
                      isDone
                        ? "var(--clr-success-border)"
                        : isActive
                        ? "#c7dffe"
                        : "var(--at-border)"
                    }`,
                  }}
                >
                  {isDone ? (
                    <CheckCircle2 size={14} color="var(--clr-success)" strokeWidth={2.5} />
                  ) : isActive ? (
                    <Icon size={13} color="var(--at-accent)" strokeWidth={2} />
                  ) : (
                    <Lock size={12} color="var(--at-text-soft)" strokeWidth={2} />
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isLocked ? "var(--at-text-soft)" : isActive ? "var(--at-accent)" : "var(--at-text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.label}
                  </p>
                  {isDone && (
                    <p style={{ fontSize: 11, color: "var(--clr-success)", marginTop: 1, fontWeight: 500 }}>
                      Completed
                    </p>
                  )}
                  {isActive && (
                    <p style={{ fontSize: 11, color: "var(--at-accent)", marginTop: 1, fontWeight: 500 }}>
                      In progress · click to open panel
                    </p>
                  )}
                </div>

                {/* Chevron */}
                {!isLocked && (
                  <ChevronRight size={14} color={isActive ? "var(--at-accent)" : "var(--at-text-soft)"} />
                )}
              </div>
            );
          })}
        </div>

        {/* Open sheet link */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <a
            href={createdSheet.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "var(--at-accent)",
              textDecoration: "none",
              fontWeight: 500,
              padding: "5px 10px",
              borderRadius: 5,
              border: "1px solid #c7dffe",
              background: "var(--at-accent-light)",
              transition: "all 0.14s",
            }}
          >
            <FileSpreadsheet size={12} />
            View in Google Sheets
          </a>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="at-shell">
        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <header className="at-topbar">
          {/* Logo zone */}
          <div className="at-logo-zone">
            <div className="at-logo-icon">
              <FileSpreadsheet size={15} color="#fff" strokeWidth={2} />
            </div>
            <span className="at-logo-name">Sheet Manager</span>
          </div>

          {/* Step tabs */}
          <nav className="at-tabs-zone" aria-label="Steps">
            {STEPS.map((s) => {
              const isDone   = createdSheet ? s.id < step : false;
              const isActive = s.id === step;
              const isLocked = !createdSheet && s.id > 1;
              const Icon     = s.icon;

              return (
                <button
                  key={s.id}
                  className={`at-tab${isActive ? " at-tab--active" : ""}`}
                  onClick={() => {
                    if (!isLocked) openSidebarForStep(s.id);
                  }}
                  disabled={isLocked}
                  title={isLocked ? "Complete the previous step first" : undefined}
                  aria-current={isActive ? "step" : undefined}
                >
                  {/* Badge */}
                  <span
                    className={`at-tab-badge ${
                      isDone
                        ? "at-tab-badge--done"
                        : isActive
                        ? "at-tab-badge--active"
                        : "at-tab-badge--locked"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={10} strokeWidth={3} /> : s.id}
                  </span>
                  <Icon size={13} strokeWidth={1.75} />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Actions zone */}
          <div className="at-actions-zone">
            <button
              className={`at-cta-btn${sidebarOpen ? " at-cta-btn--secondary" : ""}`}
              style={{ width: "auto", fontSize: 12, padding: "5px 12px" }}
              onClick={() => {
                if (sidebarOpen) {
                  setSidebarOpen(false);
                } else {
                  setSidebarOpen(true);
                }
              }}
            >
              {sidebarOpen ? "Close panel" : currentStepMeta.label}
            </button>
          </div>
        </header>

        {/* ── Subbar ──────────────────────────────────────────────── */}
        {createdSheet && (
          <div className="at-subbar">
            <span className="at-subbar-label">Working on</span>
            <div className="at-subbar-divider" />
            <span className="at-subbar-chip">
              <FileSpreadsheet size={10} />
              {sheetName}
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 11,
                color: "var(--at-text-soft)",
                fontWeight: 500,
              }}
            >
              Step {step} of {STEPS.length}
            </span>
          </div>
        )}

        {/* ── Body: Content + Sidebar ──────────────────────────────── */}
        <div className="at-body">
          {/* Main content */}
          <main className="at-content">
            {mainContent()}
          </main>

          {/* Right sidebar */}
          <RightSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            title={currentStepMeta.sidebarTitle}
          >
            {sidebarContent()}
          </RightSidebar>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
