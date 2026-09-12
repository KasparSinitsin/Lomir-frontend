import i18n from "../i18n";
import {
  DEFAULT_LANGUAGE_CODE,
  getLanguageForCountry,
  isSupportedLanguage,
} from "../constants/languages";

/**
 * The *formatting locale*, for Intl - not the translation language.
 *
 * Two different things, and conflating them was a real bug. Translation keys
 * hang off the language ("en", "de"); how a date, a time or a number is
 * *shaped* is a regional convention, which needs a full BCP-47 locale. A bare
 * "en" is not neutral: CLDR resolves it to US conventions.
 *
 * Distinct from resolveLanguage(): that one *decides*, from the account, the
 * browser and the country. This one only reports what was decided, and it is
 * what every Intl formatter in the app has to be built with - dates, numbers
 * and distances must not answer this question for themselves. dateHelpers.js
 * used to, from its own country sets, and disagreed with the picker.
 *
 * ⚠️ English maps to en-GB, decided by Julia 2026-09-12, and it is a FIXED
 * mapping rather than one derived from the user's country. An American reading
 * the English UI therefore gets British formats; that is accepted, not an
 * oversight. The deciding argument was consistency between the two languages,
 * and it pointed away from the bare "en" - for 6 April 2026:
 *
 *   en      04/06/26   MDY   02:30 PM     <- what this used to return
 *   en-GB   06/04/26   DMY   14:30
 *   de      06.04.26   DMY   14:30
 *
 * All three are 8 characters wide, so layout never distinguished them. Field
 * order did: "en" is MDY against German's DMY, so the two looked alike and
 * meant different things - the same day with the digits transposed, which is
 * the least visible kind of inconsistency. en-GB matches German's order and
 * differs only in the separator.
 *
 * ⚠️ Always state the reference date when comparing these. An older note in
 * dateHelpers.js worked from 4 June and a table in STATUS.md from 6 April,
 * which made two correct statements look contradictory.
 *
 * ⚠️ This also moved English to a 24-hour clock, on every chat timestamp
 * (34 call sites through formatLocalTime). Deliberate, and confirmed by Julia:
 * German already read "14:05 Uhr", so English "14:05" is the parallel form.
 * Nothing forces hour12 in code - Intl derives it from the locale, which is
 * how it is meant to work.
 */
const FORMATTING_LOCALES = {
  en: "en-GB",
  de: "de-DE",
};

export const getActiveLocale = () => {
  // i18next runs with load: "languageOnly" and supportedLngs ["en","de"], so
  // this is "en" or "de" in practice. The subtag is still stripped rather than
  // trusted: a regional value reaching Intl unmapped would silently restore
  // the very US default this function exists to avoid.
  const language = String(i18n.language || DEFAULT_LANGUAGE_CODE)
    .split(/[-_]/)[0]
    .toLowerCase();

  return FORMATTING_LOCALES[language] || FORMATTING_LOCALES[DEFAULT_LANGUAGE_CODE];
};

/**
 * Where a logged-out visitor's choice lives. Logged-in users have
 * `preferred_language` on their account, which follows them across devices;
 * this is the pre-login stand-in and the anonymous visitor's only option.
 */
export const LANGUAGE_STORAGE_KEY = "lomir.language";

/**
 * localStorage throws in a few real situations - Safari private mode, storage
 * disabled by policy - and a language preference is never worth taking the
 * page down for.
 */
export const readStoredLanguage = () => {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
};

/**
 * Forget this browser's language preference.
 *
 * Called on sign-out. `writeStoredLanguage(null)` would do the same thing,
 * but the intent at the call site is "forget", not "write nothing", and a
 * reader should not have to know that an unsupported code clears the key.
 */
export const clearStoredLanguage = () => {
  try {
    window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // Same reasoning as the writer: never take the page down for this.
  }
};

export const writeStoredLanguage = (code) => {
  try {
    if (isSupportedLanguage(code)) {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } else {
      window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    }
  } catch {
    // Nothing to do - the choice simply does not survive this session.
  }
};

/**
 * The language the browser reports, reduced to a supported code.
 *
 * Only the language subtag is used: "de-AT" and "de-CH" are both German as
 * far as this app is concerned, and matching the full tag would drop them.
 */
export const getBrowserLanguage = () => {
  if (typeof navigator === "undefined") return null;

  const locales = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  for (const locale of locales) {
    const subtag = String(locale).split(/[-_]/)[0]?.toLowerCase();
    if (isSupportedLanguage(subtag)) return subtag;
  }

  return null;
};

/**
 * Which language to show the app in, in the order the project decided:
 *
 *   1. an explicit choice - the account's `preferredLanguage`, or the
 *      localStorage value while logged out
 *   2. the country in the profile
 *   3. the browser language
 *   4. English
 *
 * Step 1 has to win permanently. If the country rule re-applied on every
 * login it would silently undo what the user picked, which is the classic
 * bug in this corner of an app.
 *
 * @param {Object} options
 * @param {string|null} options.preferredLanguage - the account's stored choice
 * @param {string|null} options.country - ISO code from the profile
 * @param {boolean} options.includeStored - consult localStorage (default true;
 *   pass false to resolve purely from an account, ignoring this browser)
 */
export const resolveLanguage = ({
  preferredLanguage = null,
  country = null,
  includeStored = true,
} = {}) => {
  if (isSupportedLanguage(preferredLanguage)) return preferredLanguage;

  if (includeStored) {
    const stored = readStoredLanguage();
    if (stored) return stored;
  }

  if (country) return getLanguageForCountry(country);

  return getBrowserLanguage() || DEFAULT_LANGUAGE_CODE;
};

/**
 * What the picker should show before the user touches it.
 *
 * Distinct from `resolveLanguage` on purpose: this returns the language the
 * app *is* displaying, but the caller still knows whether that came from an
 * actual choice (`hasExplicitChoice`) or from a guess. Only a choice may be
 * written to the account - persisting a guess would freeze it as explicit and
 * outrank the country rule forever after.
 */
export const describeLanguageSelection = ({
  preferredLanguage = null,
  country = null,
} = {}) => {
  const explicit =
    (isSupportedLanguage(preferredLanguage) && preferredLanguage) ||
    readStoredLanguage();

  return {
    value: resolveLanguage({ preferredLanguage, country }),
    hasExplicitChoice: Boolean(explicit),
  };
};
