import React from "react";
import { Award } from "lucide-react";

const BadgesDisplaySection = ({
  title = "Badges",
  badges = [],
  emptyMessage = "No badges earned yet",
  maxVisible = 6,
  compact = false,
  className = "",
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

  if (compact) {
    return (
      <div className={`flex items-start text-sm text-base-content/70 ${className}`}>
        <Award size={16} className="mr-1 flex-shrink-0 mt-0.5" />
        <span>
          {visibleBadges.map((badge, index) => (
            <span key={badge.id}>
              <span style={{ color: badge.color }} className="font-medium">
                {badge.name}
              </span>
              {index < visibleBadges.length - 1 && ", "}
            </span>
          ))}
          {remainingCount > 0 && ` +${remainingCount}`}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center mb-3">
        <Award size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleBadges.map((badge) => (
          <span
            key={badge.id}
            className="badge badge-outline badge-sm text-xs px-2 py-1"
            style={{ borderColor: badge.color, color: badge.color }}
            title={badge.description || badge.category}
          >
            {badge.name}
          </span>
        ))}
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