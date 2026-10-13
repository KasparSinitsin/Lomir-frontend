/**
 * A team's member count and capacity, read from whichever shape the API
 * returned. `max_members = null` means unlimited.
 *
 * Display and form hints only: the backend decides on join
 * (`TEAM_FULL`) and on save (`MAX_MEMBERS_BELOW_MEMBER_COUNT`), and a count
 * read here can be stale.
 */

export const getTeamMemberCount = (team) => {
  const count =
    team?.current_members_count ??
    team?.currentMembersCount ??
    team?.member_count ??
    team?.memberCount ??
    (Array.isArray(team?.members) ? team.members.length : null);
  const number = Number(count);
  return Number.isFinite(number) ? number : null;
};

/** `null` for unlimited or unknown. */
export const getTeamMaxMembers = (team) => {
  const max = team?.max_members ?? team?.maxMembers ?? null;
  if (max === null || max === undefined || max === "") return null;
  const number = Number(max);
  return Number.isFinite(number) ? number : null;
};

/** Only true when both numbers are known — an unknown count never blocks. */
export const isTeamAtCapacity = (memberCount, maxMembers) =>
  Number.isFinite(memberCount) &&
  Number.isFinite(maxMembers) &&
  memberCount >= maxMembers;

export const isTeamFull = (team) =>
  isTeamAtCapacity(getTeamMemberCount(team), getTeamMaxMembers(team));
