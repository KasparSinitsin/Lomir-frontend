import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import {
  DEFAULT_LANGUAGE_CODE,
  LANGUAGE_FEATURE_VISIBLE,
  isSupportedLanguage,
} from "../constants/languages";
import {
  readStoredLanguage,
  resolveLanguage,
  writeStoredLanguage,
} from "../utils/languageUtils";

const LanguageContext = createContext(null);

/**
 * LanguageProvider
 *
 * The piece that turns a stored preference into the language the app is
 * actually rendered in. `resolveLanguage()` has implemented the precedence
 * chain since Phase 0 but nothing consumed it; this is its one consumer.
 *
 * Must sit inside AuthProvider - the account's `preferredLanguage` outranks
 * everything else in that chain, and it arrives with the user.
 *
 * ⚠️ While LANGUAGE_FEATURE_VISIBLE is false the app stays English, on
 * purpose. Resolution still runs and is exposed as `resolvedLanguage`, so the
 * chain can be inspected and tested, but nothing is applied: a German browser
 * would otherwise get <html lang="de"> over an untranslated English UI, which
 * mainly tells a screen reader to mispronounce every word on the page. Same
 * reasoning as the hidden picker - the feature turns on in one place, when
 * the shell is actually translated.
 */
export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  // localStorage is not reactive, so the logged-out choice has to pass
  // through state or writing it would not re-render anything. This mirror is
  // why `resolveLanguage` is called with includeStored: false below - reading
  // the value twice would work, but it would hide where the update comes from.
  const [storedLanguage, setStoredLanguage] = useState(readStoredLanguage);

  const resolvedLanguage = useMemo(
    () =>
      resolveLanguage({
        // The account wins over this browser; the stored value is the
        // logged-out stand-in. Both are "an explicit choice", step 1 of the
        // chain, which is why they share one argument.
        preferredLanguage: user?.preferredLanguage || storedLanguage,
        country: user?.country,
        includeStored: false,
      }),
    [user?.preferredLanguage, user?.country, storedLanguage],
  );

  const activeLanguage = LANGUAGE_FEATURE_VISIBLE
    ? resolvedLanguage
    : DEFAULT_LANGUAGE_CODE;

  useEffect(() => {
    if (i18n.language !== activeLanguage) {
      i18n.changeLanguage(activeLanguage);
    }
    // Drives screen-reader pronunciation, hyphenation and search engines.
    // index.html hardcodes "en"; from here on the document says what it is.
    document.documentElement.lang = activeLanguage;
  }, [activeLanguage, i18n]);

  /**
   * Carry an account language back into this browser.
   *
   * Without it the shell renders English on every first paint until
   * /api/auth/me answers, and the user watches their own setting apply a
   * moment late on every visit. Inert while the feature is hidden: nothing
   * writes `preferred_language` yet, so every account value is NULL.
   */
  useEffect(() => {
    const accountLanguage = user?.preferredLanguage;
    if (!isSupportedLanguage(accountLanguage)) return;
    if (accountLanguage === storedLanguage) return;
    writeStoredLanguage(accountLanguage);
    setStoredLanguage(accountLanguage);
  }, [user?.preferredLanguage, storedLanguage]);

  /**
   * Record an explicit choice. This is the navbar picker's entry point; the
   * profile form writes to the account instead and arrives here through
   * `user.preferredLanguage`.
   *
   * Only ever called with a value the user actually picked. Persisting a
   * guess would promote it to step 1 of the chain and outrank the country
   * rule from then on - the mistake this feature has already corrected once.
   */
  const setLanguage = useCallback((code) => {
    if (!isSupportedLanguage(code)) return;
    writeStoredLanguage(code);
    setStoredLanguage(code);
  }, []);

  const value = useMemo(
    () => ({
      /** What the app is rendered in right now. */
      language: activeLanguage,
      /** What the chain says it should be - equal to `language` once the
       *  feature is visible, and the only difference while it is not. */
      resolvedLanguage,
      setLanguage,
      isEnabled: LANGUAGE_FEATURE_VISIBLE,
    }),
    [activeLanguage, resolvedLanguage, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
