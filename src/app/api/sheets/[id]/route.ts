import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SCRATCH_DIR = path.join(process.cwd(), "scratch");
const DB_FILE = path.join(SCRATCH_DIR, "sheet_db.json");

// Helper to slugify worksheet name for clean URLs
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")           // Replace spaces with -
    .replace(/[^\w\-]+/g, "")       // Remove all non-word chars
    .replace(/\-\-+/g, "-")         // Replace multiple - with single -
    .replace(/^-+/, "")             // Trim - from start
    .replace(/-+$/, "");            // Trim - from end
}

// Database loading helper (mirrors route.ts Upstash/Local fallback)
async function loadDbState() {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    try {
      const res = await fetch(`${kvUrl}/get/sheet_db_state`, {
        headers: {
          Authorization: `Bearer ${kvToken}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          return JSON.parse(json.result);
        }
      }
    } catch (err) {
      console.error("Failed to load from Upstash Redis:", err);
    }
  }

  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    // File doesn't exist yet, return null
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sheetIdParam } = await params;
    const decodedId = decodeURIComponent(sheetIdParam);
    const searchParams = req.nextUrl.searchParams;

    // 1. Load Data
    const dbState = await loadDbState();
    if (!dbState || !dbState.sheets || !Array.isArray(dbState.sheets)) {
      return NextResponse.json(
        { error: "No sheets found in database." },
        { status: 404 }
      );
    }

    // 2. Find Sheet (exact name match or slug match)
    const sheet = dbState.sheets.find(
      (s: any) =>
        s.name.toLowerCase() === decodedId.toLowerCase() ||
        slugify(s.name) === decodedId.toLowerCase()
    );

    if (!sheet) {
      return NextResponse.json(
        { error: `Sheet "${decodedId}" not found.` },
        { status: 404 }
      );
    }

    // 3. Authenticate & Verify Permissions
    const apiSettings = sheet.apiSettings || { enabled: false, isPublic: true };

    if (!apiSettings.enabled) {
      return NextResponse.json(
        { error: `API access is disabled for sheet "${sheet.name}". Enable it in the Sheet Manager console.` },
        { status: 403 }
      );
    }

    if (!apiSettings.isPublic) {
      const authHeader = req.headers.get("Authorization");
      let providedApiKey = "";
      if (authHeader && authHeader.startsWith("Bearer ")) {
        providedApiKey = authHeader.substring(7);
      } else {
        providedApiKey = searchParams.get("_apiKey") || searchParams.get("apiKey") || "";
      }

      if (!providedApiKey || providedApiKey !== apiSettings.apiKey) {
        return NextResponse.json(
          { error: "Unauthorized. Invalid or missing API key." },
          { status: 401 }
        );
      }
    }

    // 4. Convert CellData[][] to JSON objects
    const rows = sheet.data;
    if (!rows || rows.length === 0) {
      return NextResponse.json([]);
    }

    // Extract & Deduplicate Headers
    const headers: string[] = [];
    const seenHeaders = new Map<string, number>();

    rows[0].forEach((cell: any, index: number) => {
      let val = cell && cell.value !== undefined ? cell.value.toString().trim() : "";
      if (!val) {
        val = `column_${index + 1}`;
      }

      if (seenHeaders.has(val)) {
        const count = seenHeaders.get(val)! + 1;
        seenHeaders.set(val, count);
        val = `${val}_${count}`;
      } else {
        seenHeaders.set(val, 1);
      }
      headers.push(val);
    });

    // Parse records
    let records = rows.slice(1).map((row: any[]) => {
      const record: Record<string, any> = {};
      headers.forEach((header: string, index: number) => {
        const cell = row[index];
        record[header] = cell && cell.value !== undefined ? cell.value : "";
      });
      return record;
    });

    // 5. Apply Column Filters (ignore params starting with '_')
    const filterParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!key.startsWith("_") && key !== "apiKey") {
        filterParams[key] = value;
      }
    });

    if (Object.keys(filterParams).length > 0) {
      records = records.filter((rec: any) => {
        return Object.entries(filterParams).every(([key, val]) => {
          const actualKey = Object.keys(rec).find(
            (k) => k.toLowerCase() === key.toLowerCase()
          );
          if (!actualKey) return false;

          const recordValue = String(rec[actualKey] ?? "").toLowerCase();
          const filterValue = String(val).toLowerCase();
          return recordValue === filterValue;
        });
      });
    }

    // 6. Apply Sorting (_sort, _order)
    const sortKey = searchParams.get("_sort");
    const sortOrder = searchParams.get("_order") || "asc";
    if (sortKey) {
      const actualSortKey = headers.find(
        (h) => h.toLowerCase() === sortKey.toLowerCase()
      );
      if (actualSortKey) {
        records.sort((a: any, b: any) => {
          const valA = a[actualSortKey] ?? "";
          const valB = b[actualSortKey] ?? "";

          // Try numeric comparison (strip symbols like $, commas)
          const numA = Number(valA.toString().replace(/[\$,]/g, ""));
          const numB = Number(valB.toString().replace(/[\$,]/g, ""));

          if (!isNaN(numA) && !isNaN(numB)) {
            return sortOrder.toLowerCase() === "desc" ? numB - numA : numA - numB;
          }

          return sortOrder.toLowerCase() === "desc"
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB));
        });
      }
    }

    // 7. Apply Pagination (_limit, _offset)
    const limitStr = searchParams.get("_limit");
    const offsetStr = searchParams.get("_offset");

    let start = 0;
    if (offsetStr) {
      const parsedOffset = parseInt(offsetStr, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        start = parsedOffset;
      }
    }

    let end = records.length;
    if (limitStr) {
      const parsedLimit = parseInt(limitStr, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        end = start + parsedLimit;
      }
    }

    records = records.slice(start, end);

    return NextResponse.json(records);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
