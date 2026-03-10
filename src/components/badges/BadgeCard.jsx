import React from "react";
import { getBadgeIcon } from "../../utils/badgeIconUtils";
import Colors from "../../utils/Colors";

const BadgeCard = ({ badge }) => {
  const {
    name,
    description,
    category,
    color,
    // aggregated payload (from /api/users/:id)
    total_credits,
    totalCredits,
    // event payload (from /api/users/:id/badges)
    credits,
  } = badge;

  // Prefer computed totals when available, otherwise fall back to single-event credits
  const creditValue = total_credits ?? totalCredits ?? credits ?? null;

  const creditLabel =
    creditValue !== null && creditValue !== undefined
      ? `${creditValue} ${Number(creditValue) === 1 ? "credit" : "credits"}`
      : null;

  // Get color from our centralized color system or use provided color as fallback
  const badgeColor = color || Colors.getBadgeColor(category);

  return (
    <div
      className="card bg-base-100 shadow-soft hover:shadow-md transition-shadow duration-300"
      style={{ borderLeft: `4px solid ${badgeColor}` }}
    >
      <div className="card-body p-4">
        <div className="flex items-center mb-2">
          <div className="mr-3">{getBadgeIcon(name, badgeColor, 24)}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="card-title text-lg" style={{ color: badgeColor }}>
              {name}
            </h3>

            {creditLabel && (
              <span className="badge badge-ghost badge-sm text-xs">
                {creditLabel}
              </span>
            )}
          </div>
        </div>
        {description ? (
          <p className="text-sm text-base-content/80">{description}</p>
        ) : (
          <p className="text-sm text-base-content/60 italic">No description</p>
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
