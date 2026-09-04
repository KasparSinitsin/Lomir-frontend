import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import Tooltip from "../common/Tooltip";
import LanguageFlag from "./LanguageFlag";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  LANGUAGE_FEATURE_VISIBLE,
  SUPPORTED_LANGUAGES,
} from "../../constants/languages";

/**
 * The navbar language control, for signed-out visitors only.
 *
 * `LanguageContext` has described `setLanguage` as "the navbar picker's entry
 * point" since Phase 0, and until this component nothing called it - the
 * context had no consumer at all. This is that consumer, and the whole of it.
 *
 * ⚠️ **Signed-in users do not get this control** (Julia, 2026-09-04). They set
 * their language in Settings, where it is stored on the account and survives
 * every sign-in until they change it deliberately. A second entry point in the
 * navbar would write the same field from two places for no gain.
 *
 * That is also why nothing here talks to the API: for a signed-out visitor
 * `localStorage` is the only place a preference can live, and `setLanguage`
 * writes it. A signed-out choice is not lost at sign-in either - the
 * precedence chain falls back to the stored value whenever the account has
 * none.
 *
 * Deliberately not `LanguageSelect`. That component is a searchable combobox
 * built for a long list, and the project's own `LANGUAGE_SEARCH_THRESHOLD` of
 * 8 says a list this short should not have a search box at all. A menu is
 * also what the navbar already speaks, right beside the avatar dropdown.
 *
 * ⚠️ Renders nothing while LANGUAGE_FEATURE_VISIBLE is false, like every
 * other surface of this feature.
 */
const NavbarLanguageMenu = ({ className = "" }) => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const dropdownRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeEndonym =
    SUPPORTED_LANGUAGES.find((entry) => entry.code === language)?.endonym ??
    language.toUpperCase();

  if (!LANGUAGE_FEATURE_VISIBLE) return null;
  if (isAuthenticated) return null;

  const selectLanguage = (code) => {
    document.activeElement?.blur(); // closes the dropdown
    if (code !== language) setLanguage(code);
  };

  const handleBlur = (event) => {
    if (!dropdownRef.current?.contains(event.relatedTarget)) {
      setIsMenuOpen(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`dropdown dropdown-end ${className}`}
      onFocusCapture={() => setIsMenuOpen(true)}
      onBlurCapture={handleBlur}
    >
      <Tooltip
        content={isMenuOpen ? null : t("nav.languageSettings")}
        position="bottom"
        /* Block-level, not the default inline-flex: an inline box here builds
           a line box, and its strut reserves space for descenders that a flag
           and two capitals do not have, which lifts the control off centre.
           It must not go on the .dropdown wrapper - that moves the menu. */
        wrapperClassName="flex items-center"
      >
        <div
          role="button"
          tabIndex={0}
          /*
            The name carries the current value, not just the purpose. Two
            reasons, and the first applies on desktop as much as on a phone:

            - `aria-label` REPLACES the content, so the visible "DE" was never
              in the accessible name at all. WCAG 2.5.3 (Label in Name, A)
              wants the visible text to appear in the name, which is why the
              code is repeated in brackets.
            - Without the value, a screen reader hears "Sprache, Schaltfläche"
              and cannot tell which language is active - and on a phone there
              is now no visible code either.

            `aria-expanded` replaces `aria-haspopup="menu"`: that attribute
            promises menu semantics, which means arrow-key navigation and
            role="menuitem" children. This is a disclosure - a button that
            reveals a list of buttons, each reachable with Tab - so it says
            so honestly instead.
          */
          aria-label={t("nav.languageCurrent", {
            language: activeEndonym,
            code: language.toUpperCase(),
          })}
          aria-expanded={isMenuOpen}
          /*
            min-h-6 min-w-6 is the WCAG 2.2 minimum target of 24x24 CSS px
            (2.5.8, AA). The badge itself is 20px, and with the code hidden
            below sm the control would otherwise be a 20px tap target.
          */
          className="flex min-h-6 min-w-6 items-center justify-center gap-1 text-[var(--color-primary)] hover:text-[var(--color-primary-focus)] hover:drop-shadow-neon transition duration-200 cursor-pointer"
        >
          {/*
            Framed the way the avatar next to it is: a round box with
            overflow-hidden, and the artwork covering it rather than fitting
            inside it. 20px rather than the 22px of the lucide icons beside it,
            because a filled disc reads heavier than an open outline.
          */}
          <span className="block h-5 w-5 shrink-0 overflow-hidden rounded-full">
            <LanguageFlag code={language} />
          </span>
          {/* The code, not the endonym: it has to stay narrow in the navbar,
              and it is an indicator rather than the choice itself. */}
          <span className="flex h-5 items-center pt-px text-sm font-medium leading-none">
            {language.toUpperCase()}
          </span>
        </div>
      </Tooltip>

      <ul
        tabIndex={0}
        className="mt-3 z-[1] p-2 menu menu-sm dropdown-content w-auto language-dropdown"
      >
        {SUPPORTED_LANGUAGES.map((entry) => {
          const isActive = entry.code === language;
          return (
            <li key={entry.code}>
              <button
                type="button"
                onClick={() => selectLanguage(entry.code)}
                aria-current={isActive ? "true" : undefined}
                className={isActive ? "font-medium" : ""}
              >
                {/* Endonyms are the same in both translation files by
                    design - a language names itself. */}
                {entry.endonym}
                {/*
                  One slot of a fixed width on every row, so the endonyms end
                  on the same edge - `.language-dropdown` pushes the content
                  flush right, so a row whose slot were empty would end where
                  the other row's mark ends and the words would sit staggered.

                  The mark itself says which state the row is in: a check on
                  the chosen language, that language's flag on the ones on
                  offer. The check is drawn heavier than the lucide default
                  (3 rather than 2) so an outline holds its own beside a
                  filled disc of the same size.
                */}
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center"
                >
                  {isActive ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <span className="block h-4 w-4 overflow-hidden rounded-full">
                      <LanguageFlag code={entry.code} />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NavbarLanguageMenu;
