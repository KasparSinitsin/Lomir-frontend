/**
 * Local-only switch for producing marketing screenshots without the Demo
 * markers on top of every synthetic profile, team and role.
 *
 * Set `VITE_HIDE_DEMO_MARKERS=true` in a local `.env` (gitignored) and restart
 * the dev server. It suppresses the visible marking only — the data keeps its
 * synthetic flag, the search-side demo filter is a backend concern and is not
 * affected, and `hasSyntheticFlag` below stays truthful for code that needs to
 * know what an entity really is.
 *
 * Never enable this for a deployed build. The markers are what tells a real
 * visitor that a profile is not a real person.
 */
const HIDE_DEMO_MARKERS =
  import.meta.env?.VITE_HIDE_DEMO_MARKERS === "true";

const hasTruthySyntheticFlag = (value) => {
  if (value === true || value === 1) return true;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }

  return false;
};

/**
 * Get user initials for avatar fallback
 * Returns 2 letters for users with first and last name (e.g., "VL" for Valentina Lopez)
 * Falls back to single letter from first name or username
 */
export const getUserInitials = (user) => {
  if (!user) return "?";

  const firstName = user.first_name || user.firstName;
  const lastName = user.last_name || user.lastName;

  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  if (user.username) {
    return user.username.charAt(0).toUpperCase();
  }
  return "?";
};

export const getUserAvatarUrl = (user) =>
  user?.avatar_url || user?.avatarUrl || null;

/**
 * Get team initials for avatar fallback
 * Returns up to 3 letters from the first 3 words of the team name
 * e.g., "Gardening Gnomes" -> "GG", "Remote Language & Culture Exchange" -> "RLC"
 */
export const getTeamInitials = (team) => {
  const name = team?.name || team;

  if (!name || typeof name !== "string") return "?";

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return name.slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
};

/**
 * Get display name for a user
 * Prioritizes first name + last name over username
 * Returns full name if at least one name part is available
 */
export const getDisplayName = (user) => {
  if (!user) return "Unknown";

  const firstName = user.first_name || user.firstName || "";
  const lastName = user.last_name || user.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName.length > 0) return fullName;
  return user.username || "Unknown";
};

/**
 * Read the synthetic flag off any entity, regardless of casing.
 *
 * This is the truthful check and is never suppressed by HIDE_DEMO_MARKERS.
 * Use it where demo status drives behaviour rather than a visible marker —
 * the map, for instance, resolves canonical locations for demo profiles.
 */
export const hasSyntheticFlag = (entity) => {
  if (!entity) return false;
  return (
    hasTruthySyntheticFlag(entity.is_synthetic) ||
    hasTruthySyntheticFlag(entity.isSynthetic)
  );
};

/**
 * Check if a user is a synthetic/demo user
 * Handles both snake_case (from API) and camelCase (from frontend state)
 *
 * Display-facing: returns false while HIDE_DEMO_MARKERS is on.
 */
export const isSyntheticUser = (user) => {
  if (HIDE_DEMO_MARKERS) return false;
  return hasSyntheticFlag(user);
};

/**
 * Check if a team is a synthetic/demo team
 * Handles both snake_case (from API) and camelCase (from frontend state)
 *
 * Display-facing: returns false while HIDE_DEMO_MARKERS is on.
 */
export const isSyntheticTeam = (team) => {
  if (HIDE_DEMO_MARKERS) return false;
  return hasSyntheticFlag(team);
};

/**
 * Check if a vacant role is a synthetic/demo role
 * Handles both snake_case (from API) and camelCase (from frontend state)
 *
 * Display-facing: returns false while HIDE_DEMO_MARKERS is on.
 */
export const isSyntheticRole = (role) => {
  if (HIDE_DEMO_MARKERS) return false;
  return hasSyntheticFlag(role);
};

export const DEMO_PROFILE_TOOLTIP =
  "Demo Profile: For testing purposes, no real person";

export const DEMO_TEAM_TOOLTIP =
  "Demo Team: for testing purposes, no real team";

export const DEMO_ROLE_TOOLTIP =
  "Demo Role: for testing purposes, no real role";

export const normalizeHiddenBadgeIds = (user) => {
  if (!user) return [];

  const rawIds = user.hidden_badge_ids ?? user.hiddenBadgeIds ?? [];
  if (!Array.isArray(rawIds)) return [];

  return rawIds
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value));
};

export const isBadgeHiddenForUser = (badge, user) => {
  const hiddenIds = normalizeHiddenBadgeIds(user);
  if (!hiddenIds.length) return false;

  const badgeId =
    badge?.id ?? badge?.badgeId ?? badge?.badge_id ?? badge?.badge_id;
  if (badgeId !== undefined && badgeId !== null) {
    if (hiddenIds.includes(String(badgeId))) return true;
  }

  const badgeName = (badge?.name ?? badge?.badgeName ?? badge?.badge_name ?? "")
    .trim();
  if (badgeName) {
    return hiddenIds.includes(badgeName);
  }

  return false;
};
