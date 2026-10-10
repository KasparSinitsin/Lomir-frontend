import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Tooltip from "../common/Tooltip";
import { getFocusAreaCategoryIcon } from "../../utils/badgeIconUtils";
import {
  FOCUS_BORDER,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
  TAG_SECTION_BG,
} from "../../constants/badgeConstants";

const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * One category of the focus area overview, built like `BadgeCard`: a light green card on the
 * supercategory's white surface, an icon and a title in the focus area green, the focus areas as pills.
 * A pill opens the search with that focus area set.
 */
const FocusAreaCategoryCard = ({ category, supercategoryName }) => {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-lg p-3 flex flex-col border hover:shadow-md transition-shadow duration-300"
      style={{ backgroundColor: TAG_SECTION_BG, borderColor: FOCUS_BORDER }}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {getFocusAreaCategoryIcon(category.name, supercategoryName, 24, FOCUS_GREEN)}
        <h3 className="font-medium leading-tight" style={{ color: FOCUS_GREEN }}>
          {category.name}
        </h3>
        {/* The count chip of the tag awards modal; white here, because the card already
            carries the green tint that chip is drawn in. */}
        <span
          className="ml-auto text-sm font-medium px-3 py-0.5 rounded-full whitespace-nowrap bg-white"
          style={{ color: FOCUS_GREEN_DARK }}
        >
          {category.tags.length}
        </span>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {[...category.tags].sort(byName).map((tag) => (
          <li key={tag.id}>
            {/* The pill of the profile page and the detail modals (TagsDisplaySection),
                for a focus area without credits; it opens the search. */}
            <Tooltip content={t("focusAreaOverview.searchWith", { name: tag.name })}>
              <Link
                to={`/search?tags=${tag.id}`}
                className="badge badge-outline py-1 px-3 bg-white leading-tight h-auto inline-flex items-start gap-1 cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderColor: FOCUS_GREEN_DARK, color: FOCUS_GREEN_DARK }}
              >
                {tag.name}
              </Link>
            </Tooltip>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FocusAreaCategoryCard;
