import { NextRequest, NextResponse } from "next/server";
import { loadData, saveData } from "../../../db/route";

function getColLabel(colIdx: number): string {
  let label = "";
  let temp = colIdx;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

/**
 * Inbound HTTP trigger endpoint. External systems POST here to run a
 * "http_trigger"-type Trigger created via the sidebar Trigger Event Picker.
 * Mutates the persisted DB copy of the target sheet (not any currently-open
 * browser tab's live state) — the app polls /api/db to surface the resulting
 * log entry while its Triggers & Automations panel is open.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const { triggerId } = await params;

    const authHeader = req.headers.get("Authorization");
    let providedKey = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      providedKey = authHeader.substring(7);
    } else {
      providedKey = req.nextUrl.searchParams.get("key") || "";
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Empty/non-JSON body is fine — treat as no payload.
    }

    const dbState = (await loadData()) as {
      sheets?: any[];
      triggers?: any[];
      logs?: any[];
    } | null;

    const triggers = dbState?.triggers || [];
    const sheets = dbState?.sheets || [];
    const logs = dbState?.logs || [];

    const trigger = triggers.find(
      (t) => t.id === triggerId && t.type === "http_trigger"
    );

    if (!trigger) {
      return NextResponse.json(
        { error: `HTTP trigger "${triggerId}" not found.` },
        { status: 404 }
      );
    }

    if (!trigger.isActive) {
      return NextResponse.json(
        { error: `Trigger "${trigger.name}" is deactivated.` },
        { status: 403 }
      );
    }

    if (!trigger.secretKey || providedKey !== trigger.secretKey) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing secret key." },
        { status: 401 }
      );
    }

    if (!trigger.sheetName || trigger.sheetName === "All") {
      return NextResponse.json(
        { error: "This trigger has no specific target sheet configured." },
        { status: 400 }
      );
    }

    const sheetIdx = sheets.findIndex((s) => s.name === trigger.sheetName);
    if (sheetIdx === -1) {
      return NextResponse.json(
        { error: `Target sheet "${trigger.sheetName}" not found.` },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    let appliedValue: string | null = null;
    const nextSheets = [...sheets];

    if (trigger.actionType === "auto_fill") {
      if (trigger.actionRow === undefined || trigger.actionColumn === undefined) {
        return NextResponse.json(
          { error: "Trigger is missing a target row/column for auto-fill." },
          { status: 400 }
        );
      }

      const sheet = nextSheets[sheetIdx];
      const updatedData = sheet.data.map((row: any[]) => row.map((c: any) => ({ ...c })));

      if (!updatedData[trigger.actionRow]) {
        return NextResponse.json(
          { error: `Target row ${trigger.actionRow + 1} does not exist in "${trigger.sheetName}".` },
          { status: 400 }
        );
      }

      const template: string = trigger.actionValueFormula || "";
      let val = template
        .replace("{{row}}", String(trigger.actionRow + 1))
        .replace("{{timestamp}}", new Date().toLocaleTimeString());

      // {{body.<field>}} lets external callers pass a value straight into the sheet.
      val = val.replace(/{{body\.([\w.]+)}}/g, (_match, field: string) => {
        const value = field
          .split(".")
          .reduce((acc: any, key: string) => (acc && typeof acc === "object" ? acc[key] : undefined), body);
        return value !== undefined ? String(value) : "";
      });

      updatedData[trigger.actionRow][trigger.actionColumn] = {
        ...updatedData[trigger.actionRow][trigger.actionColumn],
        value: val,
      };
      nextSheets[sheetIdx] = { ...sheet, data: updatedData };
      appliedValue = val;
    }

    const logEntry = {
      id: `log-http-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      triggerName: trigger.name,
      eventType: "http_trigger",
      sheetName: trigger.sheetName,
      details:
        appliedValue !== null
          ? `HTTP trigger "${trigger.name}" fired. Wrote "${appliedValue}" to ${getColLabel(trigger.actionColumn)}${trigger.actionRow + 1} of "${trigger.sheetName}".`
          : `HTTP trigger "${trigger.name}" fired (log only).`,
      status: "success" as const,
    };
    const nextLogs = [logEntry, ...logs];

    const updatedTriggers = triggers.map((t) =>
      t.id === trigger.id ? { ...t, lastRunAt: timestamp } : t
    );

    await saveData({ sheets: nextSheets, triggers: updatedTriggers, logs: nextLogs });

    return NextResponse.json({
      success: true,
      sheetName: trigger.sheetName,
      appliedValue,
      logId: logEntry.id,
    });
  } catch (err) {
    console.error("[HTTP Trigger] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process HTTP trigger" },
      { status: 500 }
    );
  }
}
