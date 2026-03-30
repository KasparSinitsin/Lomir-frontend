import React, { useRef, useState, useLayoutEffect } from "react";
import { Tag, Award } from "lucide-react";
import LocationSection from "./LocationSection";
import {
  SUPERCATEGORY_ORDER,
  CATEGORY_ORDER,
} from "../../constants/badgeConstants";

/**
 * Maximum visible text rows for both focus areas and badges.
 */
const MAX_LINES = 2;

// ─────────────────────────────────────────────────────────
// TruncatedList — shared by both tags and badges rows
// ─────────────────────────────────────────────────────────

/**
 * Renders a comma-separated list of strings, filling exactly
 * MAX_LINES rows of text. Overflow is shown as "+N".
 *
 * All measurement happens in a single useLayoutEffect pass:
 * the span's textContent is set imperatively to probe what fits,
 * then final state is committed once — no multi-render loop,
 * no CSS ellipsis, no visible flash.
 */
const TruncatedList = ({ items, icon: Icon, compact = false }) => {
  const spanRef = useRef(null);
  const [displayText, setDisplayText] = useState(() => items.join(", "));

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el || items.length === 0) {
      setDisplayText(items.join(", "));
      return;
    }

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeight * MAX_LINES + 1; // +1px rounding tolerance

    // Check if full list fits
    el.textContent = items.join(", ");
    if (el.scrollHeight <= maxHeight) {
      setDisplayText(items.join(", "));
      return;
    }

    // Reduce items one at a time until it fits
    let count = items.length;
    while (count > 1) {
      count--;
      const remaining = items.length - count;
      const text = items.slice(0, count).join(", ") + ` +${remaining}`;
      el.textContent = text;
      if (el.scrollHeight <= maxHeight) {
        setDisplayText(text);
        return;
      }
    }

    // Fallback: single item + remainder
    const remaining = items.length - 1;
    setDisplayText(remaining > 0 ? items[0] + ` +${remaining}` : items[0]);
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div
      className={`flex items-start text-base-content/70 ${compact ? "text-xs" : "text-sm"}`}
    >
      <Icon size={compact ? 12 : 16} className="mr-1 flex-shrink-0 mt-0.5" />
      <span ref={spanRef}>{displayText}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// LocationDistanceTagsRow — main component
// ─────────────────────────────────────────────────────────

const LocationDistanceTagsRow = ({
  entity,
  entityType = "user",
  distance = null,
  tags = null,
  badges = null,
  getDisplayTags = null,
  className = "",
  hideLocation = false,
  compact = false,
}) => {
  // ─── Normalize tags into a sorted array of strings ───
  const normalizeSortedTagStrings = (input) => {
    if (!input) return [];

    if (typeof getDisplayTags === "function") {
      return normalizeTagsToStrings(getDisplayTags());
    }

    if (typeof input === "string") {
      return input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    if (
      Array.isArray(input) &&
      input.length > 0 &&
      typeof input[0] === "object" &&
      input[0].name
    ) {
      const hasGroupInfo = input.some(
        (t) => t.supercategory || t.badge_credits > 0,
      );

      if (hasGroupInfo) {
        return sortTagsBySupercategory(input);
      }

      return input.map((t) => (t.name || "").trim()).filter(Boolean);
    }

    if (Array.isArray(input)) {
      return input
        .map((t) => {
          if (typeof t === "string") return t.trim();
          if (t && typeof t === "object") return (t.name || t.tag || "").trim();
          return "";
        })
        .filter(Boolean);
    }

    return [];
  };

  const sortTagsBySupercategory = (tagObjects) => {
    const groups = {};
    for (const tag of tagObjects) {
      const supercat = tag.supercategory || "Other";
      if (!groups[supercat]) groups[supercat] = [];
      groups[supercat].push(tag);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const creditsA = a.badge_credits ?? a.badgeCredits ?? 0;
        const creditsB = b.badge_credits ?? b.badgeCredits ?? 0;
        if (creditsB !== creditsA) return creditsB - creditsA;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    const sortedGroups = Object.entries(groups).sort(
      ([a, tagsA], [b, tagsB]) => {
        const creditsA = tagsA.reduce(
          (sum, t) => sum + (t.badge_credits ?? t.badgeCredits ?? 0),
          0,
        );
        const creditsB = tagsB.reduce(
          (sum, t) => sum + (t.badge_credits ?? t.badgeCredits ?? 0),
          0,
        );
        if (creditsB !== creditsA) return creditsB - creditsA;

        const idxA = SUPERCATEGORY_ORDER.indexOf(a);
        const idxB = SUPERCATEGORY_ORDER.indexOf(b);
        const posA = idxA === -1 ? 999 : idxA;
        const posB = idxB === -1 ? 999 : idxB;
        return posA - posB;
      },
    );

    return sortedGroups.flatMap(([, groupTags]) =>
      groupTags.map((t) => (t.name || "").trim()).filter(Boolean),
    );
  };

  // ─── Normalize badges into a sorted array ───
  const normalizeSortedBadges = (input) => {
    if (!input || !Array.isArray(input)) return [];

    const badgeList = input
      .map((badge) => {
        if (!badge) return null;

        if (typeof badge === "string") {
          const name = badge.trim();
          return name
            ? {
                id: `name:${name.toLowerCase()}`,
                name,
                category: "Other",
                total_credits: 0,
              }
            : null;
        }

        const name = (badge.name ?? badge.badgeName ?? badge.badge_name ?? "")
          .trim();

        if (!name) return null;

        return {
          ...badge,
          id:
            badge.id ??
            badge.badge_id ??
            badge.badgeId ??
            `name:${name.toLowerCase()}`,
          name,
        };
      })
      .filter(Boolean);

    if (badgeList.length === 0) return [];

    const groups = {};
    for (const badge of badgeList) {
      const category = (badge.category || "Other").trim();
      if (!groups[category]) groups[category] = [];
      groups[category].push(badge);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const creditsA = a.total_credits ?? a.totalCredits ?? 0;
        const creditsB = b.total_credits ?? b.totalCredits ?? 0;
        if (creditsB !== creditsA) return creditsB - creditsA;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    const sortedCategories = Object.entries(groups).sort(
      ([a, badgesA], [b, badgesB]) => {
        const creditsA = badgesA.reduce(
          (sum, badge) =>
            sum + (badge.total_credits ?? badge.totalCredits ?? 0),
          0,
        );
        const creditsB = badgesB.reduce(
          (sum, badge) =>
            sum + (badge.total_credits ?? badge.totalCredits ?? 0),
          0,
        );
        if (creditsB !== creditsA) return creditsB - creditsA;

        const idxA = CATEGORY_ORDER.indexOf(a);
        const idxB = CATEGORY_ORDER.indexOf(b);
        const posA = idxA === -1 ? 999 : idxA;
        const posB = idxB === -1 ? 999 : idxB;
        return posA - posB;
      },
    );

    return sortedCategories.flatMap(([, catBadges]) => catBadges);
  };

  // ─── Backward-compat helper ───
  const normalizeTagsToStrings = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .map((t) => {
          if (typeof t === "string") return t.trim();
          if (t && typeof t === "object") return (t.name || t.tag || "").trim();
          return "";
        })
        .filter(Boolean);
    }
    if (typeof input === "string") {
      return input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  };

  // ─── Compute sorted lists ───
  const tagList =
    typeof getDisplayTags === "function"
      ? normalizeTagsToStrings(getDisplayTags())
      : normalizeSortedTagStrings(tags);

  const badgeNames = normalizeSortedBadges(badges).map((b) => b.name);

  const hasTags = tagList.length > 0;
  const hasBadges = badgeNames.length > 0;

  if (!hasTags && !hasBadges && !entity) return null;

  if (hideLocation && !hasTags && !hasBadges) return null;

  return (
    <div className={`${compact ? "space-y-1" : "space-y-2"} ${className}`}>
      {" "}
      {/* mb-4 removed — TODO: restore when View Details button is re-enabled */}
      {!hideLocation && (
        <LocationSection
          entity={entity}
          entityType={entityType}
          compact={true}
          distance={distance}
          className={compact ? "text-xs" : ""}
          iconSize={compact ? 12 : 16}
        />
      )}
      {hasTags && (
        <TruncatedList items={tagList} icon={Tag} compact={compact} />
      )}
      {hasBadges && (
        <TruncatedList items={badgeNames} icon={Award} compact={compact} />
      )}
    </div>
  );
};

export default LocationDistanceTagsRow;
