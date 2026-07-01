"use client";

import { useState } from "react";
import { Trigger } from "@/components/TriggersConsole";

interface UseTriggerFormOptions {
  initialType?: Trigger["type"];
  initialSheetName?: string;
}

/**
 * Shared trigger-builder form state, consumed by both the bottom TriggersConsole
 * drawer and the sidebar TriggerEventPicker so the two entry points can't drift
 * on field defaults, visibility rules, or the payload shape sent to onAddTrigger.
 */
export function useTriggerForm({
  initialType = "cell_changed",
  initialSheetName = "All",
}: UseTriggerFormOptions = {}) {
  const [triggerName, setTriggerName] = useState("");
  const [eventType, setEventType] = useState<Trigger["type"]>(initialType);
  const [sheetName, setSheetName] = useState(initialSheetName);
  const [targetColumn, setTargetColumn] = useState<number>(-1); // -1 is Any Column
  const [actionType, setActionType] = useState<"auto_fill" | "log_only">("log_only");
  const [actionColumn, setActionColumn] = useState<number>(0);
  const [actionRow, setActionRow] = useState<number>(0);
  const [actionValue, setActionValue] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(15);

  const reset = () => {
    setTriggerName("");
    setActionValue("");
  };

  /** Builds the Trigger payload for onAddTrigger, or null if required fields are missing. */
  const buildPayload = (id?: string): (Omit<Trigger, "id"> & { id?: string }) | null => {
    if (!triggerName.trim()) return null;
    if (actionType === "auto_fill" && !actionValue.trim()) return null;

    const payload: Omit<Trigger, "id"> & { id?: string } = {
      id,
      name: triggerName,
      type: eventType,
      isActive: true,
      sheetName,
      actionType,
    };

    if (eventType === "cell_changed") {
      payload.targetColumn = targetColumn;
    }

    if (actionType === "auto_fill") {
      payload.actionColumn = actionColumn;
      payload.actionValueFormula = actionValue;
      if (eventType === "http_trigger" || eventType === "periodic_trigger") {
        payload.actionRow = actionRow;
      }
    }

    if (eventType === "periodic_trigger") {
      payload.intervalMinutes = intervalMinutes;
    }

    return payload;
  };

  return {
    triggerName,
    setTriggerName,
    eventType,
    setEventType,
    sheetName,
    setSheetName,
    targetColumn,
    setTargetColumn,
    actionType,
    setActionType,
    actionColumn,
    setActionColumn,
    actionRow,
    setActionRow,
    actionValue,
    setActionValue,
    intervalMinutes,
    setIntervalMinutes,
    buildPayload,
    reset,
  };
}
