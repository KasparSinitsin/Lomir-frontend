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

export const getActiveCriteriaPills = ({
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
    pills.push({ key: "sort", label: "Best Match" });
  } else if (sortBy === "name" && sortDir === "desc") {
    pills.push({ key: "sort", label: "Name Z-A" });
  } else if (sortBy === "recent") {
    pills.push({
      key: "sort",
      label: sortDir === "desc" ? "Active" : "Inactive",
    });
  } else if (sortBy === "newest") {
    pills.push({
      key: "sort",
      label: sortDir === "desc" ? "Newest" : "Oldest",
    });
  } else if (sortBy === "capacity") {
    pills.push({
      key: "sort",
      label:
        capacityMode === "spots"
          ? sortDir === "desc"
            ? "Most Spots"
            : "Almost Full"
          : sortDir === "desc"
            ? "Most Open Roles"
            : "Least Open Roles",
    });
  } else if (sortBy === "proximity") {
    pills.push({
      key: "sort",
      label: sortDir === "remote" ? "Remote First" : "Nearest First",
      shortLabel: sortDir === "remote" ? "Remote" : "Near",
    });
  }

  if (maxDistance !== null) {
    pills.push({
      key: "maxDistance",
      label: `< ${maxDistance} km`,
      removeLabel: `Within ${maxDistance} km`,
    });
  }

  if (effectiveOpenRolesOnly) {
    pills.push({ key: "openRolesOnly", label: "Open Roles Only" });
  }

  if (!effectiveIncludeOwnTeams) {
    pills.push({
      key: "includeOwnTeams",
      label: "Exclude My Teams",
    });
  }

  if (!includeDemoData) {
    pills.push({
      key: "includeDemoData",
      label: "Exclude Demo Data",
    });
  }

  if (matchRoleId && matchRoleName) {
    pills.unshift({
      key: "matchRole",
      label: matchRoleName,
      type: "role",
    });
  }

  if (excludeTeamId) {
    pills.push({
      key: "excludeTeam",
      label: `Excl. ${excludeTeamName || "team"} members`,
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
