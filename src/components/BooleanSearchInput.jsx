import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Tag, Award, UserSearch, Users, X, Layers } from "lucide-react";
import SearchHelp from "./SearchHelp";
import {
  getBadgeIcon,
  getCategoryIcon,
  SUPERCATEGORY_ICONS,
} from "../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  FOCUS_GREEN,
} from "../constants/badgeConstants";

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MIN_QUERY_HINT = "Enter at least 2 characters";

/**
 * Enhanced Search Input with Boolean Search Support
 *
 * Features:
 * - Detects boolean operators and shows indicator
 * - Includes search help tooltip
 * - Validates query before submission
 * - Suggestion dropdown for focus areas (tags) and badges
 * - Filter pills for focus areas, badges, and active criteria
 */
const BooleanSearchInput = ({
  onSearch,
  initialQuery = "",
  placeholder = "Search teams and users...",
  className = "",
  activePills = [],
  onRemoveActivePill,
  onSearchSuggestions,
  focusAreaPills = [],
  badgePills = [],
  onRemoveFocusAreaPill,
  onRemoveBadgePill,
  onSelectTagSuggestion,
  onSelectBadgeSuggestion,
  leftAdornment = null,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [hasBooleanOperators, setHasBooleanOperators] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  const [suggestions, setSuggestions] = useState({ tags: [], badges: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredItemKey, setHoveredItemKey] = useState(null);

  const inputRef = useRef(null);
  const fieldRef = useRef(null);
  const queryMeasureRef = useRef(null);
  const placeholderMeasureRef = useRef(null);
  const hintMeasureRef = useRef(null);
  const dropdownRef = useRef(null);
  const suggestionsTimerRef = useRef(null);

  const [menuStyle, setMenuStyle] = useState({
    position: "fixed",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "max-content",
    maxWidth: 500,
    maxHeight: 240,
    zIndex: 10000,
    arrowTop: 0,
    arrowLeft: 0,
  });
  const [menuPlacement, setMenuPlacement] = useState("bottom");

  const DROPDOWN_EDGE_MARGIN = 8;
  const DROPDOWN_GAP = 16;
  const DROPDOWN_MIN_HEIGHT = 140;
  const DROPDOWN_MAX_HEIGHT = 360;

  // content-container has padding: 1rem (16px) each side
  const CONTENT_CONTAINER_PADDING = 16;

  const computeDropdownPosition = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    const containerEl = document.querySelector(".content-container");
    const containerRect = containerEl?.getBoundingClientRect();
    const containerW = containerRect?.width ?? viewportW;
    const containerCenterX = containerRect
      ? containerRect.left + containerRect.width / 2
      : viewportW / 2;

    const spaceBelow = viewportH - (rect.bottom + DROPDOWN_GAP) - DROPDOWN_EDGE_MARGIN;
    const spaceAbove = rect.top - DROPDOWN_GAP - DROPDOWN_EDGE_MARGIN;
    let placement = spaceBelow >= spaceAbove ? "bottom" : "top";
    if (spaceBelow >= DROPDOWN_MIN_HEIGHT && spaceAbove < DROPDOWN_MIN_HEIGHT) placement = "bottom";
    if (spaceAbove >= DROPDOWN_MIN_HEIGHT && spaceBelow < DROPDOWN_MIN_HEIGHT) placement = "top";
    const available = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(DROPDOWN_MAX_HEIGHT, Math.max(80, available));
    const left = Math.max(DROPDOWN_EDGE_MARGIN, rect.left);
    const top = placement === "bottom" ? rect.bottom + DROPDOWN_GAP : rect.top - DROPDOWN_GAP - maxHeight;
    const inputCenterX = rect.left + rect.width / 2;
    return { placement, top, left, maxHeight, viewportW, inputCenterX, containerW, containerCenterX };
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const base = computeDropdownPosition();
    if (!base) return;
    setMenuPlacement(base.placement);
    const maxDropdownWidth = Math.min(500, base.containerW - CONTENT_CONTAINER_PADDING * 2);
    setMenuStyle({
      position: "fixed",
      top: base.top,
      left: base.containerCenterX,
      transform: "translateX(-50%)",
      width: "max-content",
      maxWidth: maxDropdownWidth,
      maxHeight: base.maxHeight,
      zIndex: 10000,
      arrowTop: base.placement === "bottom" ? base.top - 11 : base.top,
      arrowLeft: base.inputCenterX,
    });
  }, [computeDropdownPosition]);

  const refineDropdownTop = useCallback(() => {
    if (!showDropdown || menuPlacement !== "top") return;
    const el = fieldRef.current;
    const menuEl = dropdownRef.current;
    if (!el || !menuEl) return;
    const rect = el.getBoundingClientRect();
    const actualHeight = Math.min(menuEl.scrollHeight, menuStyle.maxHeight);
    const correctedTop = Math.max(DROPDOWN_EDGE_MARGIN, rect.top - DROPDOWN_GAP - actualHeight);
    setMenuStyle((prev) => ({
      ...prev,
      top: correctedTop,
      arrowTop: correctedTop + actualHeight - 1,
    }));
  }, [showDropdown, menuPlacement, menuStyle.maxHeight]);

  useLayoutEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();
    const id = requestAnimationFrame(() => refineDropdownTop());
    return () => cancelAnimationFrame(id);
  }, [showDropdown, updateDropdownPosition, refineDropdownTop, suggestions.tags.length, suggestions.badges.length]);

  useEffect(() => {
    if (!showDropdown) return;
    let raf = 0;
    const tick = () => {
      updateDropdownPosition();
      refineDropdownTop();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showDropdown, updateDropdownPosition, refineDropdownTop]);

  const [measuredTextWidths, setMeasuredTextWidths] = useState({
    query: 0,
    placeholder: 0,
    hint: 0,
  });

  const showMinQueryHint = query.trim().length > 0 && query.trim().length < 2;
  const hasLeftAdornment = Boolean(leftAdornment);
  const leftAdornmentWidthPx = hasLeftAdornment ? 24 : 0;
  const minimumInputWidthPx = query.trim().length > 0 ? 132 : 180;
  const inputTextWidthPx = Math.max(
    minimumInputWidthPx,
    query.trim().length > 0
      ? measuredTextWidths.query + 8
      : measuredTextWidths.placeholder + 12,
  ) + leftAdornmentWidthPx;

  // Combined pill width calculations across all three groups
  const allPills = [...badgePills, ...focusAreaPills, ...activePills];
  const totalPillCount = allPills.length;
  const pillsWidthPx = allPills.reduce(
    (sum, pill) => sum + pill.label.length * 8 + 28,
    0,
  );
  const pillsGapPx = totalPillCount > 1 ? (totalPillCount - 1) * 4 : 0;
  const stackedPillsWidthPx = pillsWidthPx + pillsGapPx;
  const inlinePillsWidthPx =
    totalPillCount > 0 ? pillsWidthPx + pillsGapPx + 8 : 0;

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
    totalPillCount > 0 &&
    !isCompactLayout &&
    desiredSingleRowWidthPx <= estimatedFieldMaxWidthPx;
  const showInlinePills = canInlinePills;
  const showStackedPills = totalPillCount > 0 && !showInlinePills;
  const helperWidthPx =
    baseHelperWidthPx + (showInlinePills ? inlinePillsWidthPx : 0);
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
      query: Math.ceil(
        queryMeasureRef.current?.getBoundingClientRect().width || 0,
      ),
      placeholder: Math.ceil(
        placeholderMeasureRef.current?.getBoundingClientRect().width || 0,
      ),
      hint: Math.ceil(
        hintMeasureRef.current?.getBoundingClientRect().width || 0,
      ),
    });
  }, [query, placeholder, showMinQueryHint]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inDropdown = dropdownRef.current?.contains(e.target);
      const inField = fieldRef.current?.contains(e.target);
      if (!inDropdown && !inField) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHasBooleanOperators(checkBooleanOperators(value));

    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);

    if (value.trim().length >= 2 && onSearchSuggestions) {
      suggestionsTimerRef.current = setTimeout(async () => {
        const result = await onSearchSuggestions(value.trim());
        const newSuggestions = result || { tags: [], badges: [] };
        setSuggestions(newSuggestions);
        const hasAny =
          (newSuggestions.tags?.length || 0) +
            (newSuggestions.badges?.length || 0) >
          0;
        setShowDropdown(hasAny);
      }, 300);
    } else {
      setSuggestions({ tags: [], badges: [] });
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch(query.trim());
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSelectTag = (tag) => {
    onSelectTagSuggestion?.(tag);
    setQuery("");
    setSuggestions({ tags: [], badges: [] });
    setShowDropdown(false);
  };

  const handleSelectBadge = (badge) => {
    onSelectBadgeSuggestion?.(badge);
    setQuery("");
    setSuggestions({ tags: [], badges: [] });
    setShowDropdown(false);
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

  const renderBadgePill = (pill) => {
    const color = CATEGORY_COLORS[pill.category] || DEFAULT_COLOR;
    return (
      <button
        key={pill.key}
        type="button"
        onClick={() => onRemoveBadgePill?.(pill.id)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: color, color: "white" }}
        title={`Remove ${pill.label}`}
      >
        <span className="shrink-0">{getBadgeIcon(pill.label, "white", 10)}</span>
        <span>{pill.label}</span>
        <X size={10} />
      </button>
    );
  };

  const renderFocusAreaPill = (pill) => (
    <button
      key={pill.key}
      type="button"
      onClick={() => onRemoveFocusAreaPill?.(pill.id)}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80"
      style={{ backgroundColor: FOCUS_GREEN, color: "white" }}
      title={`Remove ${pill.label}`}
    >
      <Tag size={10} className="shrink-0" />
      <span>{pill.label}</span>
      <X size={10} />
    </button>
  );

  const renderCriteriaPill = (pill) => {
    const pillLabelNode = pill.shortLabel ? (
      <>
        <span className="hidden sm:inline">{pill.label}</span>
        <span className="sm:hidden">{pill.shortLabel}</span>
      </>
    ) : (
      <span>{pill.label}</span>
    );

    if (pill.type === "role") {
      return (
        <button
          key={pill.key}
          type="button"
          onClick={() => onRemoveActivePill?.(pill.key)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100"
          title={`Remove ${pill.label}`}
        >
          <UserSearch size={12} className="flex-shrink-0" />
          {pillLabelNode}
          <span aria-hidden="true">×</span>
        </button>
      );
    }
    if (pill.type === "excludeTeam") {
      return (
        <button
          key={pill.key}
          type="button"
          onClick={() => onRemoveActivePill?.(pill.key)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-400 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-500 hover:bg-slate-100"
          title={`Remove ${pill.label}`}
        >
          <Users size={12} className="flex-shrink-0" />
          {pillLabelNode}
          <span aria-hidden="true">×</span>
        </button>
      );
    }
    return (
      <button
        key={pill.key}
        type="button"
        onClick={() => onRemoveActivePill?.(pill.key)}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)] bg-[#f0fdf4] px-2 py-0.5 text-xs font-bold text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary-focus)] hover:bg-[#dcfce7] hover:text-[var(--color-primary-focus)]"
        title={`Remove ${pill.label}`}
      >
        {pillLabelNode}
        <span aria-hidden="true">x</span>
      </button>
    );
  };

  const hasSuggestions =
    (suggestions.tags?.length || 0) + (suggestions.badges?.length || 0) > 0;

  return (
    <div className={rootClassName}>
      <form onSubmit={handleSubmit} className={formClassName}>
        <div className="flex max-w-full items-center gap-2">
          <div className={fieldSlotClassName}>
            <div ref={fieldRef} className={fieldClassName} style={fieldStyle}>
              {showStackedPills && (
                <div className="mb-1 flex flex-wrap gap-2">
                  {badgePills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {badgePills.map(renderBadgePill)}
                    </div>
                  )}
                  {focusAreaPills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {focusAreaPills.map(renderFocusAreaPill)}
                    </div>
                  )}
                  {activePills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {activePills.map(renderCriteriaPill)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex min-w-0 items-center gap-2">
                {hasLeftAdornment && (
                  <div className="shrink-0">{leftAdornment}</div>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  minLength={2}
                />
              </div>
            </div>

            <div className={helperControlsClassName}>
              {showMinQueryHint && (
                <span className="text-xs text-warning whitespace-nowrap">
                  {MIN_QUERY_HINT}
                </span>
              )}
              {showInlinePills && (
                <>
                  {badgePills.length > 0 && (
                    <div className="flex items-center gap-1">
                      {badgePills.map(renderBadgePill)}
                    </div>
                  )}
                  {focusAreaPills.length > 0 && (
                    <div className="flex items-center gap-1">
                      {focusAreaPills.map(renderFocusAreaPill)}
                    </div>
                  )}
                  {activePills.length > 0 && (
                    <div className="flex items-center gap-1">
                      {activePills.map(renderCriteriaPill)}
                    </div>
                  )}
                </>
              )}
              {hasBooleanOperators && (
                <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                  Advanced
                </span>
              )}
            </div>

            <div className={infoIconClassName}>
              <SearchHelp anchorRef={inputRef} />
            </div>

            {typeof document !== "undefined" && createPortal(
              <>
                {showDropdown && hasSuggestions && (
                  <div
                    style={{
                      position: "fixed",
                      top: `${menuStyle.arrowTop}px`,
                      left: `${menuStyle.arrowLeft ?? 0}px`,
                      transform: menuPlacement === "bottom" ? "translateX(-50%) rotate(180deg)" : "translateX(-50%)",
                      width: "48px",
                      height: "12px",
                      backgroundColor: "#ffffff",
                      zIndex: 10001,
                      pointerEvents: "none",
                    WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.500009 1C3.5 1 3.00001 7 6.00001 7C9 7 8.5 1 11.5 1C12 1 12 0.5 12 0H0C0 0.5 0 1 0.500009 1Z' fill='white'/%3E%3C/svg%3E")`,
                    maskImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.500009 1C3.5 1 3.00001 7 6.00001 7C9 7 8.5 1 11.5 1C12 1 12 0.5 12 0H0C0 0.5 0 1 0.500009 1Z' fill='white'/%3E%3C/svg%3E")`,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    filter: "drop-shadow(0 2px 6px rgba(4, 80, 20, 0.12))",
                  }}
                  />
                )}
                <ul
                  ref={dropdownRef}
                  style={showDropdown && hasSuggestions ? menuStyle : { display: "none" }}
                  className={showDropdown && hasSuggestions ? "menu flex-nowrap bg-base-100 rounded-box p-2 shadow-xl overflow-y-auto" : ""}
                >
                  {showDropdown && hasSuggestions && (
                  <>{/* Focus Areas section */}
                  {suggestions.tags.length > 0 && (
                    <>
                      <li className="menu-title px-3 pt-1 pb-3">
                        <span className="flex items-center justify-start gap-1.5">
                          <Tag size={16} strokeWidth={2.5} className="text-primary" />
                          <span className="font-semibold text-primary-focus">Focus Areas</span>
                        </span>
                      </li>
                      {(() => {
                        const superGroups = new Map();
                        suggestions.tags.forEach((tag) => {
                          const key = tag.supercategory || "Other";
                          if (!superGroups.has(key)) superGroups.set(key, []);
                          superGroups.get(key).push(tag);
                        });
                        return Array.from(superGroups.entries()).flatMap(
                          ([supercategory, tags]) => {
                            const SuperIcon = SUPERCATEGORY_ICONS[supercategory] || Layers;
                            const bgColor = hexToRgba(FOCUS_GREEN, 0.07);
                            return tags.map((tag, i) => {
                              const isFirst = i === 0;
                              const isLast = i === tags.length - 1;
                              const groupClass = [
                                isFirst && isLast ? "rounded-lg" : isFirst ? "rounded-t-lg" : isLast ? "rounded-b-lg" : "",
                                isLast ? "mb-1.5" : "",
                              ].filter(Boolean).join(" ");
                              return (
                                <li key={tag.id} className={groupClass} style={{ backgroundColor: bgColor }}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectTag(tag); }}
                                    onMouseEnter={() => setHoveredItemKey(`tag-${tag.id}`)}
                                    onMouseLeave={() => setHoveredItemKey(null)}
                                    style={hoveredItemKey === `tag-${tag.id}` ? { backgroundColor: hexToRgba(FOCUS_GREEN, 0.15) } : undefined}
                                    className="flex flex-row-reverse flex-wrap items-start w-full leading-none gap-x-2 gap-y-2 py-1.5"
                                  >
                                    <div className="flex-none flex items-center gap-0.5">
                                      {isFirst && (
                                        <span className="flex items-center gap-1 text-xs leading-none whitespace-nowrap" style={{ color: FOCUS_GREEN }}>
                                          <SuperIcon size={10} className="shrink-0" />
                                          <span>{supercategory}</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="[flex:1_0_auto] max-w-full flex items-center gap-2 min-w-0">
                                      <span className="font-medium">{tag.name}</span>
                                    </div>
                                  </button>
                                </li>
                              );
                            });
                          }
                        );
                      })()}
                    </>
                  )}

                  {/* Badges section */}
                  {suggestions.badges.length > 0 && (
                    <>
                      <li className="menu-title px-3 pt-3 pb-3">
                        <span className="flex items-center justify-start gap-1.5">
                          <Award size={16} strokeWidth={2.5} className="text-primary" />
                          <span className="font-semibold text-primary-focus">Badges</span>
                        </span>
                      </li>
                      {(() => {
                        const catGroups = new Map();
                        suggestions.badges.forEach((badge) => {
                          const cat = badge.category || "Other";
                          if (!catGroups.has(cat)) catGroups.set(cat, []);
                          catGroups.get(cat).push(badge);
                        });
                        return Array.from(catGroups.entries()).flatMap(
                          ([category, badges]) => {
                            const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
                            const bgColor = hexToRgba(color, 0.07);
                            return badges.map((badge, i) => {
                              const isFirst = i === 0;
                              const isLast = i === badges.length - 1;
                              const groupClass = [
                                isFirst && isLast ? "rounded-lg" : isFirst ? "rounded-t-lg" : isLast ? "rounded-b-lg" : "",
                                isLast ? "mb-1.5" : "",
                              ].filter(Boolean).join(" ");
                              return (
                                <li key={badge.id} className={groupClass} style={{ backgroundColor: bgColor }}>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); handleSelectBadge(badge); }}
                                    onMouseEnter={() => setHoveredItemKey(`badge-${badge.id}`)}
                                    onMouseLeave={() => setHoveredItemKey(null)}
                                    style={hoveredItemKey === `badge-${badge.id}` ? { backgroundColor: hexToRgba(color, 0.15) } : undefined}
                                    className="flex flex-row-reverse flex-wrap items-start w-full leading-none gap-x-2 gap-y-2 py-1.5"
                                  >
                                    <div className="flex-none flex items-center gap-0.5">
                                      {isFirst && (
                                        <span className="flex items-center gap-1 text-xs leading-none whitespace-nowrap" style={{ color }}>
                                          {getCategoryIcon(category, color, 10)}
                                          <span>{category}</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="[flex:1_0_auto] max-w-full flex items-center gap-2 min-w-0">
                                      <span className="shrink-0">{getBadgeIcon(badge.name, color, 14)}</span>
                                      <span className="font-medium">{badge.name}</span>
                                    </div>
                                  </button>
                                </li>
                              );
                            });
                          }
                        );
                      })()}
                    </>
                  )}
                  </>)}
                </ul>
              </>,
              document.body
            )}
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
