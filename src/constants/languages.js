/**
 * The languages Lomir is offered in.
 *
 * Kept as a list of objects rather than a pair of codes because everything
 * around it - the picker, the precedence chain, the country rule - is written
 * for n languages. A third language should be an entry here plus its
 * translation file, and nothing else.
 *
 * The backend keeps its own copy in `src/config/languages.js`: it needs the
 * same list for Joi validation and for choosing an email template, and the
 * two repos deploy separately. When a language is added, both change.
 */

export const DEFAULT_LANGUAGE_CODE = "en";

/**
 * `endonym` is what the picker shows first - the language's name in itself, the
 * way CountrySelect already lists countries by their native names. `names`
 * holds the same language's name in every language on offer, and the picker's
 * secondary line comes from there, so someone who does not read the endonym
 * can still tell what they are choosing.
 *
 * ⚠️ **The no-flags rule is withdrawn (Julia, 2026-09-05).** Flags now appear in
 * the navbar badge *and* in `LanguageSelect`, which is what the settings section
 * renders. The rule is rewritten here rather than left standing with a second
 * exception, because a rule with two exceptions is not a rule and the next
 * reader would not know which half to trust.
 *
 * **The objection it recorded still stands and is worth carrying:** a language
 * is not a country. 🇩🇪 next to "Deutsch" quietly tells Austrians and the Swiss
 * that this option is not for them, and `COUNTRY_LANGUAGE_MAP` below maps AT and
 * CH to German precisely because it is their language too. The counterweight is
 * that a round mark is recognisable at a glance where a word is not, and Julia
 * chose that trade twice, knowingly. `en` is drawn with the British flag rather
 * than the American one for the same reason the rule existed - there is no
 * correct answer, only a European default.
 *
 * The artwork is deliberately **not** a field on this list. It lives in
 * `src/components/common/LanguageFlag.jsx`, so adding a language here does not
 * silently commit anyone to drawing a flag, and a code with no artwork renders
 * nothing rather than a broken frame.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", endonym: "English", names: { en: "English", de: "Englisch" } },
  { code: "de", endonym: "Deutsch", names: { en: "German", de: "Deutsch" } },
];

/**
 * The second name a picker shows beside the endonym: this language's name in
 * the *other* language on offer. That is what makes the two rows read the same
 * way round - `English / Englisch` and `Deutsch / German` - rather than one
 * entry carrying two names and the other only one, which is how it looked when
 * the secondary name was always the English one (Julia, 2026-09-05).
 *
 * These names live here as data rather than in the locale files on purpose.
 * The rendering needs a *fixed* language, not the active one, and `t()` only
 * ever answers in the active language - reaching for `i18n.getFixedT` would
 * also put the lookup beyond what `npm run i18n:check` can verify. The set is
 * closed, small and changes only when a language is added, which is exactly
 * when this file is edited anyway.
 *
 * ⚠️ **Defined for exactly two languages.** With a third, "the other one" stops
 * naming anything and this has to become a deliberate choice - most likely the
 * name in the active interface language, omitted when it repeats the endonym.
 * The `names` map is already the right shape for that; only this function
 * changes. See `HANDOVER-Internationalization.md`.
 */
export const getSecondaryLanguageName = (code) => {
  const language = SUPPORTED_LANGUAGES.find((entry) => entry.code === code);
  const other = SUPPORTED_LANGUAGES.find((entry) => entry.code !== code);

  if (!language || !other) return null;

  const name = language.names?.[other.code];
  return name && name !== language.endonym ? name : null;
};

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

/**
 * Country (ISO 3166-1 alpha-2) -> language, for users who never chose one.
 *
 * CH and LI are a judgement call: Switzerland is multilingual, German is its
 * largest language, and the picker covers everyone this guesses wrong. LU and
 * BE are deliberately absent for the mirror-image reason - French and Dutch
 * majorities make German the wrong guess there.
 */
export const COUNTRY_LANGUAGE_MAP = {
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
};

/**
 * Below this many languages the picker is a plain list: a search box over two
 * rows is noise, and a "most common" heading over a list that is already the
 * whole list says nothing. Both appear on their own once the list grows.
 */
export const LANGUAGE_SEARCH_THRESHOLD = 8;

export const isSupportedLanguage = (code) =>
  typeof code === "string" && SUPPORTED_LANGUAGE_CODES.includes(code);

export const getLanguageByCode = (code) =>
  SUPPORTED_LANGUAGES.find((language) => language.code === code) || null;

/**
 * The language a country implies. `country` holds an ISO code everywhere in
 * Lomir (CountrySelect offers 209 of them, and the geocoding path maps names
 * back to codes before they are stored), so this is a lookup, not parsing.
 */
export const getLanguageForCountry = (countryCode) => {
  if (typeof countryCode !== "string") return DEFAULT_LANGUAGE_CODE;
  return (
    COUNTRY_LANGUAGE_MAP[countryCode.trim().toUpperCase()] ||
    DEFAULT_LANGUAGE_CODE
  );
};
