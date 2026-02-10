import React from "react";
import { Tag, Award } from "lucide-react";
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
  badges = null,
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

  const normalizeBadges = (input) => {
    if (!input || !Array.isArray(input)) return [];

    return input
      .filter((b) => b && b.name)
      .map((b) => ({
        ...b,
        id: b.id ?? b.badge_id,
      }))
      .filter((b) => b.id);
  };

  const badgeList = normalizeBadges(badges);
  const hasBadges = badgeList.length > 0;

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
  const remainingTagCount = tagList.length - maxVisible;

  const visibleBadges = badgeList.slice(0, 3);
  const remainingBadgeCount = badgeList.length - 3;

  return (
    <div className={`space-y-2 mb-4 ${className}`}>
      <LocationSection
        entity={entity}
        entityType={entityType}
        compact={true}
        distance={distance}
      />

      {hasTags && (
        <div className="flex items-start text-sm text-base-content/70">
          <Tag size={16} className="mr-1 flex-shrink-0 mt-0.5" />
          <span>
            {visibleTags.join(", ")}
            {remainingTagCount > 0 && ` +${remainingTagCount}`}
          </span>
        </div>
      )}

      {hasBadges && (
  <div className="flex items-start text-sm text-base-content/70">
    <Award size={16} className="mr-1 flex-shrink-0 mt-0.5" />
    <span>
      {visibleBadges.map((b) => b.name).join(", ")}
      {remainingBadgeCount > 0 && ` +${remainingBadgeCount}`}
    </span>
  </div>
)}
    </div>
  );
};

export default LocationDistanceTagsRow;
