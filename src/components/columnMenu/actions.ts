import { ImportedSheet, ColumnMetadata } from "../SpreadsheetGrid";

function cloneSheets(sheets: ImportedSheet[]): ImportedSheet[] {
  return sheets.map((s) => ({
    ...s,
    data: s.data.map((r) => r.map((c) => ({ ...c, style: { ...c.style } }))),
    cols: s.cols?.map((c) => ({ ...c })),
    rows: s.rows?.map((r) => ({ ...r })),
  }));
}

export function updateColMeta(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
  patch: Partial<ColumnMetadata>,
): ImportedSheet[] {
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];
  const colCount = sheet.data[0]?.length || 0;
  const cols = sheet.cols
    ? [...sheet.cols]
    : Array.from({ length: colCount }, () => ({} as ColumnMetadata));
  while (cols.length <= colIdx) cols.push({} as ColumnMetadata);
  cols[colIdx] = { ...cols[colIdx], ...patch };
  sheet.cols = cols;
  return next;
}

export function sortByColumn(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
  dir: "asc" | "desc",
): ImportedSheet[] {
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];
  if (sheet.data.length <= 1) return next;

  const header = sheet.data[0];
  const headerMeta = sheet.rows?.[0];
  const bodyRows = sheet.data.slice(1);
  const bodyMeta = sheet.rows ? sheet.rows.slice(1) : bodyRows.map(() => ({}));

  const pairs = bodyRows.map((r, i) => ({ r, m: bodyMeta[i] || {} }));
  pairs.sort((a, b) => {
    const va = a.r[colIdx]?.value ?? "";
    const vb = b.r[colIdx]?.value ?? "";
    const na = Number(va);
    const nb = Number(vb);
    const cmp =
      !isNaN(na) && !isNaN(nb) && va !== "" && vb !== ""
        ? na - nb
        : va.localeCompare(vb);
    return dir === "asc" ? cmp : -cmp;
  });

  sheet.data = [header, ...pairs.map((p) => p.r)];
  if (sheet.rows) sheet.rows = [headerMeta || {}, ...pairs.map((p) => p.m)];
  return next;
}

export function dedupeByColumn(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
): ImportedSheet[] {
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];
  if (sheet.data.length <= 1) return next;

  const seen = new Set<string>();
  const keptData: typeof sheet.data = [sheet.data[0]];
  const keptMeta = sheet.rows ? [sheet.rows[0] || {}] : undefined;

  for (let r = 1; r < sheet.data.length; r++) {
    const val = sheet.data[r][colIdx]?.value ?? "";
    if (!seen.has(val)) {
      seen.add(val);
      keptData.push(sheet.data[r]);
      keptMeta?.push(sheet.rows?.[r] || {});
    }
  }

  sheet.data = keptData;
  if (keptMeta) sheet.rows = keptMeta;
  return next;
}

export function duplicateColumn(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
): ImportedSheet[] {
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];
  sheet.data = sheet.data.map((row) => {
    const newRow = [...row];
    newRow.splice(colIdx + 1, 0, { ...row[colIdx], style: { ...row[colIdx]?.style } });
    return newRow;
  });
  if (sheet.cols) {
    const newCols = [...sheet.cols];
    newCols.splice(colIdx + 1, 0, { ...(sheet.cols[colIdx] || {}), name: undefined });
    sheet.cols = newCols;
  }
  return next;
}

export function deleteColumn(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
): ImportedSheet[] {
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];
  if ((sheet.data[0]?.length ?? 0) <= 1) return next;

  sheet.data = sheet.data.map((row) => {
    const r = [...row];
    r.splice(colIdx, 1);
    return r;
  });
  if (sheet.cols) {
    const newCols = [...sheet.cols];
    newCols.splice(colIdx, 1);
    sheet.cols = newCols;
  }
  return next;
}

export function insertColumns(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
  count: number,
  right: boolean,
): ImportedSheet[] {
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];
  const insertAt = right ? colIdx + 1 : colIdx;
  const empties = Array.from({ length: count }, () => ({ value: "", style: {} }));

  sheet.data = sheet.data.map((row) => {
    const r = [...row];
    r.splice(insertAt, 0, ...empties.map(() => ({ value: "", style: {} })));
    return r;
  });

  const colCount = sheet.data[0]?.length || 0;
  const baseCols: ColumnMetadata[] = sheet.cols
    ? [...sheet.cols]
    : Array.from({ length: colCount - count }, () => ({}));
  const metaCopies: ColumnMetadata[] = Array.from({ length: count }, () => ({}));
  baseCols.splice(insertAt, 0, ...metaCopies);
  sheet.cols = baseCols;
  return next;
}

export function textToColumns(
  sheets: ImportedSheet[],
  sheetIdx: number,
  colIdx: number,
  delimiter: string,
): ImportedSheet[] {
  if (!delimiter) return sheets;
  const next = cloneSheets(sheets);
  const sheet = next[sheetIdx];

  let maxParts = 1;
  for (let r = 1; r < sheet.data.length; r++) {
    maxParts = Math.max(maxParts, (sheet.data[r][colIdx]?.value ?? "").split(delimiter).length);
  }
  if (maxParts <= 1) return next;

  const newColsCount = maxParts - 1;
  sheet.data = sheet.data.map((row, rIdx) => {
    const parts = (row[colIdx]?.value ?? "").split(delimiter);
    const newRow = [...row];
    newRow[colIdx] = { ...newRow[colIdx], value: parts[0] ?? "" };
    const extras = Array.from({ length: newColsCount }, (_, i) => ({
      value: parts[i + 1] ?? "",
      style: rIdx === 0 ? {} : { ...(row[colIdx]?.style || {}) },
    }));
    newRow.splice(colIdx + 1, 0, ...extras);
    return newRow;
  });

  const colCount = sheet.data[0]?.length || 0;
  const baseCols: ColumnMetadata[] = sheet.cols
    ? [...sheet.cols]
    : Array.from({ length: colCount - newColsCount }, () => ({}));
  const metaCopies: ColumnMetadata[] = Array.from({ length: newColsCount }, () => ({}));
  baseCols.splice(colIdx + 1, 0, ...metaCopies);
  sheet.cols = baseCols;
  return next;
}
