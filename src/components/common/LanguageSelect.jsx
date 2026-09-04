import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_SEARCH_THRESHOLD,
  getLanguageByCode,
} from "../../constants/languages";

/**
 * LanguageSelect
 *
 * A dropdown over the languages Lomir actually offers. Close relative of
 * CountrySelect - same shell, same keyboard handling, same clear-on-close
 * behaviour - but deliberately smaller: it lists what exists rather than
 * filtering 209 entries, and it has no flags, because a language is not a
 * country.
 *
 * It renders as a plain list while there are few languages and grows a search
 * field on its own past LANGUAGE_SEARCH_THRESHOLD. That is the whole reason
 * this is a selector and not a two-state toggle: a toggle would have to be
 * rebuilt for language three.
 *
 * Unlike CountrySelect there is no clear button. "No language" is not a state
 * the app can render - it would fall back to a guess the user just rejected -
 * so the control always holds a value.
 *
 * @param {Object} props
 * @param {string} props.value - selected language code
 * @param {Function} props.onChange - receives a synthetic { target: { name, value } }
 * @param {string} props.name - form field name
 * @param {boolean} props.disabled
 * @param {string} props.className
 * @param {string} props.id - ties the control to its <label>
 */
const LanguageSelect = ({
  value,
  onChange,
  name = "preferredLanguage",
  disabled = false,
  className = "",
  id,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const showSearch = SUPPORTED_LANGUAGES.length > LANGUAGE_SEARCH_THRESHOLD;
  const selectedLanguage = getLanguageByCode(value);

  const filteredLanguages = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!showSearch || !search) return SUPPORTED_LANGUAGES;

    return SUPPORTED_LANGUAGES.filter(
      (language) =>
        language.endonym.toLowerCase().includes(search) ||
        language.englishName.toLowerCase().includes(search) ||
        language.code.toLowerCase() === search,
    );
  }, [searchTerm, showSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll the highlighted row into view (only reachable once the list is long
  // enough to scroll, but the cost of keeping it is a single query selector).
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`,
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const close = () => {
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleSelect = (language) => {
    onChange({ target: { name, value: language.code } });
    close();
  };

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(
      Math.max(
        0,
        SUPPORTED_LANGUAGES.findIndex((language) => language.code === value),
      ),
    );
    if (showSearch) setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        open();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((index) =>
          Math.min(index + 1, filteredLanguages.length - 1),
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredLanguages[highlightedIndex]) {
          handleSelect(filteredLanguages[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        className={`
          select select-bordered w-full flex items-center justify-between cursor-pointer
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isOpen ? "border-primary" : ""}
        `}
      >
        {isOpen && showSearch ? (
          <div className="flex items-center flex-1 gap-2">
            <Search size={16} className="text-base-content/50 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t("languageSelect.searchPlaceholder")}
              className="flex-1 bg-transparent outline-none text-sm min-w-0"
              autoComplete="off"
            />
          </div>
        ) : (
          <span className="truncate">
            {selectedLanguage ? (
              <>
                <span>{selectedLanguage.endonym}</span>
                {selectedLanguage.endonym !== selectedLanguage.englishName && (
                  <span className="text-base-content/50 ml-2 text-sm">
                    {selectedLanguage.englishName}
                  </span>
                )}
              </>
            ) : (
              <span className="text-base-content/50">
                {t("languageSelect.placeholder")}
              </span>
            )}
          </span>
        )}

        <ChevronDown
          size={16}
          className={`text-base-content/50 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div
          ref={listRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredLanguages.length === 0 ? (
            <div className="px-3 py-4 text-center text-base-content/50 text-sm">
              {t("languageSelect.noResults")}
            </div>
          ) : (
            filteredLanguages.map((language, index) => {
              const isSelected = language.code === value;

              return (
                <div
                  key={language.code}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(language)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center justify-between transition-colors
                    ${highlightedIndex === index ? "bg-primary/10" : "hover:bg-base-200"}
                    ${isSelected ? "bg-primary/5 font-medium" : ""}
                  `}
                >
                  <span className="truncate">
                    <span>{language.endonym}</span>
                    {language.endonym !== language.englishName && (
                      <span className="text-base-content/50 ml-2 text-sm">
                        {language.englishName}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check size={16} className="text-primary flex-shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageSelect;
