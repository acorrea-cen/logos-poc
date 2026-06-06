export function highlight(text: string, terms: string[]): string {
  if (terms.length === 0) return text;

  // Escape regex special chars
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  return text.replace(pattern, "<mark>$1</mark>");
}
