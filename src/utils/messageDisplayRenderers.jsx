// JSX rendering helpers extracted from MessageDisplay.jsx. renderReplyContent
// renders a reply preview with @mentions highlighted; renderHighlightedSearchText
// wraps search-query matches in <mark>.
//
// ✅ The search-highlight RULE is no longer local: it lives in
// `chatSearch.splitChatSearchMatches`, beside the counter it has to agree with,
// and the three copies that used to exist here, in MessageText and in
// ConversationList are gone. Only the <mark> styling is still per-component,
// deliberately. MENTION_RE is still local — that dedup is a separate task.
import React from "react";
import { splitChatSearchMatches } from "./chatSearch";

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

// The matching rule lives beside the counter in `chatSearch.js` — one phrase,
// case- and diacritic-insensitive — so highlighting and counting cannot drift
// apart. This function only renders it.
export const renderHighlightedSearchText = (value, query) => {
  const parts = splitChatSearchMatches(value, query);
  if (parts.length === 1 && !parts[0].isMatch) return parts[0].text;

  return parts.map((part, index) =>
    part.isMatch ? (
      <mark
        key={index}
        className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[var(--color-primary-focus)]"
      >
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
};
