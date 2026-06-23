import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const toastConfig: Record<
  ToastType,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    accent: string;
  }
> = {
  success: {
    icon: <CheckCircle2 size={15} strokeWidth={2.5} />,
    iconBg: "#14532d",
    iconColor: "#4ade80",
    titleColor: "#f9fafb",
    accent: "#22c55e",
  },
  error: {
    icon: <XCircle size={15} strokeWidth={2.5} />,
    iconBg: "#7f1d1d",
    iconColor: "#f87171",
    titleColor: "#f9fafb",
    accent: "#ef4444",
  },
  info: {
    icon: <Info size={15} strokeWidth={2.5} />,
    iconBg: "#1e3a5f",
    iconColor: "#60a5fa",
    titleColor: "#f9fafb",
    accent: "#3b82f6",
  },
  warning: {
    icon: <AlertTriangle size={15} strokeWidth={2.5} />,
    iconBg: "#78350f",
    iconColor: "#fbbf24",
    titleColor: "#f9fafb",
    accent: "#f59e0b",
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);
  const cfg = toastConfig[toast.type];

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 10);
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 320);
    }, 4200);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`toast ${visible ? "toast--enter" : "toast--exit"}`}
      style={{
        borderLeft: `3px solid ${cfg.accent}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
      }}
    >
      <div
        className="toast-icon-wrap"
        style={{ background: cfg.iconBg, color: cfg.iconColor }}
      >
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: cfg.titleColor, lineHeight: 1.3 }}>
          {toast.title}
        </p>
        {toast.description && (
          <p style={{ fontSize: "11.5px", color: "#9ca3af", marginTop: "3px", lineHeight: 1.45 }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 320);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#6b7280",
          display: "flex",
          alignItems: "center",
          padding: "2px",
          borderRadius: "4px",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d5db")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (type: ToastType, title: string, description?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, dismiss, toast };
}
