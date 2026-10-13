export const DISTANCE_SUBMENU_TYPE = "distance";

const getRequestSortDir = ({ sortBy, sortDir }) =>
  sortBy === "proximity" && sortDir === "remote" ? "remote" : sortDir;

export const shouldUseMergedResultPagination = ({ searchType, sortBy }) =>
  searchType === "all" && sortBy === "proximity";

export const getVisibleSortOptions = ({
  sortOptions,
  searchType,
  userHasCoordinates,
  isAuthenticated,
}) =>
  sortOptions.filter((option) => {
    if (option.teamsOnly && searchType !== "teams") return false;
    if (option.usersOnly && searchType === "teams") return false;
    if (option.value === "proximity" && !userHasCoordinates) return false;
    if (option.requiresCoordinates && !userHasCoordinates) return false;
    if (option.authOnly && !isAuthenticated) return false;
    return true;
  });

export const getSortOptionDisplay = ({
  option,
  sortBy,
  sortDir,
  isCapacitySpotsSort,
  maxDistance,
}) => {
  if (option.filterOnly) {
    return {
      isActive: maxDistance !== null,
      currentDir: option.defaultDir || "asc",
      IconComponent: option.iconAsc,
      label: option.labelAsc,
      shortLabel: option.shortLabelAsc,
      tooltip: option.tooltipAsc,
    };
  }

  const optionSortValue = option.sortValue ?? option.value;
  const matchesSort = sortBy === optionSortValue;
  const isActive =
    option.value === "capacity"
      ? isCapacitySpotsSort
      : matchesSort && (!option.activeDir || sortDir === option.activeDir);
  const currentDir = isActive
    ? option.value === "capacity"
      ? sortDir
      : matchesSort
        ? sortDir
        : option.defaultDir || "desc"
    : option.defaultDir || "desc";
  const normalizedDir =
    option.value === "proximity" && currentDir === "desc" ? "asc" : currentDir;
  const displayDir =
    normalizedDir === "remote" && !option.labelRemote
      ? option.defaultDir || "asc"
      : normalizedDir;

  if (displayDir === "asc") {
    return {
      isActive,
      currentDir: displayDir,
      IconComponent: option.iconAsc,
      label: option.labelAsc,
      shortLabel: option.shortLabelAsc,
      tooltip: option.tooltipAsc,
    };
  }

  if (displayDir === "remote") {
    return {
      isActive,
      currentDir: displayDir,
      IconComponent: option.iconRemote,
      label: option.labelRemote,
      shortLabel: option.shortLabelRemote,
      tooltip: option.tooltipRemote,
    };
  }

  return {
    isActive,
    currentDir,
    IconComponent: option.iconDesc,
    label: option.labelDesc,
    shortLabel: option.shortLabelDesc,
    tooltip: option.tooltipDesc,
  };
};

/**
 * The active sort and filter criteria as removable pills.
 *
 * Every pill carries what the input needs to decide, separately from what it
 * shows: `key` says which criterion a click removes, `sortId` picks a sort
 * pill's icon, `sign` marks an exclusion. None of them is ever read out of a
 * label — the labels are translated, and `switch (pill.label)` over English
 * text lost every icon the moment a label changed language (found 2026-09-16).
 *
 * `t` is passed in, like the helpers in `utils/badgeLabels.js`: this module
 * has no hook, and the caller re-renders on a language change.
 */
export const getActiveCriteriaPills = ({
  t,
  sortBy,
  sortDir,
  capacityMode,
  maxDistance,
  effectiveOpenRolesOnly,
  effectiveIncludeOwnTeams,
  includeDemoData,
  matchRoleId,
  matchRoleName,
  excludeTeamId,
  excludeTeamName,
}) => {
  const pills = [];

  if (sortBy === "match") {
    pills.push({
      key: "sort",
      sortId: "match",
      label: t("searchCriteria.sort.match"),
    });
  } else if (sortBy === "name" && sortDir === "desc") {
    pills.push({
      key: "sort",
      sortId: "nameDesc",
      label: t("searchCriteria.sort.nameDesc"),
    });
  } else if (sortBy === "recent") {
    pills.push(
      sortDir === "desc"
        ? { key: "sort", sortId: "recentDesc", label: t("searchCriteria.sort.recentDesc") }
        : { key: "sort", sortId: "recentAsc", label: t("searchCriteria.sort.recentAsc") },
    );
  } else if (sortBy === "newest") {
    pills.push(
      sortDir === "desc"
        ? { key: "sort", sortId: "newestDesc", label: t("searchCriteria.sort.newestDesc") }
        : { key: "sort", sortId: "newestAsc", label: t("searchCriteria.sort.newestAsc") },
    );
  } else if (sortBy === "capacity") {
    if (capacityMode === "spots") {
      pills.push(
        sortDir === "desc"
          ? { key: "sort", sortId: "spotsDesc", label: t("searchCriteria.sort.spotsDesc") }
          : { key: "sort", sortId: "spotsAsc", label: t("searchCriteria.sort.spotsAsc") },
      );
    } else {
      pills.push(
        sortDir === "desc"
          ? { key: "sort", sortId: "openRolesDesc", label: t("searchCriteria.sort.openRolesDesc") }
          : { key: "sort", sortId: "openRolesAsc", label: t("searchCriteria.sort.openRolesAsc") },
      );
    }
  } else if (sortBy === "proximity") {
    pills.push(
      sortDir === "remote"
        ? {
            key: "sort",
            sortId: "remoteFirst",
            label: t("searchCriteria.sort.remoteFirst"),
            shortLabel: t("searchCriteria.sort.remoteFirstShort"),
          }
        : {
            key: "sort",
            sortId: "nearestFirst",
            label: t("searchCriteria.sort.nearestFirst"),
            shortLabel: t("searchCriteria.sort.nearestFirstShort"),
          },
    );
  }

  if (maxDistance !== null) {
    pills.push({
      key: "maxDistance",
      label: t("searchCriteria.maxDistance", { km: maxDistance }),
      removeLabel: t("searchCriteria.maxDistanceRemove", { km: maxDistance }),
    });
  }

  if (effectiveOpenRolesOnly) {
    pills.push({
      key: "openRolesOnly",
      label: t("searchCriteria.openRolesOnly"),
    });
  }

  if (!effectiveIncludeOwnTeams) {
    pills.push({
      key: "includeOwnTeams",
      sign: "-",
      label: t("searchCriteria.myTeams"),
      removeLabel: t("searchCriteria.myTeamsRemove"),
    });
  }

  if (!includeDemoData) {
    pills.push({
      key: "includeDemoData",
      sign: "-",
      label: t("searchCriteria.demo"),
      removeLabel: t("searchCriteria.demoRemove"),
    });
  }

  if (matchRoleId && matchRoleName) {
    // A role name is data, shown as saved.
    pills.unshift({
      key: "matchRole",
      label: matchRoleName,
      type: "role",
    });
  }

  if (excludeTeamId) {
    pills.push({
      key: "excludeTeam",
      sign: "-",
      label: excludeTeamName
        ? t("searchCriteria.teamMembers", { team: excludeTeamName })
        : t("searchCriteria.teamMembersUnnamed"),
      removeLabel: excludeTeamName
        ? t("searchCriteria.teamMembersRemove", { team: excludeTeamName })
        : t("searchCriteria.teamMembersUnnamedRemove"),
      type: "excludeTeam",
    });
  }

  return pills;
};

export const buildSearchRequestCriteria = ({
  hasSearched,
  searchQuery,
  searchType,
  currentPage,
  resultsPerPage,
  sortBy,
  sortDir,
  maxDistance,
  effectiveOpenRolesOnly,
  effectiveIncludeOwnTeams,
  includeDemoData,
  capacityMode,
  filterTagIds,
  filterBadgeIds,
  matchRoleId,
  excludeTeamId,
}) => {
  const usesMergedPaginationWindow = shouldUseMergedResultPagination({
    searchType,
    sortBy,
  });
  const normalizedPage = Math.max(1, Number(currentPage) || 1);
  const normalizedLimit = Math.max(1, Number(resultsPerPage) || 1);

  return {
    mode: hasSearched && searchQuery.trim() ? "search" : "all",
    query: searchQuery.trim(),
    searchType,
    page: usesMergedPaginationWindow ? 1 : normalizedPage,
    limit: usesMergedPaginationWindow
      ? normalizedPage * normalizedLimit
      : normalizedLimit,
    sortBy,
    sortDir: getRequestSortDir({ sortBy, sortDir }),
    maxDistance,
    openRolesOnly: effectiveOpenRolesOnly,
    excludeOwnTeams: !effectiveIncludeOwnTeams,
    includeDemoData,
    capacityMode,
    tagIds: filterTagIds,
    badgeIds: filterBadgeIds,
    roleId: matchRoleId,
    excludeTeamId,
  };
};
