// Pure helper (no framework imports, unit-testable).

/**
 * Puts the recently used options first and marks them (`recent: true`), so a dropdown can show them on top with a badge.
 * `recentIds` is newest first; every other option keeps its original order after them. Ids not in `options` are ignored.
 * When SEVERAL options are recent and they are all of them, nothing is marked (a badge on everything tells nothing); a single
 * "last used" option is always marked, even in a list of one.
 */
export function withRecent(options, recentIds = []) {
  const byValue = new Map(options.map((option) => [String(option.value), option]));
  const seen = new Set();
  const recent = [];
  for (const id of recentIds) {
    const option = byValue.get(String(id));
    if (option && !seen.has(String(id))) {
      seen.add(String(id));
      recent.push({ ...option, recent: true });
    }
  }
  if (recent.length === 0 || (recent.length > 1 && recent.length >= options.length)) return options;
  return [...recent, ...options.filter((option) => !seen.has(String(option.value)))];
}
