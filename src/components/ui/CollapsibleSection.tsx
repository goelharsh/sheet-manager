"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid var(--at-border-light)",
        borderRadius: "var(--radius-md)",
        background: "var(--at-surface)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s ease",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "12px 16px",
          border: "none",
          background: isOpen ? "var(--at-surface-2)" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          outline: "none",
          transition: "background-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--at-surface-2)";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--at-text)",
            fontFamily: "var(--font-body)",
          }}
        >
          {title}
        </span>
        <ChevronDown
          size={16}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            color: "var(--at-text-muted)",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--at-border-light)",
            background: "var(--at-surface)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
