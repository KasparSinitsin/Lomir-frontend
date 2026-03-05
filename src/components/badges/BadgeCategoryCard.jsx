import React from "react";
import {
  Users,
  Settings,
  Lightbulb,
  Compass,
  Heart,
  Award,
} from "lucide-react";
import {
  CATEGORY_SECTION_PASTELS,
  DEFAULT_SECTION_PASTEL,
} from "../../constants/badgeConstants";

/**
 * BadgeCategoryCard Component
 *
 * Displays a category card with all badges earned in that category.
 * Used on the Profile page to group badges by category.
 *
 * @param {string} category - Category name (e.g., "Collaboration Skills")
 * @param {string} color - Category color (hex)
 * @param {Array} badges - Array of badges in this category
 * @param {number} totalCredits - Total credits earned in this category
 */

const BadgeCategoryCard = ({
  category,
  color,
  badges = [],
  totalCredits = 0,
  onClick,
  onBadgeClick,
  highlightBadgeName,
}) => {
  // Get category icon based on category name
  const getCategoryIcon = () => {
    const iconProps = { size: 20, style: { color } };

    const categoryLower = category?.toLowerCase() || "";

    if (categoryLower.includes("collaboration"))
      return <Users {...iconProps} />;
    if (categoryLower.includes("technical")) return <Settings {...iconProps} />;
    if (categoryLower.includes("creative")) return <Lightbulb {...iconProps} />;
    if (categoryLower.includes("leadership")) return <Compass {...iconProps} />;
    if (categoryLower.includes("personal")) return <Heart {...iconProps} />;

    return <Award {...iconProps} />;
  };

  // Get solid pastel background color for category
  const getPastelBackground = () => {
    return CATEGORY_SECTION_PASTELS[category] || DEFAULT_SECTION_PASTEL;
  };

  // Sort badges by total_credits descending
  const sortedBadges = [...badges].sort((a, b) => {
    const aCredits = a.total_credits ?? a.totalCredits ?? 0;
    const bCredits = b.total_credits ?? b.totalCredits ?? 0;
    return bCredits - aCredits;
  });

  // Helper to get credits from badge
  const getCredits = (badge) => {
    const credits = badge.total_credits ?? badge.totalCredits;
    return Number.isFinite(credits) && credits > 0 ? credits : null;
  };

  return (
    <div
      className={`card shadow-soft hover:shadow-md transition-shadow duration-300 overflow-hidden w-fit ${onClick ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: getPastelBackground() }}
      onClick={onClick}
    >
      <div className="card-body p-4">
        {/* Header: Category name + icon + total credits */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0">{getCategoryIcon()}</span>
            <h3 className="font-medium text-sm leading-snug" style={{ color }}>
              {category}
            </h3>
          </div>
          <span
            className="text-sm font-medium px-2 py-0.5 rounded-full bg-white/50 flex-shrink-0 ml-2"
            style={{ color }}
          >
            {totalCredits} ct.
          </span>
        </div>

        {/* Badge pills */}
        <div className="flex flex-wrap gap-2">
          {sortedBadges.map((badge) => {
            const credits = getCredits(badge);
            const isHighlighted =
              highlightBadgeName &&
              badge.name?.toLowerCase() === highlightBadgeName.toLowerCase();
            return (
              <span
                key={badge.id ?? badge.badge_id ?? badge.name}
                className={`badge badge-outline p-3 bg-white/60 ${
                  onBadgeClick
                    ? "cursor-pointer hover:opacity-90 transition-opacity"
                    : ""
                } ${isHighlighted ? "animate-badge-highlight" : ""}`}
                style={{
                  borderColor: color,
                  color,
                  ...(isHighlighted
                    ? {
                        borderWidth: "2px",
                        boxShadow: `0 0 12px ${color}66`,
                        backgroundColor: `${color}20`,
                      }
                    : {}),
                }}
                title={badge.description || badge.name}
                onClick={(e) => {
                  if (!onBadgeClick) return;
                  e.stopPropagation();
                  onBadgeClick(badge);
                }}
                role={onBadgeClick ? "button" : undefined}
                tabIndex={onBadgeClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!onBadgeClick) return;
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onBadgeClick(badge);
                  }
                }}
              >
                {badge.name}
                {credits && (
                  <span className="ml-1 opacity-80">| {credits}ct.</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BadgeCategoryCard;
