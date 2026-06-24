"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  label: string;
  value: string;
  color?: string; // Optional color preview (e.g., for color selection)
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function Dropdown({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = "Select an option",
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", position: "relative" }}>
      {label && (
        <span className="field-label" style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "var(--at-text-muted)" }}>
          {label}
        </span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "8px 12px",
          border: "1px solid var(--at-border)",
          borderRadius: "var(--radius-sm)",
          background: "var(--at-surface-2)",
          fontFamily: "var(--font-body)",
          fontSize: "13px",
          color: disabled ? "var(--at-text-soft)" : "var(--at-text)",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          transition: "border-color 0.15s, background 0.15s",
          textAlign: "left",
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = "var(--at-text-soft)";
        }}
        onMouseLeave={(e) => {
          if (!disabled) e.currentTarget.style.borderColor = "var(--at-border)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedOption?.color && (
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: selectedOption.color,
                border: "1px solid var(--at-border)",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
          )}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: "var(--at-text-soft)",
            flexShrink: 0,
          }}
        />
      </button>

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            background: "var(--at-surface)",
            border: "1px solid var(--at-border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
            zIndex: 200,
            maxHeight: "220px",
            overflowY: "auto",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === selectedValue;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background: isSelected ? "var(--at-accent-light)" : "transparent",
                  color: isSelected ? "var(--at-accent)" : "var(--at-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s, color 0.1s",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--at-tab-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {opt.color && (
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: opt.color,
                      border: "1px solid var(--at-border)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ flex: 1 }}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
