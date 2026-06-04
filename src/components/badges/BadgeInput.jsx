import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { X, Award, Check } from "lucide-react";
import { useBadges } from "../../hooks/useBadgeQueries";
import { getCategoryIcon, getBadgeIcon } from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  CATEGORY_ORDER,
  DEFAULT_COLOR,
} from "../../constants/badgeConstants";

const EDGE_MARGIN = 8;
const GAP = 16;
const MIN_MENU_HEIGHT = 140;
const MAX_MENU_HEIGHT = 360;

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const BadgeInput = ({
  selectedBadgeIds = [],
  onBadgeIdsChange,
  placeholder = "Search for badges...",
  disabled = false,
}) => {
  const { data: allBadges = [], isLoading } = useBadges();

  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredBadgeId, setHoveredBadgeId] = useState(null);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const selectedRef = useRef(null);

  const [menuStyle, setMenuStyle] = useState({
    position: "fixed",
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 240,
    zIndex: 10000,
    arrowTop: 0,
  });
  const [menuPlacement, setMenuPlacement] = useState("bottom");

  const selectedBadgeIdSet = useMemo(
    () => new Set(selectedBadgeIds),
    [selectedBadgeIds]
  );

  const allBadgesMap = useMemo(() => {
    const m = new Map();
    allBadges.forEach((b) => m.set(b.id, b));
    return m;
  }, [allBadges]);

  const filteredBadges = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return allBadges;
    return allBadges.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
    );
  }, [allBadges, inputValue]);

  const groupedBadges = useMemo(() => {
    const groups = new Map();
    filteredBadges.forEach((badge) => {
      const cat = badge.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(badge);
    });
    // Sort by CATEGORY_ORDER
    const ordered = new Map();
    CATEGORY_ORDER.forEach((cat) => {
      if (groups.has(cat)) ordered.set(cat, groups.get(cat));
    });
    groups.forEach((badges, cat) => {
      if (!ordered.has(cat)) ordered.set(cat, badges);
    });
    return ordered;
  }, [filteredBadges]);

  const handleToggle = useCallback(
    (badgeId) => {
      const next = selectedBadgeIdSet.has(badgeId)
        ? selectedBadgeIds.filter((id) => id !== badgeId)
        : [...selectedBadgeIds, badgeId];
      onBadgeIdsChange?.(next);
    },
    [selectedBadgeIds, selectedBadgeIdSet, onBadgeIdsChange]
  );

  // ── positioning (mirrors TagInput) ──────────────────────────────────────
  const computeBasePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const selectedHeight =
      selectedRef.current?.getBoundingClientRect?.().height ?? 0;
    const reservedBelow =
      selectedBadgeIds.length > 0 ? selectedHeight + GAP : 0;
    const spaceBelow =
      viewportH - (rect.bottom + GAP) - EDGE_MARGIN - reservedBelow;
    const spaceAbove = rect.top - GAP - EDGE_MARGIN;
    const canFitBelow = spaceBelow >= MIN_MENU_HEIGHT;
    const canFitAbove = spaceAbove >= MIN_MENU_HEIGHT;
    let placement = "bottom";
    if (canFitBelow && !canFitAbove) placement = "bottom";
    else if (!canFitBelow && canFitAbove) placement = "top";
    else placement = spaceBelow >= spaceAbove ? "bottom" : "top";
    const available = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(MAX_MENU_HEIGHT, Math.max(80, available));
    const width = Math.min(rect.width, 500);
    const left = Math.min(
      Math.max(EDGE_MARGIN, rect.left),
      Math.max(EDGE_MARGIN, viewportW - width - EDGE_MARGIN)
    );
    const top =
      placement === "bottom" ? rect.bottom + GAP : rect.top - GAP - maxHeight;
    return { placement, top, left, width, maxHeight };
  }, [selectedBadgeIds.length]);

  const updateDropdownPosition = useCallback(() => {
    const base = computeBasePosition();
    if (!base) return;
    setMenuPlacement(base.placement);
    const left = base.left;
    setMenuStyle({
      position: "fixed",
      top: base.top,
      left,
      width: "max-content",
      maxWidth: `min(500px, calc(100vw - ${left}px - ${EDGE_MARGIN}px))`,
      maxHeight: base.maxHeight,
      zIndex: 10000,
      arrowTop: base.placement === "bottom" ? base.top - 19 : base.top,
    });
  }, [computeBasePosition]);

  const refineTopWithActualHeight = useCallback(() => {
    if (!showDropdown || menuPlacement !== "top") return;
    const inputEl = inputRef.current;
    const menuEl = dropdownRef.current;
    if (!inputEl || !menuEl) return;
    const rect = inputEl.getBoundingClientRect();
    const actualHeight = Math.min(menuEl.scrollHeight, menuStyle.maxHeight);
    const correctedTop = Math.max(EDGE_MARGIN, rect.top - GAP - actualHeight);
    setMenuStyle((prev) => ({
      ...prev,
      top: correctedTop,
      arrowTop: correctedTop + actualHeight - 1,
    }));
  }, [showDropdown, menuPlacement, menuStyle.maxHeight]);

  useLayoutEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();
    const id = requestAnimationFrame(() => refineTopWithActualHeight());
    return () => cancelAnimationFrame(id);
  }, [
    showDropdown,
    updateDropdownPosition,
    refineTopWithActualHeight,
    filteredBadges.length,
  ]);

  useEffect(() => {
    if (!showDropdown) return;
    let raf = 0;
    const tick = () => {
      updateDropdownPosition();
      refineTopWithActualHeight();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showDropdown, updateDropdownPosition, refineTopWithActualHeight]);

  useEffect(() => {
    if (!showDropdown) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    const onMouseDown = (e) => {
      if (
        !inputRef.current?.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [showDropdown]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => !disabled && !isLoading && setShowDropdown(true)}
        placeholder={isLoading ? "Loading badges…" : placeholder}
        disabled={disabled || isLoading}
        className="input input-bordered w-full pr-10 focus:input-primary"
      />

      {selectedBadgeIds.length > 0 && (
        <div ref={selectedRef} className="mt-2 p-3 bg-base-100 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {selectedBadgeIds.map((badgeId) => {
              const badge = allBadgesMap.get(badgeId);
              if (!badge) return null;
              const color = CATEGORY_COLORS[badge.category] || DEFAULT_COLOR;
              return (
                <span
                  key={badgeId}
                  className="badge badge-lg gap-2 leading-none items-start h-auto py-1.5"
                  style={{
                    backgroundColor: color,
                    borderColor: color,
                    color: "white",
                  }}
                >
                  <span className="shrink-0 mt-px">
                    {getBadgeIcon(badge.name, "white", 14)}
                  </span>
                  {badge.name}
                  <button
                    type="button"
                    onClick={() => handleToggle(badgeId)}
                    className="hover:text-error transition-colors"
                    aria-label={`Remove ${badge.name}`}
                    disabled={disabled}
                  >
                    <X size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <>
            {showDropdown && (
              <div
                style={{
                  position: "fixed",
                  top: `${menuStyle.arrowTop}px`,
                  left: `${menuStyle.left + 32}px`,
                  transform:
                    menuPlacement === "bottom"
                      ? "translateX(-50%) rotate(180deg)"
                      : "translateX(-50%)",
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
              style={showDropdown ? menuStyle : { display: "none" }}
              className={
                showDropdown
                  ? "menu flex-nowrap bg-base-100 rounded-box p-2 shadow-xl overflow-y-auto"
                  : ""
              }
            >
              {showDropdown && (
                <>
                  <li className="menu-title px-3 pt-1 pb-3">
                    <span className="flex items-center justify-start gap-1.5">
                      <Award size={16} strokeWidth={2.5} className="text-primary" />
                      <span className="font-semibold text-primary-focus">
                        {inputValue.trim() ? "Search Results" : "All Badges"}
                      </span>
                      {filteredBadges.length === 0 && (
                        <span className="text-xs opacity-70">No results</span>
                      )}
                    </span>
                  </li>

                  {Array.from(groupedBadges.entries()).flatMap(
                    ([category, badges]) => {
                      const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
                      const bgColor = hexToRgba(color, 0.07);
                      return badges.map((badge, badgeIdx) => {
                        const isSelected = selectedBadgeIdSet.has(badge.id);
                        const isFirst = badgeIdx === 0;
                        const isLast = badgeIdx === badges.length - 1;
                        const groupClass = [
                          isFirst && isLast
                            ? "rounded-lg"
                            : isFirst
                            ? "rounded-t-lg"
                            : isLast
                            ? "rounded-b-lg"
                            : "",
                          isLast ? "mb-1.5" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <li
                            key={badge.id}
                            className={groupClass}
                            style={{ backgroundColor: bgColor }}
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleToggle(badge.id)}
                              onMouseEnter={() => setHoveredBadgeId(badge.id)}
                              onMouseLeave={() => setHoveredBadgeId(null)}
                              style={
                                hoveredBadgeId === badge.id
                                  ? { backgroundColor: hexToRgba(color, 0.15) }
                                  : undefined
                              }
                              className="flex flex-row-reverse flex-wrap items-start w-full leading-none gap-x-2 gap-y-2 py-1.5"
                            >
                              <div className="flex-none flex items-center gap-0.5">
                                {isSelected && (
                                  <Check
                                    size={12}
                                    className="shrink-0 opacity-80 mr-0.5"
                                    style={{ color }}
                                  />
                                )}
                                {isFirst && (
                                  <span
                                    className="flex items-center gap-1 text-xs leading-none whitespace-nowrap"
                                    style={{ color }}
                                  >
                                    {getCategoryIcon(category, color, 10)}
                                    <span>{category}</span>
                                  </span>
                                )}
                              </div>
                              <div className="[flex:1_0_auto] max-w-full flex items-center gap-2 min-w-0">
                                <span className="shrink-0">
                                  {getBadgeIcon(badge.name, color, 14)}
                                </span>
                                <span className="font-medium">{badge.name}</span>
                              </div>
                            </button>
                          </li>
                        );
                      });
                    }
                  )}
                </>
              )}
            </ul>
          </>,
          document.body
        )}
    </div>
  );
};

export default BadgeInput;
