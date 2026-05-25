import { calculateDistanceKm } from "./locationUtils";

export const MATCH_WEIGHTS = {
  tags: 0.4,
  badges: 0.3,
  distance: 0.3,
};

export const LOCATION_GRACE_KM = 20;
export const LOCATION_GRACE_SCORE = 0.25;

export const roundMatchValue = (value) => Math.round(value * 100) / 100;

export const extractCandidateMatchData = (candidateLike) => {
  const rawScore =
    candidateLike?.matchScore ??
    candidateLike?.match_score ??
    candidateLike?.bestMatchScore ??
    candidateLike?.best_match_score ??
    null;
  const numericScore = Number(rawScore);

  return {
    matchScore: Number.isFinite(numericScore) ? numericScore : null,
    matchDetails:
      candidateLike?.matchDetails ??
      candidateLike?.match_details ??
      null,
  };
};

export const buildTagLookup = (tagData) => {
  const nextMap = new Map();

  for (const tag of tagData) {
    nextMap.set(Number(tag.id), {
      badgeCredits: Number(tag.badge_credits ?? tag.badgeCredits ?? 0),
    });
  }

  return nextMap;
};

export const buildBadgeLookup = (badgeData) => {
  const nextMap = new Map();

  for (const badge of badgeData) {
    const name = (badge.badgeName ?? badge.badge_name ?? badge.name ?? "")
      .trim()
      .toLowerCase();
    const credits = Number(
      badge.totalCredits ?? badge.total_credits ?? badge.credits ?? 0,
    );
    const existing = nextMap.get(name);

    nextMap.set(name, {
      totalCredits: (existing?.totalCredits || 0) + credits,
    });
  }

  return nextMap;
};

export const computeRoleUserMatch = ({
  role,
  tags,
  badges,
  user,
  userTagMap,
  userBadgeMap,
}) => {
  if (!role || !user) return null;

  const requiredTagIds = tags
    .map((tag) => Number(tag.tagId ?? tag.tag_id ?? tag.id))
    .filter(Number.isFinite);
  const requiredBadgeKeys = badges
    .map((badge) =>
      (badge.name ?? badge.badgeName ?? badge.badge_name ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean);

  const matchingTags = requiredTagIds.filter((id) => userTagMap.has(id)).length;
  const matchingBadges = requiredBadgeKeys.filter((key) => userBadgeMap.has(key)).length;

  const tagScore =
    requiredTagIds.length > 0 ? matchingTags / requiredTagIds.length : 0.5;
  const badgeScore =
    requiredBadgeKeys.length > 0
      ? matchingBadges / requiredBadgeKeys.length
      : 0.5;

  const isRemote = role.isRemote ?? role.is_remote;
  const maxDistanceKm = Number(role.maxDistanceKm ?? role.max_distance_km) || 50;

  let distanceScore = 0.5;
  let distanceKm = null;
  let isWithinRange = null;

  if (isRemote) {
    distanceScore = 1;
    isWithinRange = true;
  } else {
    distanceKm = calculateDistanceKm(user, role);

    if (distanceKm !== null) {
      if (distanceKm <= maxDistanceKm) {
        distanceScore = 1;
        isWithinRange = true;
      } else if (distanceKm <= maxDistanceKm + LOCATION_GRACE_KM) {
        distanceScore = LOCATION_GRACE_SCORE;
        isWithinRange = false;
      } else {
        distanceScore = 0;
        isWithinRange = false;
      }
    }
  }

  const matchScore =
    MATCH_WEIGHTS.tags * tagScore +
    MATCH_WEIGHTS.badges * badgeScore +
    MATCH_WEIGHTS.distance * distanceScore;

  return {
    matchScore: roundMatchValue(matchScore),
    matchDetails: {
      tagScore: roundMatchValue(tagScore),
      badgeScore: roundMatchValue(badgeScore),
      distanceScore: roundMatchValue(distanceScore),
      matchingTags,
      totalRequiredTags: requiredTagIds.length,
      matchingBadges,
      totalRequiredBadges: requiredBadgeKeys.length,
      distanceKm: distanceKm !== null ? Math.round(distanceKm) : null,
      maxDistanceKm,
      isWithinRange,
    },
  };
};
