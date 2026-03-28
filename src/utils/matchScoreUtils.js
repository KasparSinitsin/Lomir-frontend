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
      text: "text-orange-500",
      label: "Great match",
    };
  if (pct >= MATCH_TIER_GOOD)
    return {
      pct,
      Icon: TrendingUp,
      bg: "bg-success",
      text: "text-success",
      label: "Good match",
    };
  return {
    pct,
    Icon: TrendingDown,
    bg: "bg-slate-400",
    text: "text-slate-400",
    label: "Low match",
  };
}
