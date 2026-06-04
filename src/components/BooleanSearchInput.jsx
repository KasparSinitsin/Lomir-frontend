import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import {
  Tag,
  Award,
  UserSearch,
  Users,
  X,
  Layers,
  ArrowDownAZ,
  ArrowUpZA,
  Clock,
  Filter,
  FlaskConical,
  Globe,
  MapPin,
  Radius,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserMinus,
  UserPlus,
} from "lucide-react";
import SearchHelp from "./SearchHelp";
import Tooltip from "./common/Tooltip";
import {
  getBadgeIcon,
  getCategoryIcon,
  SUPERCATEGORY_ICONS,
} from "../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
} from "../constants/badgeConstants";

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MIN_QUERY_HINT = "Enter at least two characters";
const BOOLEAN_OPERATOR_SPLIT_PATTERN = /\b(?:AND|OR|NOT)\b/i;

const cleanSuggestionSegment = (value) =>
  value
    .replace(/[()]/g, " ")
    .replace(/^[\s"'-]+|[\s"')]+$/g, "")
    .trim();

const getSuggestionQuery = (value, cursorIndex = value.length) => {
  const beforeCursor = value.slice(0, cursorIndex);
  const segmentAtCursor = cleanSuggestionSegment(
    beforeCursor.split(BOOLEAN_OPERATOR_SPLIT_PATTERN).pop() || "",
  );

  if (segmentAtCursor) return segmentAtCursor;

  const fallbackSegments = value
    .split(BOOLEAN_OPERATOR_SPLIT_PATTERN)
    .map(cleanSuggestionSegment)
    .filter(Boolean);

  return fallbackSegments[fallbackSegments.length - 1] || "";
};

const splitLeadingSign = (value) => {
  const match = String(value ?? "").match(/^([+-])\s+(.+)$/);
  return match
    ? { sign: match[1], label: match[2] }
    : { sign: null, label: value };
};

const getFilterPillAriaLabel = (removeAction, filterName) =>
  `${removeAction}: ${filterName}`;

const getCriteriaPillIcon = (pill) => {
  if (pill.key === "maxDistance") return Radius;
  if (pill.key === "openRolesOnly") return UserSearch;
  if (pill.key === "includeOwnTeams") return Users;
  if (pill.key === "includeDemoData") return FlaskConical;

  if (pill.key !== "sort") return null;

  switch (pill.label) {
    case "Best Match":
      return Target;
    case "Name Z-A":
      return ArrowUpZA;
    case "Name A-Z":
      return ArrowDownAZ;
    case "Active":
    case "Inactive":
      return Clock;
    case "Newest":
    case "Oldest":
      return Sparkles;
    case "Most Spots":
      return UserPlus;
    case "Almost Full":
      return UserMinus;
    case "Most Open Roles":
    case "Least Open Roles":
      return UserSearch;
    case "Remote First":
      return Globe;
    case "Nearest First":
      return MapPin;
    default:
      return null;
  }
};

const getFocusAreaPillIcon = (pill) =>
  SUPERCATEGORY_ICONS[pill.supercategory] ||
  SUPERCATEGORY_ICONS[pill.category] ||
  Layers;

const getCriteriaFilterType = (pill) => {
  if (pill.type === "role") return "searchTerm";
  if (pill.key === "sort") return "sort";
  return "filter";
};

const getRemoveActionParts = (removeAction) => {
  const [firstWord, ...restWords] = removeAction.split(" ");
  return {
    firstWord,
    restText: restWords.join(" "),
  };
};

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
  compactPlaceholder = null,
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
  resetSignal = 0,
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
  const searchHelpRef = useRef(null);
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
      arrowTop: base.placement === "bottom" ? base.top - 19 : base.top,
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
  const minimumInputWidthPx = query.trim().length > 0 ? 132 : 180;
  const inputTextWidthPx = Math.max(
    minimumInputWidthPx,
    query.trim().length > 0
      ? measuredTextWidths.query + 32
      : measuredTextWidths.placeholder + 12,
  );

  // Combined pill width calculations across all three groups
  const allPills = [...badgePills, ...focusAreaPills, ...activePills];
  const totalPillCount = allPills.length;
  const hasVisibleLeftAdornment =
    hasLeftAdornment &&
    (query.trim().length > 0 ||
      initialQuery.trim().length > 0 ||
      totalPillCount > 0);
  const showResetInTrailingControls = hasVisibleLeftAdornment;
  const topAdornmentWidthPx =
    hasVisibleLeftAdornment && !showResetInTrailingControls ? 22 : 0;
  const pillsWidthPx = allPills.reduce(
    (sum, pill) => sum + pill.label.length * 8 + 28,
    0,
  );
  const pillsGapPx = totalPillCount > 1 ? (totalPillCount - 1) * 4 : 0;
  const stackedPillsWidthPx = pillsWidthPx + pillsGapPx;
  const inlinePillsWidthPx =
    totalPillCount > 0 ? pillsWidthPx + pillsGapPx + 8 : 0;

  const baseHelperWidthPx = topAdornmentWidthPx;
  const trailingIndicatorWidthPx = hasBooleanOperators
    ? (isCompactLayout ? 20 : 42)
    : 20;
  const indicatorInRowPx =
    trailingIndicatorWidthPx + (showResetInTrailingControls ? 26 : 0);
  const sideControlsWidthPx = Math.max(baseHelperWidthPx, indicatorInRowPx);
  const fieldInsetsPx = sideControlsWidthPx + 32;
  const fieldInsetsWithInlinePillsPx =
    Math.max(baseHelperWidthPx + inlinePillsWidthPx, indicatorInRowPx) + 28;
  const desktopQueryWithPillsMinWidthPx =
    !isCompactLayout && query.length > 0 && totalPillCount > 0 ? 400 : 0;
  const estimatedFieldMaxWidthPx = Math.max(
    320,
    Math.min(viewportWidth - 16, 896) - 128,
  );
  const desiredSingleRowWidthPx =
    inputTextWidthPx + fieldInsetsWithInlinePillsPx;
  const canInlinePills =
    totalPillCount > 0 &&
    query.trim().length === 0 &&
    !hasVisibleLeftAdornment &&
    !hasBooleanOperators &&
    !isCompactLayout &&
    desiredSingleRowWidthPx <= estimatedFieldMaxWidthPx;
  const showInlinePills = canInlinePills;
  const showStackedPills = totalPillCount > 0 && !showInlinePills;
  const helperWidthPx =
    baseHelperWidthPx + (showInlinePills ? inlinePillsWidthPx : 0);
  const trailingControlsOffsetPx = 0;
  const fieldRightPaddingPx = Math.max(helperWidthPx, 12) + 8;
  const textRowRightPaddingPx = isCompactLayout
    ? 0
    : indicatorInRowPx + trailingControlsOffsetPx + 2;
  const queryHintAnchorPx = Math.max(14, measuredTextWidths.query + 13);
  const fieldWidthPx = Math.min(
    estimatedFieldMaxWidthPx,
    Math.max(
      inputTextWidthPx +
        (showInlinePills ? fieldInsetsWithInlinePillsPx : fieldInsetsPx),
      showStackedPills ? stackedPillsWidthPx + fieldInsetsPx : 0,
      desktopQueryWithPillsMinWidthPx,
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
    if (suggestionsTimerRef.current) {
      clearTimeout(suggestionsTimerRef.current);
    }
    setQuery(initialQuery);
    setHasBooleanOperators(checkBooleanOperators(initialQuery));
    setSuggestions({ tags: [], badges: [] });
    setShowDropdown(false);
  }, [initialQuery, resetSignal, checkBooleanOperators]);

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
    const cursorIndex = e.target.selectionStart ?? value.length;
    setQuery(value);
    setHasBooleanOperators(checkBooleanOperators(value));

    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);

    const suggestionQuery = getSuggestionQuery(value, cursorIndex);

    if (suggestionQuery.length >= 2 && onSearchSuggestions) {
      suggestionsTimerRef.current = setTimeout(async () => {
        const result = await onSearchSuggestions(suggestionQuery);
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

  const handleSuggestionRefresh = () => {
    const value = inputRef.current?.value ?? query;
    const cursorIndex = inputRef.current?.selectionStart ?? value.length;
    const suggestionQuery = getSuggestionQuery(value, cursorIndex);

    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);

    if (suggestionQuery.length >= 2 && onSearchSuggestions) {
      suggestionsTimerRef.current = setTimeout(async () => {
        const result = await onSearchSuggestions(suggestionQuery);
        const newSuggestions = result || { tags: [], badges: [] };
        setSuggestions(newSuggestions);
        const hasAny =
          (newSuggestions.tags?.length || 0) +
            (newSuggestions.badges?.length || 0) >
          0;
        setShowDropdown(hasAny);
      }, 150);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const resizeTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!el.value) {
      el.style.height = "";
      return;
    }
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { resizeTextarea(); }, [query, resizeTextarea]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let prevWidth = el.offsetWidth;
    const observer = new ResizeObserver((entries) => {
      const newWidth = entries[0].contentRect.width;
      if (newWidth !== prevWidth) {
        prevWidth = newWidth;
        resizeTextarea();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resizeTextarea]);

  const handleSelectTag = (tag) => {
    onSelectTagSuggestion?.(tag);
    const nextSuggestions = {
      tags: suggestions.tags.filter((item) => Number(item.id) !== Number(tag.id)),
      badges: suggestions.badges,
    };
    setSuggestions(nextSuggestions);
    setShowDropdown(
      (nextSuggestions.tags?.length || 0) +
        (nextSuggestions.badges?.length || 0) >
        0,
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSelectBadge = (badge) => {
    onSelectBadgeSuggestion?.(badge);
    const nextSuggestions = {
      tags: suggestions.tags,
      badges: suggestions.badges.filter(
        (item) => Number(item.id) !== Number(badge.id),
      ),
    };
    setSuggestions(nextSuggestions);
    setShowDropdown(
      (nextSuggestions.tags?.length || 0) +
        (nextSuggestions.badges?.length || 0) >
        0,
    );
    requestAnimationFrame(() => inputRef.current?.focus());
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
  const helperControlsClassName = "absolute right-2 top-2 flex items-center gap-1 pointer-events-auto";
  const trailingControlsClassName = "absolute right-2 flex items-center gap-1 pointer-events-auto";
  const trailingControlsStyle = {
    bottom: isCompactLayout && hasBooleanOperators ? "0.625rem" : "0.5625rem",
    ...(isCompactLayout && hasVisibleLeftAdornment
      ? {
          right: "0.625rem",
        }
      : trailingControlsOffsetPx > 0
        ? { right: "1.875rem" }
        : {}),
  };
  const pillBaseClassName =
    "inline-grid min-h-[1.375rem] max-w-full grid-cols-[0.625rem_minmax(0,1fr)_0.625rem] items-start gap-1 rounded-lg px-[5px] py-[3px] text-xs font-medium leading-[1.1] transition-opacity hover:opacity-80";
  const advancedIndicatorClassName = isCompactLayout
    ? "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full p-0 text-[0.625rem] font-medium leading-none text-white transition-opacity hover:opacity-80"
    : "inline-flex h-[1.125rem] items-center justify-center rounded-lg px-2 py-0 text-xs font-medium leading-[1.1] text-white transition-opacity hover:opacity-80";
  const pillIconClassName =
    "mt-[0.0625rem] flex h-2.5 w-2.5 items-center justify-center overflow-hidden [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:shrink-0";
  const pillSvgClassName = "h-2.5 w-2.5";
  const pillLabelClassName =
    "min-w-0 max-w-full whitespace-normal break-words text-left leading-[1.1] [overflow-wrap:anywhere]";
  const pillCloseClassName =
    "mt-[0.0625rem] flex h-2.5 w-2.5 items-center justify-center overflow-hidden [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:shrink-0";
  const pillTooltipClassName =
    "inline-flex max-w-full min-w-0 z-10 hover:z-[500] focus-within:z-[500]";
  const renderPillTooltipContent = (Icon, filterName, removeAction) => (
    <span className="inline-flex flex-wrap items-center gap-y-0.5">
      <span>{getRemoveActionParts(removeAction).firstWord}</span>
      <span className="inline-flex items-center whitespace-nowrap">
        {Icon ? (
          <Icon
            size={13}
            strokeWidth={2.5}
            className="mx-1"
            aria-hidden="true"
          />
        ) : null}
        <span>{getRemoveActionParts(removeAction).restText}:&nbsp;</span>
      </span>
      <span>{filterName}</span>
    </span>
  );

  const renderColoredFilterPill = ({
    pill,
    color,
    icon,
    onRemove,
    TooltipIcon,
    removeAction,
  }) => {
    const tooltipContent = renderPillTooltipContent(
      TooltipIcon,
      pill.label,
      removeAction,
    );
    const ariaLabel = getFilterPillAriaLabel(removeAction, pill.label);
    return (
      <Tooltip
        key={pill.key}
        content={tooltipContent}
        position="top"
        wrapperClassName={pillTooltipClassName}
      >
        <button
          type="button"
          onClick={() => onRemove?.(pill.id)}
          className={`${pillBaseClassName} border`}
          style={{ backgroundColor: color, borderColor: color, color: "white" }}
          aria-label={ariaLabel}
        >
          <span className={pillIconClassName}>{icon}</span>
          <span className={pillLabelClassName}>{pill.label}</span>
          <span className={pillCloseClassName}>
            <X size={10} strokeWidth={3} className={pillSvgClassName} />
          </span>
        </button>
      </Tooltip>
    );
  };

  const renderBadgePill = (pill) =>
    renderColoredFilterPill({
      pill,
      color: CATEGORY_COLORS[pill.category] || DEFAULT_COLOR,
      icon: getBadgeIcon(pill.label, "white", 10, 3),
      onRemove: onRemoveBadgePill,
      TooltipIcon: Award,
      removeAction: "Remove Badge",
    });

  const renderFocusAreaPill = (pill) => {
    const FocusAreaIcon = getFocusAreaPillIcon(pill);

    return renderColoredFilterPill({
      pill,
      color: FOCUS_GREEN,
      icon: (
        <FocusAreaIcon
          size={10}
          strokeWidth={3}
          className={pillSvgClassName}
          aria-hidden="true"
        />
      ),
      onRemove: onRemoveFocusAreaPill,
      TooltipIcon: Tag,
      removeAction: "Remove Focus Area",
    });
  };

  const renderCriteriaPill = (pill) => {
    const labelParts = splitLeadingSign(pill.label);
    const shortLabelParts = pill.shortLabel
      ? splitLeadingSign(pill.shortLabel)
      : null;
    const pillSign = labelParts.sign || shortLabelParts?.sign;
    const criteriaPillClassName = `${pillBaseClassName}${
      pillSign ? " grid-cols-[auto_minmax(0,1fr)_0.625rem]" : ""
    }`;
    const renderLeadingIcon = (iconNode, ariaHidden = false) => (
      <span
        className={`${pillIconClassName}${pillSign ? " w-auto gap-px" : ""}`}
        aria-hidden={ariaHidden ? "true" : undefined}
      >
        {pillSign && <span className="leading-none">{pillSign}</span>}
        {iconNode}
      </span>
    );
    const pillLabelNode = pill.shortLabel ? (
      <>
        <span className={`hidden sm:inline ${pillLabelClassName}`}>{labelParts.label}</span>
        <span className={`sm:hidden ${pillLabelClassName}`}>{shortLabelParts.label}</span>
      </>
    ) : (
      <span className={pillLabelClassName}>{labelParts.label}</span>
    );
    const criteriaType = getCriteriaFilterType(pill);
    const criteriaTooltipIcon =
      criteriaType === "searchTerm"
        ? UserSearch
        : criteriaType === "sort"
          ? SlidersHorizontal
          : Filter;
    const criteriaRemoveAction =
      criteriaType === "searchTerm"
        ? "Remove Role Name"
        : criteriaType === "sort"
          ? "Remove Sorting"
          : "Remove Filter";
    const criteriaFilterName = pill.removeLabel ?? pill.label;
    const tooltipContent = renderPillTooltipContent(
      criteriaTooltipIcon,
      criteriaFilterName,
      criteriaRemoveAction,
    );
    const ariaLabel = getFilterPillAriaLabel(
      criteriaRemoveAction,
      criteriaFilterName,
    );

    if (pill.type === "role") {
      return (
        <Tooltip
          key={pill.key}
          content={tooltipContent}
          position="top"
          wrapperClassName={pillTooltipClassName}
        >
          <button
            type="button"
            onClick={() => onRemoveActivePill?.(pill.key)}
            className={`${criteriaPillClassName} border border-amber-400 bg-amber-50 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100 hover:opacity-100`}
            aria-label={ariaLabel}
          >
            {renderLeadingIcon(
              <UserSearch
                size={10}
                strokeWidth={3}
                className={pillSvgClassName}
              />,
            )}
            {pillLabelNode}
            <span className={pillCloseClassName} aria-hidden="true">
              <X size={10} strokeWidth={3} className={pillSvgClassName} />
            </span>
          </button>
        </Tooltip>
      );
    }
    if (pill.type === "excludeTeam") {
      return (
        <Tooltip
          key={pill.key}
          content={tooltipContent}
          position="top"
          wrapperClassName={pillTooltipClassName}
        >
          <button
            type="button"
            onClick={() => onRemoveActivePill?.(pill.key)}
            className={`${criteriaPillClassName} border border-slate-400 bg-slate-50 text-slate-600 transition-colors hover:border-slate-500 hover:bg-slate-100 hover:opacity-100`}
            aria-label={ariaLabel}
          >
            {renderLeadingIcon(
              <Users size={10} strokeWidth={3} className={pillSvgClassName} />,
            )}
            {pillLabelNode}
            <span className={pillCloseClassName} aria-hidden="true">
              <X size={10} strokeWidth={3} className={pillSvgClassName} />
            </span>
          </button>
        </Tooltip>
      );
    }
    const CriteriaIcon = getCriteriaPillIcon(pill);
    return (
      <Tooltip
        key={pill.key}
        content={tooltipContent}
        position="top"
        wrapperClassName={pillTooltipClassName}
      >
        <button
          type="button"
          onClick={() => onRemoveActivePill?.(pill.key)}
          className={`${criteriaPillClassName} border border-[var(--color-primary)] bg-[#f0fdf4] text-[var(--color-primary)] transition-colors hover:border-[var(--color-primary-focus)] hover:bg-[#dcfce7] hover:text-[var(--color-primary-focus)] hover:opacity-100`}
          aria-label={ariaLabel}
        >
          {renderLeadingIcon(
            CriteriaIcon ? (
              <CriteriaIcon
                size={10}
                strokeWidth={3}
                className={pillSvgClassName}
              />
            ) : null,
            true,
          )}
          {pillLabelNode}
          <span className={pillCloseClassName} aria-hidden="true">
            <X size={10} strokeWidth={3} className={pillSvgClassName} />
          </span>
        </button>
      </Tooltip>
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
                <div className="mb-2.5 flex flex-wrap gap-2">
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

              <div
                className="flex min-w-0 items-end gap-2"
                style={{ paddingRight: `${textRowRightPaddingPx}px` }}
              >
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={handleChange}
                  onFocus={handleSuggestionRefresh}
                  onClick={handleSuggestionRefresh}
                  onKeyDown={handleKeyDown}
                  placeholder={isCompactLayout && compactPlaceholder ? compactPlaceholder : placeholder}
                  className="min-w-0 flex-1 bg-transparent text-sm leading-[1.25] focus:outline-none px-0 py-0"
                  style={{
                    overflow: "hidden",
                    resize: "none",
                  }}
                  minLength={2}
                  rows={1}
                />
              </div>
              {showMinQueryHint && (
                <>
                  <div
                    className="pointer-events-none absolute top-full z-[9999] mt-1 max-w-[280px] rounded-lg bg-white text-left whitespace-pre-line text-[var(--color-primary-focus)]"
                    style={{
                      left: 0,
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.775rem",
                      lineHeight: 1.15,
                      fontWeight: 450,
                      boxShadow: "0 2px 8px rgba(4, 80, 20, 0.15)",
                    }}
                    role="tooltip"
                  >
                    {MIN_QUERY_HINT}
                  </div>
                  <div
                    className="pointer-events-none absolute top-full z-[10001] bg-white"
                    style={{
                      left: `${queryHintAnchorPx}px`,
                      transform: "translate(-50%, -11px) rotate(180deg)",
                      width: "14px",
                      height: "16px",
                      WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='14' height='16' viewBox='0 0 14 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H14C10.8 0 9.45 1.8 8.4 6L7.25 15.2C7.12 15.8 6.88 15.8 6.75 15.2L5.6 6C4.55 1.8 3.2 0 0 0Z' fill='white'/%3E%3C/svg%3E")`,
                      maskImage: `url("data:image/svg+xml,%3Csvg width='14' height='16' viewBox='0 0 14 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H14C10.8 0 9.45 1.8 8.4 6L7.25 15.2C7.12 15.8 6.88 15.8 6.75 15.2L5.6 6C4.55 1.8 3.2 0 0 0Z' fill='white'/%3E%3C/svg%3E")`,
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                    }}
                    aria-hidden="true"
                  />
                </>
              )}
              <div
                className={trailingControlsClassName}
                style={trailingControlsStyle}
              >
                {showResetInTrailingControls && leftAdornment}
                {hasBooleanOperators && (
                  <Tooltip content="Search tips" position="top">
                    <button
                      type="button"
                      onClick={(e) => searchHelpRef.current?.open(e.currentTarget)}
                      className={advancedIndicatorClassName}
                      style={{ backgroundColor: FOCUS_GREEN_DARK }}
                      aria-label="Search tips (Advanced Search active)"
                    >
                      <span className={isCompactLayout ? "leading-none" : pillLabelClassName}>{isCompactLayout ? "A" : "Advanced"}</span>
                    </button>
                  </Tooltip>
                )}
                <SearchHelp ref={searchHelpRef} anchorRef={fieldRef} hideButton={hasBooleanOperators} />
              </div>
            </div>

            <div className={helperControlsClassName}>
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
              {hasVisibleLeftAdornment && !showResetInTrailingControls && leftAdornment}
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
                      width: "10px",
                      height: "20px",
                      backgroundColor: "#ffffff",
                      zIndex: 10001,
                      pointerEvents: "none",
                    WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='10' height='20' viewBox='0 0 10 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H10C7.8 0 6.8 2.2 6.2 7.3L5.2 19.2C5.1 19.8 4.9 19.8 4.8 19.2L3.8 7.3C3.2 2.2 2.2 0 0 0Z' fill='white'/%3E%3C/svg%3E")`,
                    maskImage: `url("data:image/svg+xml,%3Csvg width='10' height='20' viewBox='0 0 10 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H10C7.8 0 6.8 2.2 6.2 7.3L5.2 19.2C5.1 19.8 4.9 19.8 4.8 19.2L3.8 7.3C3.2 2.2 2.2 0 0 0Z' fill='white'/%3E%3C/svg%3E")`,
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
            className="btn btn-primary h-[32px] sm:h-[38px] min-h-0 px-2 sm:px-4 shrink-0"
            disabled={query.trim().length < 2}
            aria-label="Search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="sr-only sm:not-sr-only">Search</span>
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
