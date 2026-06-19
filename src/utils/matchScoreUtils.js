import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";

export const MATCH_TIER_GREAT = 80; // percentage threshold for "Great match" (orange)
export const MATCH_TIER_GOOD = 50; // percentage threshold for "Good match" (green)

/**
 * Returns tier metadata for a match score (0–1 float).
 * Shared between VacantRoleCard, TeamCard, and UserCard.
 *
 * @param {number} score - Match score between 0 and 1
 * @returns {{ pct: number, Icon: Component, bg: string, text: string, label: string }}
 */
export function getMatchTier(score) {
  const pct = Math.round((score || 0) * 100);
  if (pct >= MATCH_TIER_GREAT)
    return {
      pct,
      Icon: Sparkles,
      bg: "bg-orange-500",
      bgMid: "bg-orange-800/30",
      bgTint: "bg-orange-50",
      borderTint: "border-orange-500",
      text: "text-orange-500",
      label: "Great match",
    };
  if (pct >= MATCH_TIER_GOOD)
    return {
      pct,
      Icon: TrendingUp,
      bg: "bg-success",
      bgMid: "bg-[#036b0c]/30",
      bgTint: "bg-green-50",
      borderTint: "border-success",
      text: "text-success",
      label: "Good match",
    };
  return {
    pct,
    Icon: TrendingDown,
    bg: "bg-slate-400",
    bgMid: "bg-slate-400/30",
    bgTint: "bg-slate-50",
    borderTint: "border-slate-400",
    text: "text-slate-400",
    label: "Low match",
  };
}

/**
 * Build a human-readable tooltip string for a match score.
 *
 * @param {Object} matchTier - from getMatchTier()
 * @param {Object|null} matchDetails - optional breakdown object
 * @param {Object} options
 * @returns {string}
 */
export const getMatchTooltipText = (
  matchTier,
  matchDetails = null,
  {
    breakdownLabel = "match",
    fallbackLabel = "profile match",
    sharedFocusCount = null,
  } = {},
) => {
  if (!matchTier) return "";

  const hasBreakdown =
    matchDetails &&
    ((matchDetails.tagScore ?? matchDetails.tag_score) != null ||
      (matchDetails.badgeScore ?? matchDetails.badge_score) != null ||
      (matchDetails.distanceScore ?? matchDetails.distance_score) != null);

  if (hasBreakdown) {
    const tagPct = Math.round(
      (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
    );
    const badgePct = Math.round(
      (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
    );
    const distPct = Math.round(
      (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
    );

    return `${matchTier.pct}% ${breakdownLabel} — Tags ${tagPct}% · Badges ${badgePct}% · Location ${distPct}%`;
  }

  if (matchDetails) {
    const sharedTags =
      matchDetails.sharedTagCount ?? matchDetails.shared_tag_count ?? 0;
    const sharedBadges =
      matchDetails.sharedBadgeCount ?? matchDetails.shared_badge_count ?? 0;

    if (sharedTags > 0 || sharedBadges > 0) {
      return `${matchTier.pct}% ${fallbackLabel} — ${sharedTags} shared tags, ${sharedBadges} shared badges`;
    }
  }

  if (!matchDetails && sharedFocusCount > 0) {
    return `${matchTier.pct}% ${fallbackLabel} — ${sharedFocusCount} shared focus areas`;
  }

  return `${matchTier.pct}% ${fallbackLabel}`;
};
