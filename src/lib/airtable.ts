/* -----------------------------------------------------------------------
 * lib/airtable.ts — Airtable client singleton.
 *
 * This file initialises ONE shared Airtable base instance that every
 * server-side API route can import.  It reads credentials from env vars
 * so they NEVER reach the browser.
 *
 * Required env vars (add to .env.local):
 *   AIRTABLE_API_KEY   — Personal Access Token from airtable.com/create/tokens
 *   AIRTABLE_BASE_ID   — Found in your base URL: airtable.com/{BASE_ID}/...
 * ----------------------------------------------------------------------- */

import Airtable, { FieldSet } from "airtable";

// Validate at import time so errors surface immediately during development.
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey) {
  console.warn(
    "[Airtable] AIRTABLE_API_KEY is not set. Add it to .env.local."
  );
}
if (!baseId) {
  console.warn(
    "[Airtable] AIRTABLE_BASE_ID is not set. Add it to .env.local."
  );
}

/**
 * Shared Airtable base instance.
 *
 * Usage:
 *   import { base } from "@/lib/airtable";
 *   const records = await base("Activity Log").select().all();
 */
const base = new Airtable({ apiKey: apiKey ?? "" }).base(baseId ?? "");

export { base };

// ─── TypeScript types for the "Activity Log" table ───────────────────────────

// ActivityLogFields extends FieldSet so it carries the index signature
// { [key: string]: FieldValue } that Airtable's .create() requires.
export interface ActivityLogFields extends FieldSet {
  "Sheet Name": string;
  "Spreadsheet ID": string;
  "Share URL": string;
  "Hidden Tabs": string; // comma-separated tab names
  Status: "Success" | "Failed";
  "Created At": string; // ISO 8601
}

export interface ActivityLogRecord {
  id: string;
  fields: ActivityLogFields;
}
