import React from "react";
import { Layers } from "lucide-react";
import FocusAreaCategoryCard from "./FocusAreaCategoryCard";
import { useTagLabels } from "../../hooks/useTagLabels";
import { SUPERCATEGORY_ICONS } from "../../utils/badgeIconUtils";
import { FOCUS_BORDER, FOCUS_GREEN } from "../../constants/badgeConstants";

/** One supercategory of the focus area overview, built like `BadgeCategorySection`. */
const FocusAreaSupercategorySection = ({ supercategory }) => {
  const { supercategoryLabel, categoryLabel, language } = useTagLabels();
  // The icon is keyed by the stored English name; only the shown text is translated.
  const Icon = SUPERCATEGORY_ICONS[supercategory.name] || Layers;
  const total = supercategory.categories.reduce((sum, c) => sum + c.tags.length, 0);

  return (
    <div
      className="mb-6 rounded-xl bg-white border overflow-hidden"
      style={{ borderColor: FOCUS_BORDER }}
    >
      <h2
        className="flex items-center gap-2 p-3 text-xl font-medium leading-[110%]"
        style={{ color: FOCUS_GREEN }}
      >
        <span className="shrink-0">
          <Icon size={24} style={{ color: FOCUS_GREEN }} />
        </span>
        <span className="font-semibold">{supercategoryLabel(supercategory.name)}</span>
        {/* The sum chip of the tag awards modal (the "15 ct." in its header). */}
        <span
          className="ml-auto px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap text-white flex-shrink-0"
          style={{ backgroundColor: FOCUS_GREEN }}
        >
          {total}
        </span>
      </h2>

      <div className="px-3 pb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {[...supercategory.categories]
          .sort((a, b) => categoryLabel(a.name).localeCompare(categoryLabel(b.name), language))
          .map((category) => (
          <FocusAreaCategoryCard
            key={category.id}
            category={category}
            supercategoryName={supercategory.name}
          />
        ))}
      </div>
    </div>
  );
};

export default FocusAreaSupercategorySection;
