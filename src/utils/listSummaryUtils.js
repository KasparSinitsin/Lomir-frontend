/**
 * Extract display names from a mixed array of strings and objects.
 *
 * Handles string arrays, object arrays, and mixed values.
 *
 * @param {Array} items
 * @returns {string[]}
 */
export const extractNames = (items) =>
  (items || [])
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(
          item.name ??
            item.tag ??
            item.badgeName ??
            item.badge_name ??
            item.label ??
            "",
        ).trim();
      }
      return "";
    })
    .filter(Boolean);

/**
 * Create a truncated summary from an array of name strings.
 *
 * @param {string[]} names - already-extracted name strings
 * @param {number} maxVisible - how many to show before "+N"
 * @returns {{ summary: string, tooltip: string, count: number }}
 */
export const summarizeList = (names, maxVisible = 3) => {
  if (!names || names.length === 0) {
    return { summary: "", tooltip: "", count: 0 };
  }

  const visible = names.slice(0, maxVisible);
  const remaining = names.length - maxVisible;

  return {
    summary: visible.join(", ") + (remaining > 0 ? ` +${remaining}` : ""),
    tooltip: names.join(", "),
    count: names.length,
  };
};

/**
 * Convenience: extract names then summarize in one call.
 *
 * @param {Array} items - mixed strings/objects
 * @param {number} maxVisible
 * @returns {{ summary: string, tooltip: string, count: number }}
 */
export const summarizeItems = (items, maxVisible = 3) =>
  summarizeList(extractNames(items), maxVisible);
