const TAG_WEIGHT = 0.4;
const BADGE_WEIGHT = 0.3;
const LOCATION_WEIGHT = 0.3;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getDetailValue = (details, camelKey, snakeKey = camelKey) =>
  details?.[camelKey] ?? details?.[snakeKey];

const toUnitInterval = (value) => {
  const num = toFiniteNumber(value);
  if (num === null) return null;
  if (num > 1) return Math.max(0, Math.min(1, num / 100));
  return Math.max(0, Math.min(1, num));
};

const normalizeTagEntries = (items = []) => {
  if (!Array.isArray(items)) return [];

  const entries = [];

  items.forEach((item) => {
    if (item == null) return;

    if (typeof item === "object") {
      const id = toFiniteNumber(
        item.id ?? item.tagId ?? item.tag_id ?? item.value ?? null,
      );
      const name = normalizeText(item.name ?? item.tag ?? item.label ?? "");
      if (id !== null || name) {
        entries.push({ id, name });
      }
      return;
    }

    const id = toFiniteNumber(item);
    const name = normalizeText(item);
    if (id !== null || name) {
      entries.push({ id, name });
    }
  });

  return entries;
};

const normalizeBadgeEntries = (items = []) => {
  if (!Array.isArray(items)) return [];

  const entries = [];

  items.forEach((item) => {
    if (item == null) return;

    if (typeof item === "object") {
      const name = normalizeText(
        item.name ?? item.badgeName ?? item.badge_name ?? "",
      );
      if (name) entries.push({ name });
      return;
    }

    const name = normalizeText(item);
    if (name) entries.push({ name });
  });

  return entries;
};

const dedupeBy = (items, getKey) => {
  const map = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    if (!key || map.has(key)) return;
    map.set(key, item);
  });

  return Array.from(map.values());
};

const countSharedTags = (viewerTags, teamTags) => {
  const viewerTagIds = new Set(
    viewerTags.map((tag) => tag.id).filter((id) => id !== null),
  );
  const viewerTagNames = new Set(
    viewerTags.map((tag) => tag.name).filter(Boolean),
  );
  const uniqueTeamTags = dedupeBy(
    teamTags,
    (tag) => (tag.id !== null ? `id:${tag.id}` : `name:${tag.name}`),
  );

  let shared = 0;

  uniqueTeamTags.forEach((tag) => {
    if (tag.id !== null && viewerTagIds.has(tag.id)) {
      shared += 1;
      return;
    }

    if (tag.name && viewerTagNames.has(tag.name)) {
      shared += 1;
    }
  });

  return {
    shared,
    total: uniqueTeamTags.length,
  };
};

const countSharedBadges = (viewerBadges, teamBadges) => {
  const viewerBadgeNames = new Set(
    viewerBadges.map((badge) => badge.name).filter(Boolean),
  );
  const uniqueTeamBadges = dedupeBy(teamBadges, (badge) => badge.name);

  let shared = 0;

  uniqueTeamBadges.forEach((badge) => {
    if (badge.name && viewerBadgeNames.has(badge.name)) {
      shared += 1;
    }
  });

  return {
    shared,
    total: uniqueTeamBadges.length,
  };
};

const getLocationScorePct = (viewer, team, { remoteScore = 50 } = {}) => {
  const isRemote = Boolean(team?.isRemote ?? team?.is_remote);
  if (isRemote) return remoteScore;

  const viewerCity = normalizeText(viewer?.city);
  const viewerCountry = normalizeText(viewer?.country);
  const teamCity = normalizeText(team?.city);
  const teamCountry = normalizeText(team?.country);
  const distance = toFiniteNumber(team?.distanceKm ?? team?.distance_km);

  if (
    viewerCity &&
    teamCity &&
    viewerCountry &&
    teamCountry &&
    viewerCity === teamCity &&
    viewerCountry === teamCountry
  ) {
    return 100;
  }

  if (distance !== null) {
    if (distance <= 25) return 100;
    if (distance <= 100) return 75;
    if (distance <= 300) return 50;
    if (distance <= 1000) return 25;
    return 0;
  }

  if (viewerCountry && teamCountry && viewerCountry === teamCountry) {
    return 50;
  }

  return 0;
};

const mergeMatchDetails = (computedMatchDetails, existingMatchDetails) => {
  const existing = existingMatchDetails ?? {};
  const computed = computedMatchDetails ?? {};

  const useComputedTagDetails =
    computed.hasTagBasis === true ||
    computed.hasTagBasis === false
      ? computed.hasTagBasis
      : false;
  const useComputedBadgeDetails =
    computed.hasBadgeBasis === true ||
    computed.hasBadgeBasis === false
      ? computed.hasBadgeBasis
      : false;
  const useComputedLocationDetails =
    computed.hasLocationBasis === true ||
    computed.hasLocationBasis === false
      ? computed.hasLocationBasis
      : false;

  return {
    ...computed,
    ...existing,
    tagScore: useComputedTagDetails
      ? computed.tagScore
      : getDetailValue(existing, "tagScore", "tag_score") ?? computed.tagScore,
    badgeScore: useComputedBadgeDetails
      ? computed.badgeScore
      : getDetailValue(existing, "badgeScore", "badge_score") ??
        computed.badgeScore,
    distanceScore: useComputedLocationDetails
      ? computed.distanceScore
      : getDetailValue(existing, "distanceScore", "distance_score") ??
        computed.distanceScore,
    sharedTagCount: useComputedTagDetails
      ? computed.sharedTagCount
      : getDetailValue(existing, "sharedTagCount", "shared_tag_count") ??
        computed.sharedTagCount,
    sharedBadgeCount: useComputedBadgeDetails
      ? computed.sharedBadgeCount
      : getDetailValue(existing, "sharedBadgeCount", "shared_badge_count") ??
        computed.sharedBadgeCount,
    totalTagCount: useComputedTagDetails
      ? computed.totalTagCount
      : getDetailValue(existing, "totalTagCount", "total_tag_count") ??
        computed.totalTagCount,
    totalBadgeCount: useComputedBadgeDetails
      ? computed.totalBadgeCount
      : getDetailValue(existing, "totalBadgeCount", "total_badge_count") ??
        computed.totalBadgeCount,
  };
};

const calculateWeightedOverallScore = ({
  tagScore = null,
  badgeScore = null,
  distanceScore = null,
} = {}) => {
  if (tagScore === null && badgeScore === null && distanceScore === null) {
    return null;
  }

  return (
    (tagScore ?? 0) * TAG_WEIGHT +
    (badgeScore ?? 0) * BADGE_WEIGHT +
    (distanceScore ?? 0) * LOCATION_WEIGHT
  );
};

const getOverallScoreFromMatchDetails = (matchDetails) =>
  calculateWeightedOverallScore({
    tagScore: toUnitInterval(getDetailValue(matchDetails, "tagScore", "tag_score")),
    badgeScore: toUnitInterval(
      getDetailValue(matchDetails, "badgeScore", "badge_score"),
    ),
    distanceScore: toUnitInterval(
      getDetailValue(matchDetails, "distanceScore", "distance_score"),
    ),
  });

export const getResultMatchScore = (item) => {
  const raw =
    item?.bestMatchScore ??
    item?.best_match_score ??
    item?.matchScore ??
    item?.match_score ??
    0;

  const score = Number(raw);
  return Number.isFinite(score) ? score : 0;
};

export const buildViewerTeamMatchProfile = ({
  user = null,
  userTags = [],
  userBadges = [],
} = {}) => ({
  user,
  tags: normalizeTagEntries(userTags),
  badges: normalizeBadgeEntries(userBadges),
});

export const calculateTeamMatchData = ({
  team,
  viewerProfile,
  teamBadges = null,
} = {}) => {
  if (!team || !viewerProfile?.user) return null;

  const teamTags = normalizeTagEntries(
    team.tags ?? team.tagsJson ?? team.tags_json ?? team.selectedTags ?? [],
  );
  const teamBadgeEntries = normalizeBadgeEntries(teamBadges ?? team.badges ?? []);
  const { shared: sharedTagCount, total: totalTagCount } = countSharedTags(
    viewerProfile.tags ?? [],
    teamTags,
  );
  const { shared: sharedBadgeCount, total: totalBadgeCount } = countSharedBadges(
    viewerProfile.badges ?? [],
    teamBadgeEntries,
  );
  const tagPct =
    totalTagCount > 0 ? Math.round((sharedTagCount / totalTagCount) * 100) : 0;
  const badgePct =
    totalBadgeCount > 0
      ? Math.round((sharedBadgeCount / totalBadgeCount) * 100)
      : 0;
  const distancePct = getLocationScorePct(viewerProfile.user, team, {
    remoteScore: 100,
  });
  const overallPct = Math.round(
    tagPct * TAG_WEIGHT +
      badgePct * BADGE_WEIGHT +
      distancePct * LOCATION_WEIGHT,
  );

  return {
    bestMatchScore: overallPct / 100,
    matchType: "profile_overlap",
    matchDetails: {
      hasTagBasis: totalTagCount > 0,
      hasBadgeBasis: totalBadgeCount > 0,
      hasLocationBasis: true,
      tagScore: tagPct / 100,
      badgeScore: badgePct / 100,
      distanceScore: distancePct / 100,
      sharedTagCount,
      sharedBadgeCount,
      totalTagCount,
      totalBadgeCount,
      calculationSource: "client_fallback",
    },
  };
};

export const calculateUserMatchData = ({
  matchedUser,
  viewerProfile,
} = {}) => {
  if (!matchedUser || !viewerProfile?.user) return null;

  const matchedUserTags = normalizeTagEntries(matchedUser.tags ?? []);
  const matchedUserBadges = normalizeBadgeEntries(matchedUser.badges ?? []);
  const { shared: sharedTagCount, total: totalTagCount } = countSharedTags(
    viewerProfile.tags ?? [],
    matchedUserTags,
  );
  const { shared: sharedBadgeCount, total: totalBadgeCount } = countSharedBadges(
    viewerProfile.badges ?? [],
    matchedUserBadges,
  );
  const tagPct =
    totalTagCount > 0 ? Math.round((sharedTagCount / totalTagCount) * 100) : 0;
  const badgePct =
    totalBadgeCount > 0
      ? Math.round((sharedBadgeCount / totalBadgeCount) * 100)
      : 0;
  const distancePct = getLocationScorePct(viewerProfile.user, matchedUser);
  const overallPct = Math.round(
    tagPct * TAG_WEIGHT +
      badgePct * BADGE_WEIGHT +
      distancePct * LOCATION_WEIGHT,
  );

  return {
    bestMatchScore: overallPct / 100,
    matchType: "profile_overlap",
    matchDetails: {
      hasTagBasis: totalTagCount > 0,
      hasBadgeBasis: totalBadgeCount > 0,
      hasLocationBasis: true,
      tagScore: tagPct / 100,
      badgeScore: badgePct / 100,
      distanceScore: distancePct / 100,
      sharedTagCount,
      sharedBadgeCount,
      totalTagCount,
      totalBadgeCount,
      calculationSource: "client_fallback",
    },
  };
};

export const calculateUserRoleMatchData = ({
  matchedUser,
  requiredTagIds = null,
  requiredBadgeNames = null,
  baseMatchDetails = null,
} = {}) => {
  if (!matchedUser) return null;

  const matchedUserTags = normalizeTagEntries(
    matchedUser.tags ??
      matchedUser.tagsJson ??
      matchedUser.tags_json ??
      matchedUser.selectedTags ??
      [],
  );
  const matchedUserBadges = normalizeBadgeEntries(matchedUser.badges ?? []);
  const requiredTags = normalizeTagEntries(Array.from(requiredTagIds ?? []));
  const requiredBadges = normalizeBadgeEntries(
    Array.from(requiredBadgeNames ?? []),
  );
  const { shared: matchingTags, total: totalRequiredTags } = countSharedTags(
    matchedUserTags,
    requiredTags,
  );
  const { shared: matchingBadges, total: totalRequiredBadges } =
    countSharedBadges(matchedUserBadges, requiredBadges);
  const tagScore =
    totalRequiredTags > 0 ? matchingTags / totalRequiredTags : null;
  const badgeScore =
    totalRequiredBadges > 0 ? matchingBadges / totalRequiredBadges : null;
  const distanceScore = toUnitInterval(
    getDetailValue(baseMatchDetails, "distanceScore", "distance_score"),
  );
  const overallScore = calculateWeightedOverallScore({
    tagScore,
    badgeScore,
    distanceScore,
  });

  return {
    bestMatchScore: overallScore,
    matchType: "role_match",
    matchDetails: {
      hasTagBasis: totalRequiredTags > 0,
      hasBadgeBasis: totalRequiredBadges > 0,
      hasLocationBasis: distanceScore !== null,
      tagScore,
      badgeScore,
      distanceScore,
      sharedTagCount: matchingTags,
      sharedBadgeCount: matchingBadges,
      matchingTags,
      matchingBadges,
      totalTagCount: totalRequiredTags,
      totalBadgeCount: totalRequiredBadges,
      totalRequiredTags,
      totalRequiredBadges,
      distanceKm: getDetailValue(baseMatchDetails, "distanceKm", "distance_km"),
      isWithinRange: getDetailValue(
        baseMatchDetails,
        "isWithinRange",
        "is_within_range",
      ),
      calculationSource: "client_role_fallback",
    },
  };
};

export const enrichTeamMatchData = ({
  team,
  viewerProfile,
  teamBadges = null,
} = {}) => {
  if (!team || !viewerProfile?.user) return team;

  const computed = calculateTeamMatchData({ team, viewerProfile, teamBadges });
  if (!computed) return team;

  const existingScore = getResultMatchScore(team);
  const existingMatchType = team.matchType ?? team.match_type ?? null;
  const existingMatchDetails = team.matchDetails ?? team.match_details ?? null;
  const mergedMatchDetails = mergeMatchDetails(
    computed.matchDetails,
    existingMatchDetails,
  );
  const computedOverallScore = getOverallScoreFromMatchDetails(mergedMatchDetails);

  const finalScore =
    computedOverallScore ??
    computed.bestMatchScore ??
    (existingScore > 0 ? existingScore : null);
  const finalMatchType = existingMatchType ?? computed.matchType;
  const finalMatchDetails = mergedMatchDetails;
  const finalSharedTagCount =
    team.sharedTagCount ??
    team.shared_tag_count ??
    finalMatchDetails.sharedTagCount ??
    0;

  return {
    ...team,
    bestMatchScore: finalScore,
    matchScore: finalScore,
    matchType: finalMatchType,
    matchDetails: finalMatchDetails,
    sharedTagCount: finalSharedTagCount,
  };
};

export const enrichUserMatchData = ({
  user,
  viewerProfile,
} = {}) => {
  if (!user || !viewerProfile?.user) return user;

  const computed = calculateUserMatchData({
    matchedUser: user,
    viewerProfile,
  });
  if (!computed) return user;

  const existingScore = getResultMatchScore(user);
  const existingMatchType = user.matchType ?? user.match_type ?? null;
  const existingMatchDetails = user.matchDetails ?? user.match_details ?? null;
  const mergedMatchDetails = mergeMatchDetails(
    computed.matchDetails,
    existingMatchDetails,
  );
  const computedOverallScore = getOverallScoreFromMatchDetails(mergedMatchDetails);
  const finalScore =
    computedOverallScore ??
    computed.bestMatchScore ??
    (existingScore > 0 ? existingScore : null);
  const finalMatchType = existingMatchType ?? computed.matchType;
  const finalSharedTagCount =
    user.sharedTagCount ??
    user.shared_tag_count ??
    mergedMatchDetails.sharedTagCount ??
    0;
  const finalSharedBadgeCount =
    user.sharedBadgeCount ??
    user.shared_badge_count ??
    mergedMatchDetails.sharedBadgeCount ??
    0;

  return {
    ...user,
    bestMatchScore: finalScore,
    matchScore: finalScore,
    matchType: finalMatchType,
    matchDetails: mergedMatchDetails,
    sharedTagCount: finalSharedTagCount,
    sharedBadgeCount: finalSharedBadgeCount,
  };
};

export const enrichUserRoleMatchData = ({
  user,
  requiredTagIds = null,
  requiredBadgeNames = null,
} = {}) => {
  if (!user) return user;

  const existingScore = getResultMatchScore(user);
  const existingMatchDetails = user.matchDetails ?? user.match_details ?? null;
  const computed = calculateUserRoleMatchData({
    matchedUser: user,
    requiredTagIds,
    requiredBadgeNames,
    baseMatchDetails: existingMatchDetails,
  });

  if (!computed) return user;

  const mergedMatchDetails = mergeMatchDetails(
    computed.matchDetails,
    existingMatchDetails,
  );
  const computedOverallScore = getOverallScoreFromMatchDetails(mergedMatchDetails);
  const finalScore =
    existingScore > 0
      ? existingScore
      : computedOverallScore ?? computed.bestMatchScore ?? existingScore;
  const finalSharedTagCount =
    user.sharedTagCount ??
    user.shared_tag_count ??
    mergedMatchDetails.sharedTagCount ??
    mergedMatchDetails.matchingTags ??
    mergedMatchDetails.matching_tags ??
    0;
  const finalSharedBadgeCount =
    user.sharedBadgeCount ??
    user.shared_badge_count ??
    mergedMatchDetails.sharedBadgeCount ??
    mergedMatchDetails.matchingBadges ??
    mergedMatchDetails.matching_badges ??
    0;

  return {
    ...user,
    bestMatchScore: finalScore,
    matchScore: finalScore,
    matchType: "role_match",
    matchDetails: mergedMatchDetails,
    sharedTagCount: finalSharedTagCount,
    sharedBadgeCount: finalSharedBadgeCount,
  };
};
