import React from "react";
import { Tag } from "lucide-react";
import LocationSection from "./LocationSection";

/**
 * LocationDistanceTagsRow
 * Reusable block for cards: Location + Distance (wraps) and Tags (skills/interests)
 *
 * Props:
 * - entity: user or team object (passed into LocationSection)
 * - entityType: "user" | "team"
 * - distance: number | null (km)
 * - tags: user tags (string or array) OPTIONAL (for user cards)
 * - getDisplayTags: function OPTIONAL (for team cards; returns array of tags)
 * - className: optional wrapper class
 * - maxVisible: how many tags to show before "+N"
 */
const LocationDistanceTagsRow = ({
  entity,
  entityType = "user",
  distance = null,
  tags = null,
  getDisplayTags = null,
  className = "",
  maxVisible = 5,
}) => {
  // --- Normalize tags into a simple array of strings ---
  const normalizeTagsToStrings = (input) => {
    if (!input) return [];

    // If it's already an array
    if (Array.isArray(input)) {
      return input
        .map((t) => {
          if (typeof t === "string") return t.trim();
          if (t && typeof t === "object") return (t.name || t.tag || "").trim();
          return "";
        })
        .filter(Boolean);
    }

    // If it's a comma-separated string
    if (typeof input === "string") {
      return input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    return [];
  };

  // TeamCard path: you already have a robust getDisplayTags() there
  // UserCard path: you pass tags directly (string or array)
  const tagList =
    typeof getDisplayTags === "function"
      ? normalizeTagsToStrings(getDisplayTags())
      : normalizeTagsToStrings(tags);

  const hasTags = tagList.length > 0;

  // If there is no location AND no tags, render nothing (keeps cards clean)
  // (LocationSection returns null automatically when no location)
  if (!hasTags && !entity) return null;

  const visibleTags = tagList.slice(0, maxVisible);
  const remainingCount = tagList.length - maxVisible;

  return (
    <div className={`space-y-2 mb-4 ${className}`}>
      {/* Location + Distance (wraps in one line if space is available) */}
      <LocationSection
        entity={entity}
        entityType={entityType}
        compact={true}
        distance={distance}
      />

      {/* Tags / Interests & Skills */}
      {hasTags && (
        <div className="flex items-start text-sm text-base-content/70">
          <Tag size={16} className="mr-1 flex-shrink-0 mt-0.5" />
          <span>
            {visibleTags.join(", ")}
            {remainingCount > 0 && ` +${remainingCount}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationDistanceTagsRow;
