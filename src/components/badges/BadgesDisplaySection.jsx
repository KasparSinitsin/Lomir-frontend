import React from "react";
import { Award } from "lucide-react";

const BadgesDisplaySection = ({
  title = "Badges",
  badges = [],
  emptyMessage = "No badges earned yet",
  maxVisible = 6,
  compact = false,
  className = "",
  groupByCategory = false,
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
                  {credits && (
                    <span className="opacity-70">| {credits}ct.</span>
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

  // FULL MODE: optionally order badges by category (alphabetical) without headings
  const normalizeCategory = (c) => (c ? String(c).trim() : "Other");

  const badgesForDisplay = groupByCategory
    ? [...visibleBadges].sort((a, b) => {
        const ca = normalizeCategory(a.category);
        const cb = normalizeCategory(b.category);

        const catCmp = ca.localeCompare(cb, undefined, { sensitivity: "base" });
        if (catCmp !== 0) return catCmp;

        return String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" },
        );
      })
    : visibleBadges;

  return (
    <div className={className}>
      <div className="flex items-center mb-3">
        <Award size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">{title}</h3>
      </div>

      {/* Badge pills with credits */}
      <div className="flex flex-wrap gap-2">
        {badgesForDisplay.map((badge) => {
          const credits = getCredits(badge);
          return (
            <span
              key={badge.id ?? badge.badge_id ?? badge.name}
              className="badge badge-primary badge-outline p-3"
              style={{ borderColor: badge.color, color: badge.color }}
              title={badge.description || badge.category}
            >
              {badge.name}
              {credits && (
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
};

export default BadgesDisplaySection;
