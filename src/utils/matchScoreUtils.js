import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";

export const MATCH_TIER_GREAT = 80; // percentage threshold for the "great" tier (orange)
export const MATCH_TIER_GOOD = 50; // percentage threshold for the "good" tier (green)

/**
 * Returns tier metadata for a match score (0–1 float).
 * Shared between VacantRoleCard, TeamCard, and UserCard.
 *
 * @param {number} score - Match score between 0 and 1
 * ⚠️ There is deliberately NO `label` here. It used to carry the English
 * "Great match" / "Good match" / "Low match", five components read it, and
 * four of them were still printing English after the PR meant to translate
 * them. Use `matchTierSentence(t, tier)` for text and the additive `tier`
 * code for branching. Do not add a human-readable string back to this object.
 *
 * @returns {{ pct: number, Icon: Component, bg: string, text: string, tier: string }}
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
      tier: "great",
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
      tier: "good",
    };
  return {
    pct,
    Icon: TrendingDown,
    bg: "bg-slate-400",
    bgMid: "bg-slate-400/30",
    bgTint: "bg-slate-50",
    borderTint: "border-slate-400",
    text: "text-slate-400",
    tier: "low",
  };
}

/**
 * The "{pct}% <tier>" sentence for a match ring, in the active language.
 *
 * `t` is passed IN rather than imported: this module is plain JavaScript with
 * no component around it and must not reach for a global `t`.
 *
 * ⚠️ All three keys are spelled out literally. A key built from `tier.tier`
 * would be shorter and INVISIBLE to `npm run i18n:check`.
 *
 * This exists because the same nested ternary was copied to five places and
 * four of them were still English after the PR that was meant to translate
 * them. Two were found by a browser pass, the fifth by finally grepping the
 * repo instead of the one file already open. Call this; do not copy it.
 *
 * @param {Function} t - from useTranslation()
 * @param {Object} tier - from getMatchTier()
 */
export const matchTierSentence = (t, tier) => {
  if (!tier) return "";
  if (tier.tier === "great") return t("matchScore.tierGreat", { pct: tier.pct });
  if (tier.tier === "good") return t("matchScore.tierGood", { pct: tier.pct });
  return t("matchScore.tierLow", { pct: tier.pct });
};

/**
 * Decide WHICH match-score sentence applies, and with which values.
 *
 * The wording itself lives in the translation files: this module is plain
 * JavaScript with no component around it, so it must not reach for a global
 * `t`. The caller resolves the returned variant against a key it spells out
 * literally - a key built from this variant name would be invisible to
 * `npm run i18n:check`.
 *
 * @param {Object} matchTier - from getMatchTier()
 * @param {Object|null} matchDetails - optional breakdown object
 * @param {Object} options
 * @returns {{variant: "none"|"breakdown"|"shared"|"sharedFocus"|"plain", values: Object}}
 */
export const getMatchTooltipParts = (
  matchTier,
  matchDetails = null,
  { sharedFocusCount = null } = {},
) => {
  if (!matchTier) return { variant: "none", values: {} };

  const pct = matchTier.pct;

  const hasBreakdown =
    matchDetails &&
    ((matchDetails.tagScore ?? matchDetails.tag_score) != null ||
      (matchDetails.badgeScore ?? matchDetails.badge_score) != null ||
      (matchDetails.distanceScore ?? matchDetails.distance_score) != null);

  if (hasBreakdown) {
    return {
      variant: "breakdown",
      values: {
        pct,
        tagPct: Math.round(
          (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
        ),
        badgePct: Math.round(
          (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
        ),
        distPct: Math.round(
          (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
        ),
      },
    };
  }

  if (matchDetails) {
    const sharedTags =
      matchDetails.sharedTagCount ?? matchDetails.shared_tag_count ?? 0;
    const sharedBadges =
      matchDetails.sharedBadgeCount ?? matchDetails.shared_badge_count ?? 0;

    if (sharedTags > 0 || sharedBadges > 0) {
      return { variant: "shared", values: { pct, sharedTags, sharedBadges } };
    }
  }

  if (!matchDetails && sharedFocusCount > 0) {
    return { variant: "sharedFocus", values: { pct, count: sharedFocusCount } };
  }

  return { variant: "plain", values: { pct } };
};

/**
 * Build a human-readable tooltip string for a match score.
 *
 * ⚠️ English only, and assembled from fragments. Kept for `UserCard` and
 * `VacantRoleCard`, which are not translated yet; both move to
 * `getMatchTooltipParts` when their surface is converted, and this function
 * goes with the last caller.
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
