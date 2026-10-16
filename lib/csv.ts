import { parseChurch } from "@/lib/churches";
import type { NewAttendee } from "@/lib/types";

export type CsvParse = {
  rows: NewAttendee[];
  errors: string[];
};

export function parseCsv(text: string): CsvParse {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return { rows: [], errors: ["The file is empty."] };

  const table = parseTable(cleaned);
  if (table.length === 0) return { rows: [], errors: ["The file is empty."] };

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  if (nameIdx < 0) {
    return {
      rows: [],
      errors: ["The first row needs a name column: name,fun_fact,church"],
    };
  }

  const churchIdx = header.indexOf("church");
  if (churchIdx < 0) {
    return {
      rows: [],
      errors: ["The first row needs a church column: name,fun_fact,church"],
    };
  }

  const companyIdx = header.indexOf("company");
  const titleIdx = header.indexOf("title");
  const factIdx = header.findIndex((cell) => cell === "fun_fact" || cell === "fun fact");
  const rows: NewAttendee[] = [];
  const errors: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((cell) => cell.trim() === "")) continue;
    const name = (cells[nameIdx] ?? "").trim();
    if (!name) {
      errors.push(`Row ${i + 1} is missing a name.`);
      continue;
    }
    const church = parseChurch(cells[churchIdx] ?? "");
    if (!church) {
      errors.push(`Row ${i + 1} needs a church: DMTC, CMTC, or STMTC.`);
      continue;
    }
    rows.push({
      name,
      company: companyIdx >= 0 ? (cells[companyIdx] ?? "").trim() : "",
      title: titleIdx >= 0 ? (cells[titleIdx] ?? "").trim() : "",
      church,
      funFact: factIdx >= 0 ? (cells[factIdx] ?? "").trim() : "",
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No attendees were found under the header.");
  }

  return { rows, errors };
}

function parseTable(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}
