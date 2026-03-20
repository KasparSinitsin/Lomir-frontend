import React from "react";
import { Tag, Award, MapPin } from "lucide-react";
import Tooltip from "./Tooltip";
import { getMatchTier } from "../../utils/matchScoreUtils";

/**
 * MatchScoreSection
 *
 * Renders a compact match-score card with an overall percentage, tier icon,
 * and optional per-dimension progress bars. Used in UserDetailsModal and
 * TeamDetailsModal when the result comes from a Best Match search.
 *
 * @param {number} matchScore    - Raw 0–1 float from the API
 * @param {string} matchType     - "tag_overlap" | "profile_overlap" | "role_match"
 * @param {Object} matchDetails  - Sub-scores / shared-count breakdown from the API
 */
const toPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num * 100)));
};

const getCount = (...values) => {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
};

const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const TAG_WEIGHT = 40;
const BADGE_WEIGHT = 30;
const LOCATION_WEIGHT = 30;

const normalizeMatchType = (matchType, matchDetails) => {
  const rawType = String(matchType ?? "").trim().toLowerCase();

  if (rawType === "role_match" || rawType === "rolematch") {
    return "role_match";
  }
  if (rawType === "tag_overlap" || rawType === "tagoverlap") {
    return "tag_overlap";
  }
  if (rawType === "profile_overlap" || rawType === "profileoverlap") {
    return "profile_overlap";
  }

  const hasWeightedBreakdown =
    toPercent(matchDetails?.tagScore ?? matchDetails?.tag_score) !== null ||
    toPercent(matchDetails?.badgeScore ?? matchDetails?.badge_score) !== null ||
    toPercent(matchDetails?.distanceScore ?? matchDetails?.distance_score) !==
      null;

  if (hasWeightedBreakdown) return "role_match";

  const sharedTagCount = getCount(
    matchDetails?.sharedTagCount,
    matchDetails?.shared_tag_count,
  );
  const sharedBadgeCount = getCount(
    matchDetails?.sharedBadgeCount,
    matchDetails?.shared_badge_count,
  );

  if (sharedTagCount !== null && sharedBadgeCount === null) {
    return "tag_overlap";
  }
  if (sharedTagCount !== null || sharedBadgeCount !== null) {
    return "profile_overlap";
  }

  return null;
};

const MatchScoreSection = ({
  matchScore,
  matchType,
  matchDetails,
  comparisonLabel = null,
  roleLabel = null,
}) => {
  if (matchScore == null) return null;

  const tier = getMatchTier(matchScore);
  const { Icon } = tier;
  const overallPct = tier.pct;
  const normalizedMatchType = normalizeMatchType(matchType, matchDetails);
  const sharedTagCount = getCount(
    matchDetails?.sharedTagCount,
    matchDetails?.shared_tag_count,
    matchDetails?.matchingTags,
    matchDetails?.matching_tags,
  );
  const sharedBadgeCount = getCount(
    matchDetails?.sharedBadgeCount,
    matchDetails?.shared_badge_count,
    matchDetails?.matchingBadges,
    matchDetails?.matching_badges,
  );
  const totalTagCount = getCount(
    matchDetails?.totalTagCount,
    matchDetails?.total_tag_count,
    matchDetails?.totalRequiredTags,
    matchDetails?.total_required_tags,
  );
  const totalBadgeCount = getCount(
    matchDetails?.totalBadgeCount,
    matchDetails?.total_badge_count,
    matchDetails?.totalRequiredBadges,
    matchDetails?.total_required_badges,
  );
  const tagPct = toPercent(matchDetails?.tagScore ?? matchDetails?.tag_score);
  const badgePct = toPercent(
    matchDetails?.badgeScore ?? matchDetails?.badge_score,
  );
  const distPct = toPercent(
    matchDetails?.distanceScore ?? matchDetails?.distance_score,
  );
  const tagPctFromCounts =
    totalTagCount > 0 && sharedTagCount !== null
      ? Math.round((sharedTagCount / totalTagCount) * 100)
      : null;
  const badgePctFromCounts =
    totalBadgeCount > 0 && sharedBadgeCount !== null
      ? Math.round((sharedBadgeCount / totalBadgeCount) * 100)
      : null;
  const summaryParts = [];

  if (sharedTagCount > 0) {
    summaryParts.push(pluralize(sharedTagCount, "shared focus area"));
  }
  if (sharedBadgeCount > 0) {
    summaryParts.push(pluralize(sharedBadgeCount, "shared badge"));
  }

  // ── Headline text ─────────────────────────────────────────
  const comparisonSuffix = comparisonLabel
    ? ` of you and ${comparisonLabel}`
    : "";
  const normalizedRoleLabel = String(roleLabel ?? "").trim();
  const formattedRoleLabel = normalizedRoleLabel
    ? normalizedRoleLabel.toLowerCase().startsWith("the ")
      ? normalizedRoleLabel.toLowerCase().endsWith(" role")
        ? normalizedRoleLabel
        : `${normalizedRoleLabel} role`
      : normalizedRoleLabel.toLowerCase().endsWith(" role")
        ? `the ${normalizedRoleLabel}`
        : `the ${normalizedRoleLabel} role`
    : null;
  let headline;
  if (normalizedMatchType === "role_match" && formattedRoleLabel) {
    headline = `${tier.pct}% matching score of ${comparisonLabel || "this person"} with ${formattedRoleLabel}`;
  } else if (normalizedMatchType === "role_match") {
    headline = `${tier.pct}% role match${comparisonSuffix}`;
  } else {
    headline =
      summaryParts.length > 0
        ? `${tier.pct}% profile match${comparisonSuffix} — ${summaryParts.join(", ")}`
        : `${tier.pct}% profile match${comparisonSuffix}`;
  }

  // ── Progress bar rows ─────────────────────────────────────
  const rows = [
    {
      label: "Location",
      icon: MapPin,
      value: distPct ?? 0,
      tooltip: (
        <>
          Location factors into the score with {LOCATION_WEIGHT}%.
          <br />
          Remote teams = 100%. Same city = 100%. Within 100 km = 75%.
          <br />
          Within 300 km = 50%. Within 1000 km = 25%. Farther away = 0%.
        </>
      ),
    },
    {
      label: "Focus Areas",
      icon: Tag,
      value:
        tagPct ??
        tagPctFromCounts ??
        (normalizedMatchType === "tag_overlap"
          ? overallPct
          : normalizedMatchType === "profile_overlap" && sharedTagCount > 0
            ? overallPct
            : 0),
      tooltip: (
        <>
          Focus Areas factor into the score with {TAG_WEIGHT}%.
          <br />
          {totalTagCount > 0 && sharedTagCount !== null
            ? normalizedMatchType === "role_match"
              ? `${sharedTagCount} out of ${totalTagCount} required focus areas met.`
              : `${sharedTagCount} out of ${totalTagCount} focus areas are shared.`
            : "No focus areas were available to compare."}
        </>
      ),
    },
    {
      label: "Badges",
      icon: Award,
      value:
        badgePct ??
        badgePctFromCounts ??
        (normalizedMatchType === "profile_overlap" && sharedBadgeCount > 0
          ? overallPct
          : 0),
      tooltip: (
        <>
          Badges factor into the score with {BADGE_WEIGHT}%.
          <br />
          {totalBadgeCount > 0 && sharedBadgeCount !== null
            ? normalizedMatchType === "role_match"
              ? `${sharedBadgeCount} out of ${totalBadgeCount} required badges met.`
              : `${sharedBadgeCount} out of ${totalBadgeCount} badges are shared.`
            : "No badges were available to compare."}
        </>
      ),
    },
  ];

  return (
    <div className="rounded-xl p-4 bg-base-200/50 border border-base-300">
      {/* Headline */}
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={tier.text} />
        <span className={`text-sm font-semibold ${tier.text}`}>{headline}</span>
      </div>

      {/* Per-dimension bars */}
      <div className="space-y-2">
        {rows.map(({ label, value, icon, tooltip }) => (
          <div key={label} className="flex items-center gap-2">
            <Tooltip content={tooltip}>
              <span className="text-xs text-base-content/60 w-24 flex-shrink-0 flex items-center gap-1 cursor-help">
                {React.createElement(icon, {
                  size: 12,
                  className: "flex-shrink-0",
                })}
                {label}
              </span>
            </Tooltip>
            <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tier.bg}`}
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="text-xs font-medium text-base-content/60 w-8 text-right">
              {value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchScoreSection;
