/**
 * The words that act as search operators, per interface language.
 *
 * The backend knows ONE spelling, `AND`, `OR`, `NOT` in capitals, and no
 * language (BE `classifyToken`). The words of the interface language live in
 * the locale files (`searchOperators.*`); a language needs three translations
 * and no backend change. Before a query is sent, `canonicalizeOperators` turns
 * those words into the English ones. The English words always work, in every
 * language, so queries and links written with them stay valid.
 *
 * Operators are CAPITALS only (Julia, 2026-10-09): `und`, `oder`, `and`, `or`
 * are ordinary words, and a lowercase one is searched for like any other word.
 *
 * ⚠️ Choose the words of a new language so that the three differ from each
 * other and are not a common word in capitals (Spanish `Y`, `O`, `NO` would be).
 */

export const CANONICAL_OPERATORS = ["AND", "OR", "NOT"];

/** { AND, OR, NOT } in the language of `t`. Literal keys, so i18n:check sees them. */
export const getOperatorWords = (t) => ({
  AND: t("searchOperators.and"),
  OR: t("searchOperators.or"),
  NOT: t("searchOperators.not"),
});

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Not `\b`: it only knows ASCII letters, and a word of another language may not.
const NOT_WORD_BEFORE = "(?<![\\p{L}\\p{N}_])";
const NOT_WORD_AFTER = "(?![\\p{L}\\p{N}_])";

/** The regex source that matches any operator word: the language's own and the English ones. */
export const operatorAlternation = (words) => {
  const all = new Set([...CANONICAL_OPERATORS, ...Object.values(words)]);
  return [...all]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
};

/** A whole operator word anywhere in a text. `flags` may add "g"; "u" is always set. */
export const buildOperatorPattern = (words, flags = "") =>
  new RegExp(
    `${NOT_WORD_BEFORE}(?:${operatorAlternation(words)})${NOT_WORD_AFTER}`,
    `u${flags}`,
  );

/** A whole operator word at the start of a text, with the spaces around it. */
export const buildLeadingOperatorPattern = (words) =>
  new RegExp(
    `^\\s*(?:${operatorAlternation(words)})${NOT_WORD_AFTER}\\s*`,
    "u",
  );

/** An operator word between two spaces, as the input's "advanced" hint needs it. */
export const buildInnerOperatorPattern = (words) =>
  new RegExp(`\\s(?:${operatorAlternation(words)})\\s`, "u");

/**
 * Rewrites the operator words of the interface language to AND / OR / NOT.
 *
 * Splits the way the backend tokenizer does: on spaces, outside quotes (both `"`
 * and `'`), and only a WHOLE token that equals a word is replaced. A phrase such
 * as `"rock UND roll"` is left alone, and so is a word that merely contains one.
 */
export const canonicalizeOperators = (query, words) => {
  if (!query) return query;

  const toCanonical = new Map();
  for (const canonical of CANONICAL_OPERATORS) {
    if (words[canonical]) toCanonical.set(words[canonical], canonical);
  }
  if (toCanonical.size === 0) return query;

  let out = "";
  let token = "";
  let inQuotes = false;

  const flush = () => {
    out += toCanonical.get(token) ?? token;
    token = "";
  };

  for (const char of query) {
    if (char === '"' || char === "'") {
      if (!inQuotes) flush();
      inQuotes = !inQuotes;
      out += char;
    } else if (inQuotes) {
      out += char;
    } else if (char === " ") {
      flush();
      out += char;
    } else {
      token += char;
    }
  }
  flush();

  return out;
};

/** How an operator the backend names (AND / OR / NOT) is shown to this reader. */
export const localizeOperator = (operator, words) => words[operator] ?? operator;
