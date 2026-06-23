"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface RightSidebarProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function RightSidebar({ open, onClose, title, footer, children }: RightSidebarProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <aside className={`at-sidebar${open ? " at-sidebar--open" : ""}`}>
      {/* Header */}
      <div className="at-sidebar-header">
        <span className="at-sidebar-title">{title}</span>
        <button
          className="at-sidebar-close"
          onClick={onClose}
          title="Close panel (Esc)"
          aria-label="Close panel"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body */}
      <div className="at-sidebar-body">
        {children}
      </div>

      {/* Footer (action buttons) */}
      {footer && (
        <div className="at-sidebar-footer">
          {footer}
        </div>
      )}
    </aside>
  );
}
