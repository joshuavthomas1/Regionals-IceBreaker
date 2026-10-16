export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function extractCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const pathMatch = trimmed.match(/\/p\/([A-Za-z0-9]+)/i);
  if (pathMatch) {
    const code = normalizeCode(pathMatch[1]);
    return code.length >= 6 ? code : null;
  }

  const compact = normalizeCode(trimmed);
  if (compact.length >= 6 && compact.length <= 12) return compact;
  return null;
}

export function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "badge";
}
