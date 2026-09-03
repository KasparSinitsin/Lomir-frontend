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
 * `endonym` is what the picker shows - the language's name in itself, the way
 * CountrySelect already lists countries by their native names. `englishName`
 * is the secondary line, so someone who does not read the endonym can still
 * tell what they are choosing.
 *
 * No flags. A language is not a country: 🇩🇪 next to "Deutsch" quietly tells
 * Austrians and the Swiss that this option is not for them.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "en", endonym: "English", englishName: "English" },
  { code: "de", endonym: "Deutsch", englishName: "German" },
];

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

/**
 * The reveal switch for the whole feature.
 *
 * A visible language picker over an untranslated UI reads as a broken
 * feature, not as work in progress - the same defect as a dropdown offering
 * French and then rendering English. The controls are built and wired; they
 * become visible when the shell is actually translated (Phase 1).
 *
 * While this is false, the language is also not *sent* on save or
 * registration. Storing a value the user was never shown would turn a guess
 * into an explicit choice behind their back.
 */
export const LANGUAGE_FEATURE_VISIBLE = false;

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
