// JSX rendering helpers extracted from MessageDisplay.jsx. renderReplyContent
// renders a reply preview with @mentions highlighted; renderHighlightedSearchText
// wraps search-query matches in <mark>.
//
// ✅ The search-highlight RULE is no longer local: it lives in
// `chatSearch.splitChatSearchMatches`, beside the counter it has to agree with,
// and the three copies that used to exist here, in MessageText and in
// ConversationList are gone. Only the <mark> styling is still per-component,
// deliberately.
// ✅ And the mention rule is no longer local either - `utils/mentions.js` now
// holds the pattern and the name precedence that all six mention surfaces
// share. That was the "separate task" this comment used to name; resolving a
// name from its id made it unavoidable, because the rule stopped being a
// one-line read of stored text.
import React from "react";
import { splitChatSearchMatches } from "./chatSearch";
import { resolveMentionLabel, splitMentions } from "./mentions";

/**
 * @param {string} text
 * @param {number} maxLen
 * @param {{ blockedIds?: Set|null, t?: Function|null }} [options]
 *   a block in either direction anonymizes the mention here too (F12) — the
 *   quoted reply used to still show the real name after MessageText.jsx and
 *   the transcript were already fixed.
 */
export const renderReplyContent = (
  text,
  maxLen = 120,
  { blockedIds = null, names = null, t = null } = {},
) => {
  if (!text) return null;
  // ⚠️ Sliced BEFORE the mentions are read, as before: a token cut by `maxLen`
  // stops being a mention and shows as the raw text it is. Pre-existing, and
  // left alone so this stays a refactor.
  const sliced = text.slice(0, maxLen);
  return splitMentions(sliced).map((segment, index) => {
    if (!segment.isMention) {
      return <React.Fragment key={index}>{segment.text}</React.Fragment>;
    }
    const { label, isAnonymized } = resolveMentionLabel(segment, {
      blockedIds,
      names,
      t,
    });
    return (
      <span
        key={index}
        className={
          isAnonymized
            ? "font-medium text-base-content/50"
            : "font-medium text-primary"
        }
      >
        @{label}
      </span>
    );
  });
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
