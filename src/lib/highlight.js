const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits `text` into pieces and marks the ones that match a word of the search `query` (any case), so the screen can
 * highlight why a row was found: ("AMITBHAI GOSWAMI", "gos") -> [{ text: "AMITBHAI ", match: false }, { text: "GOS", match: true }, { text: "WAMI", match: false }].
 * Like the search itself, at most 6 words are used; the longest word wins where words overlap.
 */
export function highlightParts(text, query) {
  const value = String(text ?? "");
  const words = [...new Set(String(query ?? "").trim().split(/\s+/).filter(Boolean))].slice(0, 6).sort((a, b) => b.length - a.length);
  if (!value || words.length === 0) return [{ text: value, match: false }];
  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "giu");
  // split() with a capturing group puts the matches at the odd positions
  return value
    .split(pattern)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}
