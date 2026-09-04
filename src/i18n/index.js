/**
 * i18next setup for Lomir.
 *
 * Imported once, for its side effect, from `main.jsx` before the app renders.
 * `LanguageProvider` is what decides *which* language is active; this file
 * only builds the instance and loads the strings.
 *
 * ⚠️ No language detector plugin, deliberately.
 *
 * `resolveLanguage()` in `src/utils/languageUtils.js` already implements the
 * project's precedence chain - explicit choice, then the profile country,
 * then the browser, then English. `i18next-browser-languagedetector` would be
 * a second rule for the same question, and the two would disagree the moment
 * a German user picks English: the detector reads only the browser and knows
 * nothing about the account. One rule, in one place.
 *
 * This is the same defect that already exists once in the codebase -
 * `dateHelpers.js` derives its own locale from the profile country and does
 * not know about `preferred_language`. That one is Phase 0.5's job to remove;
 * this file must not add a third.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ICU from "i18next-icu";

import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
} from "../constants/languages";

import enCommon from "../locales/en/common.json";
import deCommon from "../locales/de/common.json";

/** Strings shared across pages. Page namespaces arrive with Phase 1. */
export const DEFAULT_NAMESPACE = "common";

/**
 * Bundled statically because `common` is needed on every page - lazy-loading
 * it would only add a request to the critical path. The per-page namespaces
 * of Phase 1 are the ones that want lazy loading, and they will need a
 * backend (`i18next-resources-to-backend` over Vite's dynamic import) at that
 * point. Nothing is built for it here: two files do not need a loader.
 */
const resources = {
  en: { [DEFAULT_NAMESPACE]: enCommon },
  de: { [DEFAULT_NAMESPACE]: deCommon },
};

i18n
  // ICU from the start. Adding it later means revisiting every string that
  // carries a placeholder - and it is the format translation tools speak,
  // which matters the moment a TMS is introduced. Placeholders are always
  // named, never positional: a translator has to be able to reorder them.
  .use(new ICU())
  .use(initReactI18next)
  .init({
    resources,
    // The starting language, not a guess. LanguageProvider applies the
    // resolved one in an effect; until it runs, English is what renders.
    lng: DEFAULT_LANGUAGE_CODE,
    fallbackLng: DEFAULT_LANGUAGE_CODE,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    // `load: "languageOnly"` is the fallback chain the plan asks for -
    // de-AT -> de -> en - without a lookup table: the region is dropped, then
    // fallbackLng catches what is left. de-CH and de-LI ride along for free.
    load: "languageOnly",
    ns: [DEFAULT_NAMESPACE],
    defaultNS: DEFAULT_NAMESPACE,
    // React escapes interpolated values already; escaping twice turns an
    // apostrophe into &#39; on screen.
    interpolation: { escapeValue: false },
    // Resources are bundled, so there is nothing to suspend on. Leaving
    // Suspense on would make every t() a potential blank screen for no gain.
    react: { useSuspense: false },
  });

export default i18n;
