import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import SearchHelp from "./SearchHelp";

const MIN_QUERY_HINT = "Enter at least 2 characters";

/**
 * Enhanced Search Input with Boolean Search Support
 *
 * Features:
 * - Detects boolean operators and shows indicator
 * - Includes search help tooltip
 * - Validates query before submission
 */
const BooleanSearchInput = ({
  onSearch,
  initialQuery = "",
  placeholder = "Search teams and users...",
  className = "",
  activePills = [],
  onRemoveActivePill,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [hasBooleanOperators, setHasBooleanOperators] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  const inputRef = useRef(null);
  const queryMeasureRef = useRef(null);
  const placeholderMeasureRef = useRef(null);
  const hintMeasureRef = useRef(null);
  const [measuredTextWidths, setMeasuredTextWidths] = useState({
    query: 0,
    placeholder: 0,
    hint: 0,
  });
  const showMinQueryHint = query.trim().length > 0 && query.trim().length < 2;
  const minimumInputWidthPx = query.trim().length > 0 ? 132 : 180;
  const inputTextWidthPx = Math.max(
    minimumInputWidthPx,
    query.trim().length > 0
      ? measuredTextWidths.query + 8
      : measuredTextWidths.placeholder + 12,
  );
  const pillsWidthPx = activePills.reduce(
    (sum, pill) => sum + pill.label.length * 8 + 28,
    0,
  );
  const pillsGapPx = activePills.length > 1 ? (activePills.length - 1) * 4 : 0;
  const stackedPillsWidthPx = pillsWidthPx + pillsGapPx;
  const inlinePillsWidthPx =
    activePills.length > 0 ? pillsWidthPx + pillsGapPx + 8 : 0;
  const baseHelperWidthPx =
    24 +
    (hasBooleanOperators ? 72 : 0) +
    (showMinQueryHint ? measuredTextWidths.hint + 8 : 0);
  const fieldInsetsPx = baseHelperWidthPx + 28;
  const fieldInsetsWithInlinePillsPx =
    baseHelperWidthPx + inlinePillsWidthPx + 28;
  const estimatedFieldMaxWidthPx = Math.max(
    320,
    Math.min(viewportWidth - 16, 896) - 128,
  );
  const desiredSingleRowWidthPx =
    inputTextWidthPx + fieldInsetsWithInlinePillsPx;
  const canInlinePills =
    activePills.length > 0 &&
    !isCompactLayout &&
    desiredSingleRowWidthPx <= estimatedFieldMaxWidthPx;
  const showInlinePills = canInlinePills;
  const showStackedPills = activePills.length > 0 && !showInlinePills;
  const helperWidthPx = baseHelperWidthPx + (showInlinePills ? inlinePillsWidthPx : 0);
  const fieldRightPaddingPx = showStackedPills
    ? 48
    : Math.max(48, helperWidthPx + 16);
  const fieldWidthPx = Math.min(
    estimatedFieldMaxWidthPx,
    Math.max(
      inputTextWidthPx +
        (showInlinePills ? fieldInsetsWithInlinePillsPx : fieldInsetsPx),
      showStackedPills ? stackedPillsWidthPx + fieldInsetsPx : 0,
    ),
  );

  // Check if query contains boolean operators
  const checkBooleanOperators = useCallback((value) => {
    if (!value) return false;

    const upperValue = value.toUpperCase();
    const hasOperators =
      upperValue.includes(" AND ") ||
      upperValue.includes(" OR ") ||
      upperValue.includes(" NOT ") ||
      value.includes('"') ||
      value.includes("'") ||
      value.includes(" -") ||
      value.startsWith("-");

    return hasOperators;
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
    setHasBooleanOperators(checkBooleanOperators(initialQuery));
  }, [initialQuery, checkBooleanOperators]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateLayout = () => setIsCompactLayout(mediaQuery.matches);

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useLayoutEffect(() => {
    setMeasuredTextWidths({
      query: Math.ceil(queryMeasureRef.current?.getBoundingClientRect().width || 0),
      placeholder: Math.ceil(
        placeholderMeasureRef.current?.getBoundingClientRect().width || 0,
      ),
      hint: Math.ceil(hintMeasureRef.current?.getBoundingClientRect().width || 0),
    });
  }, [query, placeholder, showMinQueryHint]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHasBooleanOperators(checkBooleanOperators(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const rootClassName = isCompactLayout
    ? `min-w-0 w-full ${className}`
    : `inline-block max-w-full ${className}`;
  const formClassName = isCompactLayout
    ? "relative w-full min-w-0"
    : "relative inline-block max-w-full";
  const fieldSlotClassName = isCompactLayout
    ? "relative min-w-0 flex-1"
    : "relative max-w-full";
  const fieldClassName = isCompactLayout
    ? `w-full min-w-0 max-w-full rounded-lg border bg-base-100 px-3 py-2 pr-12 transition-colors ${
        hasBooleanOperators
          ? "border-primary"
          : "border-base-300 focus-within:border-primary"
      }`
    : `max-w-full rounded-lg border bg-base-100 px-3 py-2 pr-12 transition-colors ${
        hasBooleanOperators
          ? "border-primary"
          : "border-base-300 focus-within:border-primary"
      }`;
  const fieldStyle = isCompactLayout
    ? {
        width: "100%",
        maxWidth: "100%",
        paddingRight: `${fieldRightPaddingPx}px`,
      }
    : {
        width: `${fieldWidthPx}px`,
        maxWidth: "100%",
        paddingRight: `${fieldRightPaddingPx}px`,
      };
  const alignHelperToTopPillRow = showStackedPills;
  const helperControlsClassName = alignHelperToTopPillRow
    ? "absolute right-8 top-2 flex items-center gap-1 pointer-events-auto"
    : "absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-auto";
  const infoIconClassName = alignHelperToTopPillRow
    ? "absolute right-2 top-2 flex items-center pointer-events-auto"
    : "absolute inset-y-0 right-2 flex items-center pointer-events-auto";

  return (
    <div className={rootClassName}>
      <form onSubmit={handleSubmit} className={formClassName}>
        <div className="flex max-w-full items-center gap-2">
          <div className={fieldSlotClassName}>
            <div className={fieldClassName} style={fieldStyle}>
              {showStackedPills && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {activePills.map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => onRemoveActivePill?.(pill.key)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[#f0fdf4] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary-focus)] hover:bg-[#dcfce7] hover:text-[var(--color-primary-focus)]"
                      title={`Remove ${pill.label}`}
                    >
                      <span>{pill.label}</span>
                      <span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
              )}

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full min-w-0 bg-transparent text-sm focus:outline-none"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                minLength={2}
              />
            </div>

            <div className={helperControlsClassName}>
              {showMinQueryHint && (
                <span className="text-xs text-warning whitespace-nowrap">
                  {MIN_QUERY_HINT}
                </span>
              )}
              {showInlinePills &&
                activePills.map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => onRemoveActivePill?.(pill.key)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[#f0fdf4] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary-focus)] hover:bg-[#dcfce7] hover:text-[var(--color-primary-focus)]"
                    title={`Remove ${pill.label}`}
                  >
                    <span>{pill.label}</span>
                    <span aria-hidden="true">x</span>
                  </button>
                ))}
              {hasBooleanOperators && (
                <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                  Advanced
                </span>
              )}
            </div>

            <div className={infoIconClassName}>
              <SearchHelp anchorRef={inputRef} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={query.trim().length < 2}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        <div className="pointer-events-none absolute left-0 top-0 -z-10 invisible whitespace-pre text-sm">
          <span ref={queryMeasureRef}>{query || " "}</span>
        </div>
        <div className="pointer-events-none absolute left-0 top-0 -z-10 invisible whitespace-pre text-sm">
          <span ref={placeholderMeasureRef}>{placeholder || " "}</span>
        </div>
        <div className="pointer-events-none absolute left-0 top-0 -z-10 invisible whitespace-pre text-xs">
          <span ref={hintMeasureRef}>{MIN_QUERY_HINT}</span>
        </div>
      </form>
    </div>
  );
};

export default BooleanSearchInput;
