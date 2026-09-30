// JSX rendering helpers extracted from MessageDisplay.jsx. renderReplyContent
// renders a reply preview with @mentions highlighted; renderHighlightedSearchText
// wraps search-query matches in <mark>. MENTION_RE and escapeRegExp are local to
// these renderers (generic copies also live in other chat components — a shared
// dedup is a separate task).
import React from "react";

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * @param {string} text
 * @param {number} maxLen
 * @param {{ blockedIds?: Set|null, t?: Function|null }} [options]
 *   a block in either direction anonymizes the mention here too (F12) — the
 *   quoted reply used to still show the real name after MessageText.jsx and
 *   the transcript were already fixed.
 */
export const renderReplyContent = (text, maxLen = 120, { blockedIds = null, t = null } = {}) => {
  if (!text) return null;
  const sliced = text.slice(0, maxLen);
  const parts = [];
  let last = 0;
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(sliced)) !== null) {
    if (m.index > last) parts.push(<React.Fragment key={last}>{sliced.slice(last, m.index)}</React.Fragment>);
    const isBlocked = Boolean(blockedIds?.has?.(String(m[2])));
    parts.push(
      <span
        key={m.index}
        className={isBlocked ? "font-medium text-base-content/50" : "font-medium text-primary"}
      >
        @{isBlocked && t ? t("badges.card.privateProfile") : m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < sliced.length) parts.push(<React.Fragment key={last}>{sliced.slice(last)}</React.Fragment>);
  return parts;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const renderHighlightedSearchText = (value, query) => {
  const text = String(value ?? "");
  const terms = String(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (!text || terms.length === 0) return text;

  const matcher = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    if (!part) return null;

    const isMatch = terms.some((term) =>
      new RegExp(`^${term}$`, "i").test(part),
    );

    if (!isMatch) return part;

    return (
      <mark
        key={`${part}-${index}`}
        className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[var(--color-primary-focus)]"
      >
        {part}
      </mark>
    );
  });
};
