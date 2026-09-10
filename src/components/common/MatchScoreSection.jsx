import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
  //
  // Every branch below resolves a key that is spelled out literally. The old
  // version assembled English here - " of you and X", "the X role", an
  // English plural rule - which is the `toPossessive` class this project has
  // now hit three times. German needs whole sentences, so each case gets one.
  const normalizedRoleLabel = String(roleLabel ?? "").trim();
  const hasRoleLabel = Boolean(normalizedRoleLabel);

  let headline;
  if (headlineProp) {
    headline = headlineProp;
  } else if (normalizedMatchType === "role_match" && hasRoleLabel) {
    headline = comparisonLabel
      ? t("matchScore.roleNamed", {
          pct: tier.pct,
          name: comparisonLabel,
          role: normalizedRoleLabel,
        })
      : t("matchScore.roleNamedAnon", {
          pct: tier.pct,
          role: normalizedRoleLabel,
        });
  } else if (normalizedMatchType === "role_match") {
    headline = comparisonLabel
      ? t("matchScore.yourProfileWith", { pct: tier.pct, name: comparisonLabel })
      : t("matchScore.withYourProfile", { pct: tier.pct });
  } else {
    headline = comparisonLabel
      ? t("matchScore.betweenYouAnd", { pct: tier.pct, name: comparisonLabel })
      : t("matchScore.plain", { pct: tier.pct });
  }

  // ── Detail line (always computed from matchDetails) ───────────
  //
  // Two slots, never a string join: the items are combined by a key
  // ("{first} und {second}"), and the frame that carries them is a key too
  // ("{items} gemeinsam, {location}"). Nothing here concatenates a sentence,
  // and no branch capitalises a first letter - German "Standorte" is already
  // a noun and English gets its own standalone variant instead.
  const joinItems = (items) =>
    items.length === 2
      ? t("matchDetail.itemsTwo", { first: items[0], second: items[1] })
      : items[0];

  const genericLocationKey =
    distPct === 100 ? "same" :
    distPct >= 75   ? "within100" :
    distPct >= 50   ? "within300" :
    distPct >= 25   ? "within1000" :
    distPct === 0   ? "tooFar" :
    null;

  const roleLocationKey =
    distPct === 100 ? "inside" :
    distPct === 25  ? "near" :
    distPct === 0   ? "outside" :
    null;

  // Every one of these twenty keys is written out in full. A key assembled
  // from `genericLocationKey` would be shorter and would be INVISIBLE to
  // `npm run i18n:check` - `matchScoreUtils` documents that trap and this
  // file has to respect it. The "Alone" variants exist because English
  // capitalises a fragment to start a sentence and German cannot: each
  // standalone case needs its own wording, not a `charAt(0).toUpperCase()`.
  const genericLocation = (alone) => {
    if (!genericLocationKey) return null;
    if (alone) {
      if (genericLocationKey === "same") return t("matchDetail.locationAlone.same");
      if (genericLocationKey === "within100") return t("matchDetail.locationAlone.within100");
      if (genericLocationKey === "within300") return t("matchDetail.locationAlone.within300");
      if (genericLocationKey === "within1000") return t("matchDetail.locationAlone.within1000");
      return t("matchDetail.locationAlone.tooFar");
    }
    if (genericLocationKey === "same") return t("matchDetail.location.same");
    if (genericLocationKey === "within100") return t("matchDetail.location.within100");
    if (genericLocationKey === "within300") return t("matchDetail.location.within300");
    if (genericLocationKey === "within1000") return t("matchDetail.location.within1000");
    return t("matchDetail.location.tooFar");
  };
  const roleLocation = (alone) => {
    if (!roleLocationKey) return null;
    if (alone) {
      if (roleLocationKey === "inside") return t("matchDetail.roleLocationAlone.inside");
      if (roleLocationKey === "near") return t("matchDetail.roleLocationAlone.near");
      return t("matchDetail.roleLocationAlone.outside");
    }
    if (roleLocationKey === "inside") return t("matchDetail.roleLocation.inside");
    if (roleLocationKey === "near") return t("matchDetail.roleLocation.near");
    return t("matchDetail.roleLocation.outside");
  };

  let detailLine = null;
  if (normalizedMatchType === "role_match" && hasRoleLabel) {
    const items = [];
    if (totalTagCount > 0 && sharedTagCount !== null)
      items.push(t("matchDetail.tagsOfTotalRequired", {
        shared: sharedTagCount,
        total: totalTagCount,
      }));
    if (totalBadgeCount > 0 && sharedBadgeCount !== null)
      items.push(t("matchDetail.badgesOfTotal", {
        shared: sharedBadgeCount,
        total: totalBadgeCount,
      }));

    if (items.length > 0 && roleLocation(false)) {
      detailLine = t("matchDetail.roleItemsAndLocation", {
        items: joinItems(items),
        location: roleLocation(false),
      });
    } else if (items.length > 0) {
      detailLine = t("matchDetail.roleItemsOnly", { items: joinItems(items) });
    } else if (roleLocation(true)) {
      detailLine = roleLocation(true);
    }
  } else {
    const items = [];
    if (normalizedMatchType === "role_match") {
      if (totalTagCount > 0 && sharedTagCount !== null)
        items.push(t("matchDetail.tagsOfTotal", {
          shared: sharedTagCount,
          total: totalTagCount,
        }));
      if (totalBadgeCount > 0 && sharedBadgeCount !== null)
        items.push(t("matchDetail.badgesOfTotal", {
          shared: sharedBadgeCount,
          total: totalBadgeCount,
        }));
    } else {
      if (sharedTagCount > 0)
        items.push(t("matchDetail.tagsShared", { count: sharedTagCount }));
      if (sharedBadgeCount > 0)
        items.push(t("matchDetail.badgesShared", { count: sharedBadgeCount }));
    }

    if (items.length > 0 && genericLocation(false)) {
      detailLine = t("matchDetail.itemsAndLocation", {
        items: joinItems(items),
        location: genericLocation(false),
      });
    } else if (items.length > 0) {
      detailLine = t("matchDetail.itemsOnly", { items: joinItems(items) });
    } else if (genericLocation(true)) {
      detailLine = genericLocation(true);
    }
  }

  // ── Progress bar rows ─────────────────────────────────────
  const rows = [
    {
      label: t("location.section.title"),
      icon: MapPin,
      value: distPct ?? 0,
      tooltip:
        normalizedMatchType === "role_match" ? (
          <>
            {t("matchDetail.bars.locationWeight", { weight: LOCATION_WEIGHT })}
            <br />
            {t("matchDetail.bars.locationRoleRule")}
          </>
        ) : (
          <>
            {t("matchDetail.bars.locationWeight", { weight: LOCATION_WEIGHT })}
            <br />
            {t("matchDetail.bars.locationGenericRule")}
            <br />
            {t("matchDetail.bars.locationGenericRuleFar")}
          </>
        ),
    },
    {
      label: t("focusAreas.title"),
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
          {t("matchDetail.bars.tagsWeight", { weight: TAG_WEIGHT })}
          <br />
          {totalTagCount > 0 && sharedTagCount !== null
            ? normalizedMatchType === "role_match"
              ? t("matchDetail.bars.tagsMet", {
                  shared: sharedTagCount,
                  total: totalTagCount,
                })
              : t("matchDetail.bars.tagsSharedCount", {
                  shared: sharedTagCount,
                  total: totalTagCount,
                })
            : t("matchDetail.bars.tagsNone")}
        </>
      ),
    },
    {
      label: t("badges.section.title"),
      icon: Award,
      value:
        badgePct ??
        badgePctFromCounts ??
        (normalizedMatchType === "profile_overlap" && sharedBadgeCount > 0
          ? overallPct
          : 0),
      tooltip: (
        <>
          {t("matchDetail.bars.badgesWeight", { weight: BADGE_WEIGHT })}
          <br />
          {totalBadgeCount > 0 && sharedBadgeCount !== null
            ? normalizedMatchType === "role_match"
              ? t("matchDetail.bars.badgesMet", {
                  shared: sharedBadgeCount,
                  total: totalBadgeCount,
                })
              : t("matchDetail.bars.badgesSharedCount", {
                  shared: sharedBadgeCount,
                  total: totalBadgeCount,
                })
            : t("matchDetail.bars.badgesNone")}
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
