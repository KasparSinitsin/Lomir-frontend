import React from "react";
import {
  Award,
  Users,
  Settings,
  Lightbulb,
  Compass,
  Heart,
} from "lucide-react";

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
 */

// Category colors (matching BadgeCategoryCard/BadgeCategoryModal)
const CATEGORY_COLORS = {
  "Collaboration Skills": "#3B82F6",
  "Technical Expertise": "#10B981",
  "Creative Thinking": "#8B5CF6",
  "Leadership Qualities": "#EF4444",
  "Personal Attributes": "#F59E0B",
};

const DEFAULT_COLOR = "#6B7280";

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
}) => {
  if (!badges || badges.length === 0) {
    if (compact) return null;
    return (
      <div className={className}>
        <div className="flex items-center mb-2">
          <Award size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">{title}</h3>
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

  // Get category icon based on category name
  const getCategoryIcon = (category, size = 14) => {
    const color = CATEGORY_COLORS[category] || DEFAULT_COLOR;
    const isClickable = !!onCategoryClick;
    const iconProps = {
      size,
      style: { color },
      className: `flex-shrink-0 ${isClickable ? "cursor-pointer hover:opacity-70 transition-opacity" : ""}`,
    };
    const categoryLower = category?.toLowerCase() || "";

    if (categoryLower.includes("collaboration"))
      return <Users {...iconProps} />;
    if (categoryLower.includes("technical")) return <Settings {...iconProps} />;
    if (categoryLower.includes("creative")) return <Lightbulb {...iconProps} />;
    if (categoryLower.includes("leadership")) return <Compass {...iconProps} />;
    if (categoryLower.includes("personal")) return <Heart {...iconProps} />;

    return <Award {...iconProps} />;
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

  const badgesByCategory = visibleBadges.reduce((acc, badge) => {
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

  // Sort categories by predefined order
  const sortedCategories = Object.keys(badgesByCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    const posA = indexA === -1 ? 999 : indexA;
    const posB = indexB === -1 ? 999 : indexB;
    return posA - posB;
  });

  // Calculate total credits for a category
  const getCategoryTotalCredits = (categoryBadges) => {
    return categoryBadges.reduce((sum, badge) => {
      const credits = badge.total_credits ?? badge.totalCredits ?? 0;
      return sum + credits;
    }, 0);
  };

  // Handle category icon click
  const handleCategoryClick = (category, categoryBadges) => {
    if (!onCategoryClick) return;

    const color = getCategoryColor(category);
    const totalCredits = getCategoryTotalCredits(categoryBadges);

    onCategoryClick(category, color, categoryBadges, totalCredits);
  };

  // If not grouping by category, render flat list (original behavior)
  if (!groupByCategory) {
    return (
      <div className={className}>
        <div className="flex items-center mb-3">
          <Award size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">{title}</h3>
        </div>

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

          {remainingCount > 0 && (
            <span className="badge badge-ghost badge-sm text-xs">
              +{remainingCount} more
            </span>
          )}
        </div>
      </div>
    );
  }

  // Grouped by category with icons
  return (
    <div className={className}>
      <div className="flex items-center mb-3">
        <Award size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">{title}</h3>
      </div>

      {/* Category groups with icons */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {sortedCategories.map((category) => {
          const categoryBadges = badgesByCategory[category];
          const categoryColor = getCategoryColor(category);

          return (
            <div
              key={category}
              className="flex items-center gap-1.5"
              title={category}
            >
              {/* Category Icon - clickable if onCategoryClick provided */}
              <span
                onClick={() => handleCategoryClick(category, categoryBadges)}
                className={onCategoryClick ? "cursor-pointer" : ""}
              >
                {getCategoryIcon(category, 14)}
              </span>

              {/* Badge pills for this category */}
              <div className="flex flex-wrap gap-1.5">
                {categoryBadges.map((badge) => {
                  const credits = getCredits(badge);
                  return (
                    <span
                      key={badge.id ?? badge.badge_id ?? badge.name}
                      className="badge badge-outline p-2.5 text-sm"
                      style={{
                        borderColor: categoryColor,
                        color: categoryColor,
                      }}
                      title={badge.description || category}
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
          );
        })}

        {remainingCount > 0 && (
          <span className="badge badge-ghost badge-sm text-xs">
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
};

export default BadgesDisplaySection;
