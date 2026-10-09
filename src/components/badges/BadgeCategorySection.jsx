import React from "react";
import { useTranslation } from "react-i18next";
import BadgeCard from "./BadgeCard";
import { getCategoryLabel } from "../../utils/badgeLabels";
import { getCategoryIcon } from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  CATEGORY_SECTION_PASTELS,
  DEFAULT_COLOR,
  DEFAULT_SECTION_PASTEL,
} from "../../constants/badgeConstants";

const BadgeCategorySection = ({ category, badges, onOpenUser }) => {
  const { t } = useTranslation();
  const categoryColor = CATEGORY_COLORS[category] || DEFAULT_COLOR;
  const sectionPastel =
    CATEGORY_SECTION_PASTELS[category] || DEFAULT_SECTION_PASTEL;

  return (
    <div
      className="mb-6 rounded-lg overflow-hidden"
      style={{ backgroundColor: sectionPastel }}
    >
      <h2
        className="flex items-center gap-2 p-3 text-xl font-medium leading-[110%]"
        style={{ color: categoryColor }}
      >
        <span className="shrink-0">
          {getCategoryIcon(category, categoryColor, 24)}
        </span>
        <span className="font-semibold">{getCategoryLabel(category, t)}</span>
      </h2>

      <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {badges.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onOpenUser={onOpenUser}
          />
        ))}
      </div>
    </div>
  );
};

export default BadgeCategorySection;
