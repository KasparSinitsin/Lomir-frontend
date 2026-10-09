import React from "react";
import { useTranslation } from "react-i18next";
import BadgeCard from "./BadgeCard";
import { getCategoryLabel } from "../../utils/badgeLabels";

const BadgeCategorySection = ({ category, badges, onOpenUser }) => {
  const { t } = useTranslation();
  // Get the first badge's color for the category header
  const categoryColor = badges?.[0]?.color || "#6B7280";

  return (
    <div className="mb-12">
      <h2
        className="text-xl font-bold mb-4 pb-2 border-b-2"
        style={{ borderColor: categoryColor, color: categoryColor }}
      >
        {getCategoryLabel(category, t)}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
