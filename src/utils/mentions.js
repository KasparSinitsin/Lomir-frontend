// The one rule for @-mentions: how `@[Display Name](userId)` is found in stored
// message text, and which name it shows.
//
// ✅ Why this file exists. The pattern lived in SIX independent copies - the
// transcript (MessageText), the reply preview (messageDisplayRenderers), the
// reply tooltip (messageDisplayHelpers, as an unnamed inline regex), the
// notifications (MessageNotifications), the reply bar (MessageInput) and the
// search index (chatSearch). `messageDisplayRenderers.jsx` said so itself:
// "MENTION_RE is still local - that dedup is a separate task." It became this
// task the moment the name stopped being read straight out of the text,
// because a resolution rule in six places is a rule that drifts. That is not a
// hypothetical: the search highlighter had three copies and they disagreed with
// the counter in two different ways (FE #659).
//
// Segments, not JSX - same shape as `splitChatSearchMatches` next door, and for
// the same reason: the call sites style their own span deliberately.
//
// 🔴 The write side stays in MessageInput (`tokenizeMentions`). It is the only
// place that turns a typed `@Name` into a token, and it is deliberately NOT
// here: this module is about reading stored text, and the two must be free to
// disagree - stored rows outlive the writer that made them.

const MENTION_RE = /@\[([^\]]+)\]\(([^)]+)\)/g;

// `@all` is stored with the literal id "all". It addresses the team, not a
// person, so it is never resolved and never anonymized.
export const MENTION_ALL_ID = "all";

/** Cheap pre-check; every caller had its own copy of this too. */
export const hasMention = (text) =>
  typeof text === "string" && text.includes("@[");

/**
 * Splits stored message text into plain runs and mention runs.
 * @param {string} text
 * @returns {Array<{ text: string, isMention: false } | { isMention: true, name: string, userId: string, raw: string, index: number, end: number }>}
 */
export const splitMentions = (text) => {
  const value = typeof text === "string" ? text : "";
  if (!hasMention(value)) {
    return value ? [{ text: value, isMention: false }] : [];
  }

  const segments = [];
  let last = 0;
  let m;
  // A module-level regex with /g carries `lastIndex` between calls, so this is
  // reset defensively.
  // ⚠️ It is NOT load-bearing today, and the comment here used to claim it was
  // ("or the second render finds nothing"). Removing the reset was mutated in
  // and every check still passed: the loop below always runs `exec` to
  // exhaustion, and the final `null` resets `lastIndex` itself. The reset
  // earns its place only against a future `break` or an early return inside
  // the loop - keep it, but do not believe it is protecting anything now.
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(value)) !== null) {
    if (m.index > last) {
      segments.push({ text: value.slice(last, m.index), isMention: false });
    }
    segments.push({
      isMention: true,
      name: m[1],
      userId: String(m[2]),
      raw: m[0],
      // `index`/`end` are here because MessageText interleaves mentions with
      // detected URLs by position; the other five callers ignore them.
      index: m.index,
      end: m.index + m[0].length,
    });
    last = m.index + m[0].length;
  }
  if (last < value.length) {
    segments.push({ text: value.slice(last), isMention: false });
  }
  return segments;
};

/** Just the mention runs, for callers that position them against other matches. */
export const findMentions = (text) =>
  splitMentions(text).filter((segment) => segment.isMention);

/**
 * The distinct person ids mentioned in one or more texts, as strings.
 * `@all` is excluded - it is not a user.
 * @param {string|string[]} input
 * @returns {string[]}
 */
export const collectMentionIds = (input) => {
  const texts = Array.isArray(input) ? input : [input];
  const ids = new Set();
  for (const text of texts) {
    for (const segment of splitMentions(text)) {
      if (segment.isMention && segment.userId !== MENTION_ALL_ID) {
        ids.add(segment.userId);
      }
    }
  }
  return [...ids];
};

/**
 * Which name a mention shows, and whether it is anonymized.
 *
 * 🔴 The PRECEDENCE is the point of this function, and it is why no call site
 * is allowed to assemble it itself:
 *
 *   1. `@all` - not a person. The stored label, never anonymized.
 *   2. blocked, either direction - the anonymized phrase (F12). This comes
 *      BEFORE resolution on purpose: a blocked person must not be re-named by
 *      a lookup, and the reader must not be able to tell blocked from deleted
 *      from never-existed apart.
 *   3. looked up and GONE - the deleted placeholder. `deleteUser` hard-deletes
 *      the users row, so absence is the only signal there is.
 *   4. looked up and present - that person's name TODAY, which is what makes a
 *      rename propagate into old messages instead of freezing the old name.
 *   5. not looked up - the stored name, i.e. exactly today's behaviour. This
 *      is the safe fallback for a failed or pending request, and it is why
 *      `names` distinguishes "absent" from "unknown" at all.
 *
 * @param {{ name: string, userId: string }} mention
 * @param {object} options
 * @param {Set|null} options.blockedIds
 * @param {{ get: Function, has: Function }|null} options.names
 *   `has(id) === false` means not looked up; `get(id) === null` means looked up
 *   and gone; an object means looked up and present.
 * @param {Function|null} options.t
 * @returns {{ label: string, isAnonymized: boolean, isDeleted: boolean }}
 */
export const resolveMentionLabel = (
  mention,
  { blockedIds = null, names = null, t = null } = {},
) => {
  const stored = mention?.name ?? "";
  const userId = String(mention?.userId ?? "");

  if (userId === MENTION_ALL_ID) {
    return { label: stored, isAnonymized: false, isDeleted: false };
  }

  if (blockedIds?.has?.(userId) && t) {
    return {
      label: t("badges.card.privateProfile"),
      isAnonymized: true,
      isDeleted: false,
    };
  }

  // ⚠️ `has` before `get`: a Map returns undefined both for "never asked" and
  // for a stored undefined, and those two must not collapse.
  if (names?.has?.(userId)) {
    const person = names.get(userId);
    if (!person) {
      return {
        // ⚠️ t() or nothing. "Former Lomir User" is a WIRE value that both
        // repos compare against (utils/deletedUser.js) - printing the constant
        // here would put an untranslated English name on a German page, the
        // defect FE #660 just removed.
        label: t ? t("user.formerUser") : stored,
        isAnonymized: true,
        isDeleted: true,
      };
    }
    // 🔴 Runs of whitespace are COLLAPSED, not just trimmed, and that is
    // measured rather than tidy: `deletion-audit/14` section F found 10 of 90
    // stored mention tokens differing from the current name by spacing ALONE,
    // and F3 located the extra space on both sides - some in the token, some
    // in the `users` row itself. Resolving from the id renders the users row,
    // so without this collapse the fix would START printing "Anna  Kowalski"
    // into transcripts where the stored token read correctly. `.trim()` alone
    // does not reach an internal double space.
    //
    // ⚠️ `formatDisplayName` (utils/nameFormatters.js) is deliberately NOT used
    // here. It abbreviates middle names to initials once the name passes 18
    // characters, so a resolved mention would read "Anna M. Kowalski" where the
    // person typed "@Anna Maria Kowalski" - a resolution that renames people is
    // worse than a stale name. (It used to mangle a double-spaced long name
    // into "Anna . Kowalski" by splitting on a single space; FE #662 fixed
    // that at the helper. The abbreviation itself is still why this stays.)
    const current = `${person.firstName || ""} ${person.lastName || ""}`
      .replace(/\s+/g, " ")
      .trim();
    const label = current || person.username || stored;
    return { label, isAnonymized: false, isDeleted: false };
  }

  return { label: stored, isAnonymized: false, isDeleted: false };
};
