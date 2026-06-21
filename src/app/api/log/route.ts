/* -----------------------------------------------------------------------
 * app/api/log/route.ts — Activity Log API route
 *
 * This is a Next.js App Router Route Handler.  All Airtable calls happen
 * SERVER-SIDE, so your Personal Access Token is NEVER sent to the browser.
 *
 * Endpoints:
 *   POST /api/log  — Create a new activity log entry in Airtable
 *   GET  /api/log  — Fetch the 20 most-recent log entries
 * ----------------------------------------------------------------------- */

import { base, ActivityLogFields } from "@/lib/airtable";
import { NextResponse } from "next/server";

const TABLE = "Activity Log";

// ─── Error helper ─────────────────────────────────────────────────────────────
//
// The Airtable SDK throws plain objects, NOT Error instances:
//   { error: "NOT_AUTHORIZED", message: "...", statusCode: 401 }
//
// So `err instanceof Error` always returns false → "Unknown error".
// This helper extracts the real message regardless of the thrown type.

function extractAirtableError(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.error === "string") return e.error;
    return JSON.stringify(e); // last resort — see the raw object
  }

  return String(err);
}

// ─── Credential guard ─────────────────────────────────────────────────────────
//
// Placeholder strings in .env.local look like real strings to process.env,
// so a simple !value check passes even when not configured.
// We explicitly check for the placeholder values too.

const PLACEHOLDER_KEY = "your_personal_access_token_here";
const PLACEHOLDER_BASE = "your_base_id_here";

function airtableIsConfigured(): boolean {
  const key = process.env.AIRTABLE_API_KEY ?? "";
  const baseId = process.env.AIRTABLE_BASE_ID ?? "";
  return (
    key.length > 0 &&
    baseId.length > 0 &&
    key !== PLACEHOLDER_KEY &&
    baseId !== PLACEHOLDER_BASE
  );
}

const NOT_CONFIGURED_RESPONSE = {
  error:
    "Airtable is not configured. Replace the placeholder values for " +
    "AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local, then restart the dev server.",
};

// ─── POST: Log a new sheet creation ──────────────────────────────────────────

export async function POST(request: Request) {
  if (!airtableIsConfigured()) {
    return NextResponse.json(NOT_CONFIGURED_RESPONSE, { status: 503 });
  }

  try {
    const body = await request.json();

    const {
      sheetName,
      spreadsheetId,
      shareUrl,
      hiddenTabs,
      status,
    }: {
      sheetName: string;
      spreadsheetId: string;
      shareUrl: string;
      hiddenTabs: string[];
      status: "Success" | "Failed";
    } = body;

    if (!sheetName || !spreadsheetId) {
      return NextResponse.json(
        { error: "sheetName and spreadsheetId are required" },
        { status: 400 }
      );
    }

    const fields: ActivityLogFields = {
      "Sheet Name": sheetName,
      "Spreadsheet ID": spreadsheetId,
      "Share URL": shareUrl ?? "",
      "Hidden Tabs": hiddenTabs?.join(", ") ?? "None",
      Status: status ?? "Success",
      "Created At": new Date().toISOString(),
    };

    const created = await base(TABLE).create([{ fields }]);
    const record = created[0];

    return NextResponse.json(
      { success: true, id: record.id, message: "Activity logged to Airtable ✓" },
      { status: 201 }
    );
  } catch (err) {
    const message = extractAirtableError(err);
    console.error("[POST /api/log] Airtable error (raw):", err);
    return NextResponse.json(
      { error: `Failed to log activity: ${message}` },
      { status: 500 }
    );
  }
}

// ─── GET: Fetch recent activity logs ─────────────────────────────────────────

export async function GET() {
  if (!airtableIsConfigured()) {
    return NextResponse.json(
      { ...NOT_CONFIGURED_RESPONSE, records: [] },
      { status: 503 }
    );
  }

  try {
    const records = await base(TABLE)
      .select({
        view: "Grid view",
        maxRecords: 20,
        sort: [{ field: "Created At", direction: "desc" }],
      })
      .all();

    const logs = records.map((r) => ({
      id: r.id,
      sheetName: r.fields["Sheet Name"] as string,
      spreadsheetId: r.fields["Spreadsheet ID"] as string,
      shareUrl: r.fields["Share URL"] as string,
      hiddenTabs: r.fields["Hidden Tabs"] as string,
      status: r.fields["Status"] as string,
      createdAt: r.fields["Created At"] as string,
    }));

    return NextResponse.json({ records: logs });
  } catch (err) {
    const message = extractAirtableError(err);
    console.error("[GET /api/log] Airtable error (raw):", err);

    // Forward Airtable's auth status so the client can show the right UI
    const statusCode =
      typeof err === "object" && err !== null
        ? (err as Record<string, unknown>).statusCode
        : undefined;
    const httpStatus =
      statusCode === 401 || statusCode === 403 ? (statusCode as number) : 500;

    return NextResponse.json(
      { error: `Failed to fetch logs: ${message}`, records: [] },
      { status: httpStatus }
    );
  }
}
