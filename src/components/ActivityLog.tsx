"use client";

/* -----------------------------------------------------------------------
 * ActivityLog.tsx — Displays recent sheet-creation activity from Airtable.
 *
 * Fetches GET /api/log on mount and auto-refreshes every 30 seconds.
 * Shows a graceful "not configured" state if Airtable creds aren't set.
 * ----------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Database,
  EyeOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  sheetName: string;
  spreadsheetId: string;
  shareUrl: string;
  hiddenTabs: string;
  status: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "—";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Stop polling when there's an auth error — no point hammering a failing endpoint
  const [stopPolling, setStopPolling] = useState(false);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/log");
      const data = await res.json();

      // 503 = placeholder / missing credentials
      if (res.status === 503) {
        setNotConfigured(true);
        setStopPolling(true); // no point retrying
        return;
      }

      // 401 / 403 = token exists but is wrong/missing scopes
      // Treat as "not configured" so the setup guide is shown
      if (res.status === 401 || res.status === 403) {
        setNotConfigured(true);
        setStopPolling(true); // stop hammering the API
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Failed to fetch logs");
        return;
      }

      setLogs(data.records ?? []);
      setLastRefreshed(new Date());
    } catch {
      setError("Network error — could not reach the log API.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 30 seconds — stops when there's an auth error
  useEffect(() => {
    if (stopPolling) return;
    const id = setInterval(() => fetchLogs(true), 30_000);
    return () => clearInterval(id);
  }, [fetchLogs, stopPolling]);

  // ── Not configured state ───────────────────────────────────────────────────

  if (notConfigured) {
    return (
      <div className="activity-log-card">
        <div className="activity-log-header">
          <div className="activity-log-title">
            <Database size={16} color="#4355e8" />
            <span>Activity Log</span>
            <span className="activity-log-badge activity-log-badge--powered">
              Powered by Airtable
            </span>
          </div>
        </div>

        <div className="activity-log-setup">
          <div className="activity-log-setup-icon">
            <Database size={24} color="#a5b4fc" />
          </div>
          <p className="activity-log-setup-title">Airtable not configured</p>
          <p className="activity-log-setup-desc">
            Add your <code>AIRTABLE_API_KEY</code> and <code>AIRTABLE_BASE_ID</code> to{" "}
            <code>.env.local</code> to start logging activity.
          </p>
          <div className="activity-log-setup-steps">
            <div className="setup-step">
              <span className="setup-step-num">1</span>
              <span>Go to airtable.com/create/tokens → create a token with scopes: <strong>data.records:read</strong>, <strong>data.records:write</strong>, <strong>schema.bases:read</strong></span>
            </div>
            <div className="setup-step">
              <span className="setup-step-num">2</span>
              <span>Under &quot;Add a base&quot; → select your Sheet Manager base specifically</span>
            </div>
            <div className="setup-step">
              <span className="setup-step-num">3</span>
              <span>Copy the token (starts with <code>pat...</code>) and your Base ID (from the base URL, starts with <code>app...</code>)</span>
            </div>
            <div className="setup-step">
              <span className="setup-step-num">4</span>
              <span>Paste both into .env.local, then restart <code>npm run dev</code></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="activity-log-card">
        <div className="activity-log-header">
          <div className="activity-log-title">
            <Database size={16} color="#4355e8" />
            <span>Activity Log</span>
          </div>
        </div>
        <div className="activity-log-error">
          <XCircle size={20} color="#ef4444" />
          <span>{error}</span>
          <button className="activity-log-refresh-btn" onClick={() => fetchLogs()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="activity-log-card">
      {/* Header */}
      <div className="activity-log-header">
        <div className="activity-log-title">
          <Database size={16} color="#4355e8" />
          <span>Activity Log</span>
          <span className="activity-log-badge activity-log-badge--powered">
            Airtable
          </span>
          {logs.length > 0 && (
            <span className="activity-log-badge activity-log-badge--count">
              {logs.length}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {lastRefreshed && (
            <span className="activity-log-refresh-time">
              <Clock size={10} />
              {formatRelativeTime(lastRefreshed.toISOString())}
            </span>
          )}
          <button
            className="activity-log-refresh-btn"
            onClick={() => fetchLogs()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={12} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && logs.length === 0 && (
        <div className="activity-log-skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="activity-log-skeleton-row">
              <div className="skeleton-circle" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-line skeleton-line--wide" />
                <div className="skeleton-line skeleton-line--narrow" />
              </div>
              <div className="skeleton-line skeleton-line--xs" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && (
        <div className="activity-log-empty">
          <Clock size={28} color="#d6d3d1" />
          <p className="activity-log-empty-title">No activity yet</p>
          <p className="activity-log-empty-desc">
            Create and share your first sheet — it will appear here instantly.
          </p>
        </div>
      )}

      {/* Log entries */}
      {logs.length > 0 && (
        <div className="activity-log-list">
          {logs.map((entry, idx) => (
            <div
              key={entry.id}
              className="activity-log-row"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Status icon */}
              <div className="activity-log-status-icon">
                {entry.status === "Success" ? (
                  <CheckCircle2 size={16} color="#16a34a" />
                ) : (
                  <XCircle size={16} color="#ef4444" />
                )}
              </div>

              {/* Main content */}
              <div className="activity-log-content">
                <div className="activity-log-row-top">
                  <span className="activity-log-sheet-name">
                    {entry.sheetName || "Untitled"}
                  </span>
                  <span
                    className={`activity-log-status-badge ${
                      entry.status === "Success"
                        ? "activity-log-status-badge--success"
                        : "activity-log-status-badge--error"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>

                <div className="activity-log-row-meta">
                  {entry.hiddenTabs && entry.hiddenTabs !== "None" && (
                    <span className="activity-log-meta-chip">
                      <EyeOff size={9} />
                      {entry.hiddenTabs}
                    </span>
                  )}
                  <span className="activity-log-meta-time">
                    <Clock size={9} />
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </div>
              </div>

              {/* Open link */}
              {entry.shareUrl && (
                <a
                  href={entry.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="activity-log-open-btn"
                  title="Open sheet"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
