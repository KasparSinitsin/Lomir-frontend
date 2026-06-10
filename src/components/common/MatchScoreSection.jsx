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
  headline: headlineProp = null,
  headlineTooltip = null,
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
  // ── Headline title (overridable via headlineProp) ────────────
  let headline;
  if (headlineProp) {
    headline = headlineProp;
  } else if (normalizedMatchType === "role_match" && formattedRoleLabel) {
    headline = `${tier.pct}% matching score of ${comparisonLabel || "this person"} with ${formattedRoleLabel}`;
  } else if (normalizedMatchType === "role_match") {
    headline = comparisonLabel
      ? `${tier.pct}% match of your profile with ${comparisonLabel}`
      : `${tier.pct}% match of your profile`;
  } else {
    headline = `${tier.pct}% profile match${comparisonSuffix}`;
  }

  // ── Detail line (always computed from matchDetails) ───────────
  let detailLine = null;
  if (normalizedMatchType === "role_match" && formattedRoleLabel) {
    const roleItems = [];
    if (totalTagCount > 0 && sharedTagCount !== null)
      roleItems.push(`${sharedTagCount} of ${totalTagCount} required focus areas`);
    if (totalBadgeCount > 0 && sharedBadgeCount !== null)
      roleItems.push(`${sharedBadgeCount} of ${totalBadgeCount} badges`);
    const roleLocationHint =
      distPct === 100 ? "within the role's location radius" :
      distPct === 25  ? "up to 20 km beyond the role's radius" :
      distPct === 0   ? "outside the role's location radius" :
      null;
    const roleParts = roleItems.length > 0 ? [roleItems.join(", ") + " met"] : [];
    if (roleLocationHint) roleParts.push(roleLocationHint);
    if (roleParts.length > 0) detailLine = roleParts.join(", ");
  } else if (normalizedMatchType === "role_match") {
    const commonItems = [];
    if (totalTagCount > 0 && sharedTagCount !== null)
      commonItems.push(`${sharedTagCount} of ${totalTagCount} focus areas`);
    if (totalBadgeCount > 0 && sharedBadgeCount !== null)
      commonItems.push(`${sharedBadgeCount} of ${totalBadgeCount} badges`);
    const locationHint =
      distPct === 100 ? "same location or remote-friendly team" :
      distPct >= 75   ? "within 100 km of each other" :
      distPct >= 50   ? "within 300 km of each other" :
      distPct >= 25   ? "within 1000 km of each other" :
      distPct === 0   ? "locations too far apart" :
      null;
    if (commonItems.length > 0 && locationHint) {
      detailLine = `${commonItems.join(", ")} in common and ${locationHint}`;
    } else if (commonItems.length > 0) {
      detailLine = `${commonItems.join(", ")} in common`;
    } else if (locationHint) {
      detailLine = locationHint.charAt(0).toUpperCase() + locationHint.slice(1);
    }
  } else {
    const commonItems = [];
    if (sharedTagCount > 0) commonItems.push(pluralize(sharedTagCount, "focus area"));
    if (sharedBadgeCount > 0) commonItems.push(pluralize(sharedBadgeCount, "badge"));
    const locationHint =
      distPct === 100 ? "same location or remote-friendly team" :
      distPct >= 75   ? "within 100 km of each other" :
      distPct >= 50   ? "within 300 km of each other" :
      distPct >= 25   ? "within 1000 km of each other" :
      distPct === 0   ? "locations too far apart" :
      null;
    if (commonItems.length > 0 && locationHint) {
      detailLine = `${commonItems.join(", ")} in common and ${locationHint}`;
    } else if (commonItems.length > 0) {
      detailLine = `${commonItems.join(", ")} in common`;
    } else if (locationHint) {
      detailLine = locationHint.charAt(0).toUpperCase() + locationHint.slice(1);
    }
  }

  // ── Progress bar rows ─────────────────────────────────────
  const rows = [
    {
      label: "Location",
      icon: MapPin,
      value: distPct ?? 0,
      tooltip:
        normalizedMatchType === "role_match" ? (
          <>
            Location factors into the score with {LOCATION_WEIGHT}%.
            <br />
            Within the role's radius = 100%. Up to 20 km beyond = 25%. Farther = 0%.
          </>
        ) : (
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
    <div className={`rounded-xl p-4 border leading-[110%] ${tier.bgTint} ${tier.borderTint}`}>
      {/* Headline */}
      <div className="flex items-start gap-1 mb-3">
        <Icon size={14} className={`mt-0.5 flex-shrink-0 ${tier.text}`} />
        <div className="min-w-0">
          {headlineTooltip ? (
            <Tooltip content={headlineTooltip} wrapperClassName="inline">
              <span className={`text-sm leading-[110%] font-semibold ${tier.text}`}>
                {headline}{detailLine ? ":" : ""}
              </span>
            </Tooltip>
          ) : (
            <span className={`text-sm leading-[110%] font-semibold ${tier.text}`}>
              {headline}{detailLine ? ":" : ""}
            </span>
          )}
          {detailLine && (
            <span className={`text-sm leading-[110%] font-semibold ${tier.text}`}>
              {" "}{detailLine}
            </span>
          )}
        </div>
      </div>

      {/* Per-dimension bars */}
      <div className="space-y-2">
        {rows.map(({ label, value, icon, tooltip }) => (
          <div key={label} className="flex items-center gap-2">
            <Tooltip content={tooltip} wrapperClassName="w-24 flex-shrink-0">
              <span className="text-sm leading-[110%] text-base-content/60 flex items-center gap-1 cursor-help whitespace-nowrap">
                {React.createElement(icon, {
                  size: 14,
                  className: "flex-shrink-0",
                })}
                {label}
              </span>
            </Tooltip>
            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${tier.bgMid}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${tier.bg}`}
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="text-sm leading-[110%] font-medium text-base-content/60 w-8 text-right">
              {value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchScoreSection;
