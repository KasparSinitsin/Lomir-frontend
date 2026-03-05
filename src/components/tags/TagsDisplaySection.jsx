import React, { useState, useEffect, useRef } from "react";
import {
  Tag,
  Monitor,
  Briefcase,
  Palette,
  GraduationCap,
  HeartHandshake,
  Dumbbell,
  Mountain,
  Leaf,
  Globe,
  Scissors,
  Gamepad2,
  PawPrint,
  Plane,
  Layers,
} from "lucide-react";
import {
  CATEGORY_COLORS,
  SUPERCATEGORY_ORDER,
  PILL_ROW_HEIGHT,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
} from "../../constants/badgeConstants";
import Tooltip from "../common/Tooltip";
import Button from "../common/Button";
import TagInput from "./TagInput";
import { UI_TEXT } from "../../constants/uiText";

/**
 * Supercategory icon map.
 * Each supercategory gets a lucide-react icon for visual grouping,
 * similar to how BadgesDisplaySection uses category icons.
 */
const SUPERCATEGORY_ICONS = {
  "Technology & Development": Monitor,
  "Business & Entrepreneurship": Briefcase,
  "Creative Arts & Design": Palette,
  "Learning, Knowledge & Personal Growth": GraduationCap,
  "Social, Community & Volunteering": HeartHandshake,
  "Sports & Fitness": Dumbbell,
  "Outdoor & Adventure": Mountain,
  "Wellness & Lifestyle": Leaf,
  Languages: Globe,
  "Hobbies & Crafts": Scissors,
  Leisure: Gamepad2,
  Pets: PawPrint,
  Travels: Plane,
};

/**
 * Unified TagsDisplaySection Component
 *
 * Used for displaying focus areas (tags) in both User and Team modals.
 * When full tag objects with supercategory data are available, displays
 * tags grouped inline by supercategory with initials avatars (matching
 * team avatar fallback style). Within each group, tags are sorted by
 * badge credits (highest first), then alphabetically.
 *
 * @param {string} title - Section title (e.g., "Focus Areas")
 * @param {string|Array} tags - Tags data: comma-separated string, array of objects, or array of IDs
 * @param {Array} allTags - Optional: structured tags for ID lookup (required if tags are IDs)
 * @param {boolean} canEdit - Whether to show edit button
 * @param {Function} onSave - Optional: callback when tags are saved (required if canEdit is true)
 * @param {Function} onTagClick - Optional: callback when a credited tag is clicked (tag object)
 * @param {string} emptyMessage - Message to show when no tags
 * @param {string} placeholder - Placeholder for edit input
 * @param {string} className - Additional CSS classes
 */
const TagsDisplaySection = ({
  title = UI_TEXT.focusAreas.title,
  tags = [],
  allTags = [],
  canEdit = false,
  onSave,
  onTagClick,
  onSupercategoryClick,
  highlightTagName = null,
  highlightTagColor = null,
  emptyMessage = UI_TEXT.focusAreas.empty,
  placeholder = UI_TEXT.focusAreas.placeholder,
  className = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localSelectedTags, setLocalSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Ref for auto-scrolling to highlighted tag
  const highlightTagRef = useRef(null);

  useEffect(() => {
    if (highlightTagName && highlightTagRef.current) {
      const timer = setTimeout(() => {
        highlightTagRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [highlightTagName]);

  // Normalize tags to a consistent format for editing (array of IDs)
  useEffect(() => {
    if (Array.isArray(tags)) {
      const ids = tags
        .map((tag) => {
          if (typeof tag === "object") {
            return Number(tag.id ?? tag.tag_id ?? tag.tagId);
          }
          return Number(tag);
        })
        .filter((id) => !Number.isNaN(id));
      setLocalSelectedTags(ids);
    } else {
      setLocalSelectedTags([]);
    }
  }, [tags]);

  // Helper to find tag name from allTags structure
  const getTagNameById = (tagId) => {
    const numericId = Number(tagId);
    const tag = (allTags || [])
      .flatMap((supercat) => supercat.categories || [])
      .flatMap((cat) => cat.tags || [])
      .find((t) => {
        const tId = Number(t.id ?? t.tag_id ?? t.tagId);
        return !Number.isNaN(tId) && tId === numericId;
      });
    return tag?.name || null;
  };

  // Parse tags into displayable format
  const getDisplayTags = () => {
    if (!tags) return [];

    // Case 1: Comma-separated string
    if (typeof tags === "string") {
      if (!tags.trim()) return [];
      return tags.split(",").map((tag, index) => ({
        key: index,
        name: tag.trim(),
        badgeCredits: 0,
        dominantBadgeCategory: null,
        supercategory: null,
        category: null,
      }));
    }

    // Case 2 & 3: Array
    if (Array.isArray(tags) && tags.length > 0) {
      // Case 2: Array of objects with name property
      if (typeof tags[0] === "object" && tags[0].name) {
        return tags.map((tag) => ({
          key: tag.id || tag.tag_id || tag.tagId,
          name: tag.name,
          badgeCredits: tag.badge_credits || tag.badgeCredits || 0,
          dominantBadgeCategory:
            tag.dominant_badge_category || tag.dominantBadgeCategory || null,
          supercategory: tag.supercategory || null,
          category: tag.category || null,
          linkedBadgeCount: tag.linked_badge_count || tag.linkedBadgeCount || 0,
          awarderCount: tag.awarder_count || tag.awarderCount || 0,
        }));
      }

      // Case 3: Array of IDs
      return tags
        .map((tagId) => {
          const id =
            typeof tagId === "object"
              ? (tagId.id ?? tagId.tag_id ?? tagId.tagId)
              : tagId;
          const name = getTagNameById(id);
          return name
            ? {
                key: id,
                name,
                badgeCredits: 0,
                dominantBadgeCategory: null,
                supercategory: null,
                category: null,
              }
            : null;
        })
        .filter(Boolean);
    }

    return [];
  };

  /**
   * Group and sort display tags by supercategory.
   * Returns null if no grouping info is available (flat fallback).
   */
  const getGroupedTags = (displayTags) => {
    const hasGroupInfo = displayTags.some((t) => t.supercategory);
    if (!hasGroupInfo) return null;

    const groups = {};
    for (const tag of displayTags) {
      const supercat = tag.supercategory || "Other";
      if (!groups[supercat]) groups[supercat] = [];
      groups[supercat].push(tag);
    }

    // Sort tags within each group: credits DESC, then name ASC
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        if (b.badgeCredits !== a.badgeCredits)
          return b.badgeCredits - a.badgeCredits;
        return a.name.localeCompare(b.name);
      });
    }

    // Sort groups by total credits DESC, then by predefined order as tiebreaker
    return Object.entries(groups).sort(([a, tagsA], [b, tagsB]) => {
      const creditsA = tagsA.reduce((sum, t) => sum + t.badgeCredits, 0);
      const creditsB = tagsB.reduce((sum, t) => sum + t.badgeCredits, 0);
      if (creditsB !== creditsA) return creditsB - creditsA;

      // Tiebreaker: predefined order
      const idxA = SUPERCATEGORY_ORDER.indexOf(a);
      const idxB = SUPERCATEGORY_ORDER.indexOf(b);
      const posA = idxA === -1 ? 999 : idxA;
      const posB = idxB === -1 ? 999 : idxB;
      return posA - posB;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await onSave(localSelectedTags);

      setSuccess("Updated successfully!");
      setIsEditing(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving tags:", err);
      setError(err.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (Array.isArray(tags)) {
      const ids = tags
        .map((tag) => {
          if (typeof tag === "object") {
            return Number(tag.id ?? tag.tag_id ?? tag.tagId);
          }
          return Number(tag);
        })
        .filter((id) => !Number.isNaN(id));
      setLocalSelectedTags(ids);
    }
    setIsEditing(false);
    setError(null);
  };

  const displayTags = getDisplayTags();
  const groupedTags = getGroupedTags(displayTags);

  const renderTagPill = (tag) => {
    // --- Dominant badge category coloring (preserved for future use) ---
    // const categoryColor = tag.dominantBadgeCategory
    //   ? CATEGORY_COLORS[tag.dominantBadgeCategory] || null
    //   : null;

    const hasBadgeCredits = tag.badgeCredits > 0;
    const isClickable = hasBadgeCredits && onTagClick;

    // Uncredited: base-content (dark green, matches section headers like "Location", "Badges")
    // Credited: primary (light green, matches "User Details" title)

    const tooltipText =
      tag.badgeCredits > 0
        ? `${tag.name}: ${tag.badgeCredits}ct. awarded with ${Number(tag.linkedBadgeCount)} badge${Number(tag.linkedBadgeCount) === 1 ? "" : "s"} by ${Number(tag.awarderCount)} ${Number(tag.awarderCount) === 1 ? "person" : "people"}`
        : tag.name;

    const isHighlighted =
      highlightTagName &&
      tag.name?.toLowerCase() === highlightTagName.toLowerCase();

    // Use the dominant badge category color for the highlight glow,
    // fall back to the focus-area green
    const highlightColor = isHighlighted
      ? highlightTagColor ||
        (tag.dominantBadgeCategory &&
          CATEGORY_COLORS[tag.dominantBadgeCategory]) ||
        FOCUS_GREEN
      : null;

    return (
      <Tooltip key={tag.key} content={tooltipText}>
        <span
          ref={isHighlighted ? highlightTagRef : undefined}
          className={`badge badge-outline p-3 bg-white/60 ${isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""} ${
            isHighlighted ? "animate-badge-highlight" : ""
          }`}
          style={{
            ...(hasBadgeCredits
              ? { borderColor: FOCUS_GREEN, color: FOCUS_GREEN }
              : { borderColor: FOCUS_GREEN_DARK, color: FOCUS_GREEN_DARK }),
            ...(isHighlighted
              ? {
                  borderWidth: "2px",
                  borderColor: highlightColor,
                  boxShadow: `0 0 12px ${highlightColor}66`,
                  backgroundColor: `${highlightColor}20`,
                }
              : {}),
          }}
          onClick={() => {
            if (isClickable) onTagClick(tag);
          }}
        >
          {tag.name}
          {hasBadgeCredits && (
            <span className="ml-1 opacity-70">| {tag.badgeCredits}ct.</span>
          )}
        </span>
      </Tooltip>
    );
  };

  /** Render supercategory icons */
  const renderSupercategoryIcon = (supercategory, groupTags = []) => {
    const IconComponent = SUPERCATEGORY_ICONS[supercategory] || Layers;

    const totalCredits = groupTags.reduce((sum, t) => sum + t.badgeCredits, 0);
    const totalBadges = groupTags.reduce(
      (sum, t) => sum + Number(t.linkedBadgeCount || 0),
      0,
    );
    const totalAwarders = groupTags.reduce(
      (sum, t) => sum + Number(t.awarderCount || 0),
      0,
    );

    const tooltip =
      totalCredits > 0
        ? `${supercategory}: ${totalCredits}ct. awarded with ${totalBadges} badge${totalBadges === 1 ? "" : "s"} by ${totalAwarders} ${totalAwarders === 1 ? "person" : "people"}`
        : supercategory;

    const isClickable = !!onSupercategoryClick;

    return (
      <Tooltip content={tooltip}>
        <span
          onClick={
            isClickable
              ? (e) => {
                  e.stopPropagation();
                  onSupercategoryClick(supercategory, groupTags);
                }
              : undefined
          }
          className={`inline-flex items-center justify-center pr-[6px] flex-shrink-0 transition-opacity ${
            isClickable ? "cursor-pointer hover:opacity-70" : "cursor-default"
          }`}
          style={{
            height: PILL_ROW_HEIGHT,
            color: FOCUS_GREEN_DARK,
          }}
        >
          <IconComponent size={14} />
        </span>
      </Tooltip>
    );
  };

  // EDIT MODE
  if (isEditing) {
    return (
      <div className={className}>
        {/* Title row with Cancel/Save buttons */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Tag size={18} />
            <h3 className="font-medium">{title}</h3>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mb-4">
            <span>{success}</span>
          </div>
        )}

        {/* Tag Input */}
        <TagInput
          selectedTags={localSelectedTags}
          onTagsChange={(newTags) => setLocalSelectedTags(newTags)}
          placeholder={placeholder}
          showPopularTags={true}
          maxSuggestions={10}
        />
      </div>
    );
  }

  // DISPLAY MODE
  return (
    <div className={className}>
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">{title}</h3>
        </div>
        {canEdit && onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-violet-200 hover:text-violet-700"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Success Message (after save) */}
      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      {/* Tags display */}
      {displayTags.length > 0 ? (
        groupedTags ? (
          /* Grouped inline display: avatar + pills side by side (like BadgesDisplaySection) */
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {groupedTags.map(([supercategory, groupTags]) => (
              <div
                key={supercategory}
                className="flex items-start gap-0"
                title={supercategory}
              >
                {/* Supercategory initials avatar */}
                {renderSupercategoryIcon(supercategory, groupTags)}

                {/* Tag pills for this supercategory */}
                <div className="flex flex-wrap gap-1.5">
                  {groupTags.map((tag) => renderTagPill(tag))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat display: fallback for string-based or ID-based tags */
          <div className="flex flex-wrap gap-2">
            {displayTags.map((tag) => renderTagPill(tag))}
          </div>
        )
      ) : (
        <p className="text-sm text-base-content/60">{emptyMessage}</p>
      )}
    </div>
  );
};

export default TagsDisplaySection;
