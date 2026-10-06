/**
 * Join name parts into one display string.
 *
 * Collapses every run of whitespace, not just the edges. A stored name can
 * carry a stray space of its own (`users.first_name` has one such row), and
 * joining the parts then leaves that space in the MIDDLE of the result, where
 * `.trim()` cannot reach it. The stored row is deliberately left untouched —
 * this is the display-side fix.
 */
export const joinNameParts = (...parts) =>
  parts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

export const formatDisplayName = (member) => {
  const first = member.firstName || member.first_name || "";
  const last = member.lastName || member.last_name || "";
  const username = member.username || "";

  // fallback if no names exist
  if (!first && !last) return username || "Unknown";

  const fullName = joinNameParts(first, last);

  // If the name is short enough, use it directly
  if (fullName.length <= 18) return fullName;

  // If long → shorten middle names to initials.
  // Splitting on /\s+/ rather than " " so an empty part can never reach
  // `charAt(0)` below and render as a bare "." — a stray space used to turn
  // "Maximiliane Schweighofer" into "Maximiliane . Schweighofer".
  const parts = fullName.split(/\s+/);

  if (parts.length >= 3) {
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    const middleInitials = parts
      .slice(1, -1)
      .map((n) => `${n.charAt(0)}.`)
      .join(" ");

    return `${firstName} ${middleInitials} ${lastName}`;
  }

  // fallback
  return fullName;
};
