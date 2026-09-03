import {
  DEFAULT_LANGUAGE_CODE,
  getLanguageForCountry,
  isSupportedLanguage,
} from "../constants/languages";

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
