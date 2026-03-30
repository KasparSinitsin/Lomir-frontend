import React, { useRef, useEffect, useState, useCallback } from "react";
import { Award, Check, ChevronRight, ChevronUp } from "lucide-react";
import { getCategoryIcon } from "../../utils/badgeIconUtils";
import Tooltip from "../common/Tooltip";
import {
  CATEGORY_COLORS,
  CATEGORY_CARD_PASTELS,
  DEFAULT_COLOR,
  PILL_ROW_HEIGHT,
} from "../../constants/badgeConstants";

/**
 * BadgesDisplaySection Component
 *
 * Displays badges in a compact format, optionally grouped by category
 * with category icons. Used in UserDetailsModal and other summary views.
 *
 * @param {string} title - Section title
 * @param {Array} badges - Array of badge objects
 * @param {string} emptyMessage - Message when no badges
 * @param {number} maxVisible - Maximum badges to show before "+N more"
 * @param {boolean} compact - Compact inline display mode
 * @param {string} className - Additional CSS classes
 * @param {boolean} groupByCategory - Group badges by category with icons
 * @param {boolean} showCredits - Show credit counts on badge pills
 * @param {Function} onCategoryClick - Callback when category icon is clicked (category, color, badges, totalCredits)
 * @param {Function} onBadgeClick - Callback when individual badge pill is clicked (badge, category, color)
 */

const BadgesDisplaySection = ({
  title = "Badges",
  badges = [],
  emptyMessage = "No badges earned yet",
  maxVisible = 6,
  compact = false,
  className = "",
  groupByCategory = true,
  showCredits = true,
  onCategoryClick = null,
  onBadgeClick = null,
  onOpenUser = null,
  highlightBadgeName = null,
  matchingBadgeNames = null,
  headerRight = null,
}) => {
  // Hooks must be called before any early returns (Rules of Hooks)
  const highlightRef = useRef(null);

  useEffect(() => {
    if (highlightBadgeName && highlightRef.current) {
      const timer = setTimeout(() => {
        highlightRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [highlightBadgeName]);

  // Collapsible overflow state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [twoRowHeight, setTwoRowHeight] = useState(72);
  const pillsRef = useRef(null);

  // Reset expansion when the badge set changes
  useEffect(() => {
    setIsExpanded(false);
  }, [badges]);

  const measureOverflow = useCallback(() => {
    const el = pillsRef.current;
    if (!el) return;
    const firstBadge = el.querySelector(".badge");
    if (!firstBadge) { setIsOverflowing(false); return; }
    const rowH = firstBadge.offsetHeight;
    const twoH = rowH * 2 + 8; // gap-y-2 = 8px
    setTwoRowHeight(twoH);
    setIsOverflowing(el.scrollHeight > twoH + 2);
  }, []);

  useEffect(() => {
    measureOverflow();
    const ro = new ResizeObserver(measureOverflow);
    if (pillsRef.current) ro.observe(pillsRef.current);
    return () => ro.disconnect();
  }, [measureOverflow, badges]);

  const totalCredits = (badges || []).reduce((sum, b) => sum + (b.total_credits ?? b.totalCredits ?? 0), 0);
  const pillCount = (badges || []).length;

  const titleSummary = totalCredits > 0 ? (
    <span className="font-normal text-sm text-base-content/60 ml-1">
      ({totalCredits} ct. across {pillCount} {pillCount === 1 ? 'area' : 'areas'})
    </span>
  ) : null;

  if (!badges || badges.length === 0) {
    if (compact) return null;
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Award size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">{title}{titleSummary}</h3>
          </div>
          {headerRight}
        </div>
        <p className="text-sm text-base-content/60">{emptyMessage}</p>
      </div>
    );
  }

  const visibleBadges = badges.slice(0, maxVisible);
  const remainingCount = badges.length - maxVisible;

  // Helper to get credits (handles both snake_case and camelCase)
  const getCredits = (badge) => {
    const credits = badge.total_credits ?? badge.totalCredits;
    return Number.isFinite(credits) && credits > 0 ? credits : null;
  };

  // Get color for a category
  const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || DEFAULT_COLOR;
  };

  if (compact) {
    return (
      <div
        className={`flex items-start text-sm text-base-content/70 ${className}`}
      >
        <Award size={16} className="mr-1 flex-shrink-0 mt-0.5" />
        <span>
          {visibleBadges.map((badge, index) => {
            const credits = getCredits(badge);
            return (
              <span key={badge.id ?? badge.badge_id ?? badge.name}>
                <span style={{ color: badge.color }} className="font-medium">
                  {badge.name}
                  {credits && showCredits && (
                    <span className="opacity-70"> | {credits}ct.</span>
                  )}
                </span>
                {index < visibleBadges.length - 1 && ", "}
              </span>
            );
          })}
          {remainingCount > 0 && ` +${remainingCount}`}
        </span>
      </div>
    );
  }

  // Group badges by category
  const normalizeCategory = (c) => (c ? String(c).trim() : "Other");

  const badgesByCategory = badges.reduce((acc, badge) => {
    const category = normalizeCategory(badge.category);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(badge);
    return acc;
  }, {});

  // Define category order for consistent display
  const categoryOrder = [
    "Collaboration Skills",
    "Technical Expertise",
    "Creative Thinking",
    "Leadership Qualities",
    "Personal Attributes",
    "Other",
  ];

  // Calculate total credits for a category
  const getCategoryTotalCredits = (categoryBadges) => {
    return categoryBadges.reduce((sum, badge) => {
      const credits = badge.total_credits ?? badge.totalCredits ?? 0;
      return sum + credits;
    }, 0);
  };

  // Credits DESC, predefined order as tiebreaker (matching TagsDisplaySection):
  const sortedCategories = Object.keys(badgesByCategory).sort((a, b) => {
    const creditsA = getCategoryTotalCredits(badgesByCategory[a]);
    const creditsB = getCategoryTotalCredits(badgesByCategory[b]);
    if (creditsB !== creditsA) return creditsB - creditsA;

    // Tiebreaker: predefined order
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    const posA = indexA === -1 ? 999 : indexA;
    const posB = indexB === -1 ? 999 : indexB;
    return posA - posB;
  });

  // Handle category icon click
  const handleCategoryClick = (category, categoryBadges) => {
    if (!onCategoryClick) return;

    const color = getCategoryColor(category);
    const totalCredits = getCategoryTotalCredits(categoryBadges);

    onCategoryClick(category, color, categoryBadges, totalCredits);
  };

  const toggleButton = isOverflowing ? (
    <button
      type="button"
      className="flex items-center gap-1 mt-3 text-sm text-base-content/50 hover:text-base-content/80 transition-colors"
      onClick={() => setIsExpanded((v) => !v)}
    >
      {isExpanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
      {isExpanded ? "Show less" : "Show all"}
    </button>
  ) : null;

  // If not grouping by category, render flat list (original behavior)
  if (!groupByCategory) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Award size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">{title}{titleSummary}</h3>
          </div>
          {headerRight}
        </div>

        <div
          ref={pillsRef}
          style={!isExpanded && isOverflowing ? { maxHeight: twoRowHeight, overflow: "hidden" } : {}}
        >
          <div className="flex flex-wrap gap-2">
            {visibleBadges.map((badge) => {
              const credits = getCredits(badge);
              return (
                <span
                  key={badge.id ?? badge.badge_id ?? badge.name}
                  className="badge badge-primary badge-outline p-3"
                  style={{ borderColor: badge.color, color: badge.color }}
                  title={badge.description || badge.category}
                >
                  {badge.name}
                  {credits && showCredits && (
                    <span className="ml-1 opacity-80">| {credits}ct.</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
        {toggleButton}
      </div>
    );
  }

  // Grouped by category with icons
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Award size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">{title}{titleSummary}</h3>
        </div>
        {headerRight}
      </div>

      {/* Category groups with icons */}
      <div
        ref={pillsRef}
        style={!isExpanded && isOverflowing ? { maxHeight: twoRowHeight, overflow: "hidden" } : {}}
      >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {sortedCategories.map((category) => {
          const categoryBadges = badgesByCategory[category];
          const categoryColor = getCategoryColor(category);

          return (
            <div key={category} className="flex items-start">
              {/* Category Icon - clickable if onCategoryClick provided */}
              {(() => {
                const catTotalCredits = getCategoryTotalCredits(categoryBadges);
                const catAwardCount = categoryBadges.reduce(
                  (sum, b) => sum + Number(b.award_count ?? b.awardCount ?? 0),
                  0,
                );
                const catAwarderCount = Number(
                  categoryBadges[0]?.category_awarder_count ??
                    categoryBadges[0]?.categoryAwarderCount ??
                    0,
                );
                const catTooltip =
                  catAwardCount > 0
                    ? `${category}: ${catTotalCredits}ct. awarded with ${catAwardCount} badge${catAwardCount === 1 ? "" : "s"} by ${catAwarderCount} ${catAwarderCount === 1 ? "person" : "people"}`
                    : category;

                return (
                  <Tooltip content={catTooltip}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryClick(category, categoryBadges);
                      }}
                      className={`inline-flex items-center justify-center pr-[6px] ${
                        onCategoryClick
                          ? "cursor-pointer hover:opacity-70 transition-opacity"
                          : ""
                      }`}
                      style={{
                        height: PILL_ROW_HEIGHT,
                        color: categoryColor,
                      }}
                    >
                      {getCategoryIcon(category, categoryColor, 14)}
                    </span>
                  </Tooltip>
                );
              })()}

              {/* Badge pills for this category */}
              <div className="flex flex-wrap gap-1.5">
                {/* Badge pills */}
                {categoryBadges.map((badge) => {
                  const credits = getCredits(badge);
                  const isClickable = !!onBadgeClick;
                  const badgeKey = (badge.name ?? "").trim().toLowerCase();
                  const isBadgeMatch =
                    matchingBadgeNames && matchingBadgeNames.has(badgeKey);
                  const matchPastel =
                    CATEGORY_CARD_PASTELS[category] || `${categoryColor}15`;
                  const awardCount = Number(
                    badge.award_count ?? badge.awardCount ?? 0,
                  );
                  const awarderCount = Number(
                    badge.awarder_count ?? badge.awarderCount ?? 0,
                  );
                  const badgeTooltip =
                    awardCount > 0
                      ? `${badge.name}: ${credits || 0}ct. awarded ${awardCount} time${awardCount === 1 ? "" : "s"} by ${awarderCount} ${awarderCount === 1 ? "person" : "people"}`
                      : badge.description || category;

                  return (
                    <Tooltip
                      key={badge.id ?? badge.badge_id ?? badge.name}
                      content={badgeTooltip}
                    >
                      <span
                        ref={
                          highlightBadgeName &&
                          badge.name?.toLowerCase() ===
                            highlightBadgeName.toLowerCase()
                            ? highlightRef
                            : undefined
                        }
                        className={`badge badge-outline p-3 bg-white/60 ${isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${
                          highlightBadgeName &&
                          badge.name?.toLowerCase() ===
                            highlightBadgeName.toLowerCase()
                            ? "animate-badge-highlight"
                            : ""
                        }`}
                        style={{
                          borderColor: categoryColor,
                          color: categoryColor,
                          ...(highlightBadgeName &&
                          badge.name?.toLowerCase() ===
                            highlightBadgeName.toLowerCase()
                            ? {
                                borderWidth: "2px",
                                boxShadow: `0 0 12px ${categoryColor}66`,
                                backgroundColor: `${categoryColor}20`,
                              }
                            : isBadgeMatch
                              ? { backgroundColor: matchPastel }
                              : {}),
                        }}
                        onClick={
                          isClickable
                            ? (e) => {
                                e.stopPropagation();
                                onBadgeClick(badge, category, categoryColor);
                              }
                            : undefined
                        }
                      >
                        {isBadgeMatch && (
                          <Check
                            size={12}
                            className="flex-shrink-0"
                            style={{ color: categoryColor }}
                          />
                        )}
                        {badge.name}
                        {credits && showCredits && (
                          <span className="ml-1 opacity-70">
                            | {credits}ct.
                          </span>
                        )}
                      </span>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      </div>
      {toggleButton}
    </div>
  );
};

export default BadgesDisplaySection;
