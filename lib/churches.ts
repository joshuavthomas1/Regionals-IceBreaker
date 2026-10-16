export const CHURCHES = ["DMTC", "CMTC", "STMTC"] as const;

export type Church = (typeof CHURCHES)[number];

export function parseChurch(value: string): Church | null {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");
  return (CHURCHES as readonly string[]).includes(normalized) ? (normalized as Church) : null;
}

export function requireChurch(value: string): Church {
  const church = parseChurch(value);
  if (!church) throw new Error("Choose a church: DMTC, CMTC, or STMTC.");
  return church;
}
