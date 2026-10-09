import React from "react";
import { useTranslation } from "react-i18next";
import { getBadgeDescription, getBadgeName } from "../../utils/badgeLabels";
import { getBadgeIcon } from "../../utils/badgeIconUtils";
import {
  CATEGORY_CARD_PASTELS,
  CATEGORY_COLORS,
  DEFAULT_CARD_PASTEL,
  DEFAULT_COLOR,
} from "../../constants/badgeConstants";

const BadgeCard = ({ badge }) => {
  const { t } = useTranslation();
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

  // The category colour comes from the shared constants, as in the badge modals.
  const badgeColor = CATEGORY_COLORS[category] || color || DEFAULT_COLOR;

  const cardPastel = CATEGORY_CARD_PASTELS[category] || DEFAULT_CARD_PASTEL;

  return (
    <div
      className="rounded-lg p-3 flex flex-col hover:shadow-md transition-shadow duration-300"
      style={{ backgroundColor: cardPastel }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {getBadgeIcon(name, badgeColor, 24)}
        <h3
          className="font-medium leading-tight"
          style={{ color: badgeColor }}
        >
          {getBadgeName(name, t)}
        </h3>

        {creditLabel && (
          <span className="badge badge-ghost badge-sm text-xs">
            {creditLabel}
          </span>
        )}
      </div>
      {description ? (
        <p className="text-sm text-base-content/80">
          {getBadgeDescription(name, description, t)}
        </p>
      ) : (
        <p className="text-sm text-base-content/60 italic">
          {t("badges.card.noDescription")}
        </p>
      )}
    </div>
  );
};

export default BadgeCard;
