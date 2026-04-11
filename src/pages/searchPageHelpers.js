export const DISTANCE_SUBMENU_TYPE = "distance";

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
    if (option.authOnly && !isAuthenticated) return false;
    return true;
  });

export const getSortOptionDisplay = ({
  option,
  sortBy,
  sortDir,
  isCapacitySpotsSort,
}) => {
  const isActive =
    option.value === "capacity" ? isCapacitySpotsSort : sortBy === option.value;
  const currentDir = isActive
    ? option.value === "capacity"
      ? sortDir
      : sortBy === option.value
        ? sortDir
        : option.defaultDir || "desc"
    : option.defaultDir || "desc";

  if (currentDir === "asc") {
    return {
      isActive,
      currentDir,
      IconComponent: option.iconAsc,
      label: option.labelAsc,
      shortLabel: option.shortLabelAsc,
    };
  }

  if (currentDir === "remote") {
    return {
      isActive,
      currentDir,
      IconComponent: option.iconRemote,
      label: option.labelRemote,
      shortLabel: option.shortLabelRemote,
    };
  }

  return {
    isActive,
    currentDir,
    IconComponent: option.iconDesc,
    label: option.labelDesc,
    shortLabel: option.shortLabelDesc,
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
      label:
        sortDir === "remote"
          ? "Remote"
          : sortDir === "desc"
            ? "Farthest"
            : "Nearest",
    });
  }

  if (maxDistance !== null) {
    pills.push({
      key: "maxDistance",
      label: `Within ${maxDistance} km`,
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
}) => ({
  mode: hasSearched && searchQuery.trim() ? "search" : "all",
  query: searchQuery.trim(),
  searchType,
  page: currentPage,
  limit: resultsPerPage,
  sortBy,
  sortDir,
  maxDistance,
  openRolesOnly: effectiveOpenRolesOnly,
  excludeOwnTeams: !effectiveIncludeOwnTeams,
  includeDemoData,
  capacityMode,
  tagIds: filterTagIds,
  badgeIds: filterBadgeIds,
  roleId: matchRoleId,
  excludeTeamId,
});
