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
 * Check if a user is a synthetic/demo user
 * Handles both snake_case (from API) and camelCase (from frontend state)
 */
export const isSyntheticUser = (user) => {
  if (!user) return false;
  return (
    hasTruthySyntheticFlag(user.is_synthetic) ||
    hasTruthySyntheticFlag(user.isSynthetic)
  );
};

/**
 * Check if a team is a synthetic/demo team
 * Handles both snake_case (from API) and camelCase (from frontend state)
 */
export const isSyntheticTeam = (team) => {
  if (!team) return false;
  return (
    hasTruthySyntheticFlag(team.is_synthetic) ||
    hasTruthySyntheticFlag(team.isSynthetic)
  );
};

/**
 * Check if a vacant role is a synthetic/demo role
 * Handles both snake_case (from API) and camelCase (from frontend state)
 */
export const isSyntheticRole = (role) => {
  if (!role) return false;
  return (
    hasTruthySyntheticFlag(role.is_synthetic) ||
    hasTruthySyntheticFlag(role.isSynthetic)
  );
};

export const DEMO_PROFILE_TOOLTIP =
  "Demo Profile: For testing purposes, no real person";

export const DEMO_TEAM_TOOLTIP =
  "Demo Team: for testing purposes, no real team";

export const DEMO_ROLE_TOOLTIP =
  "Demo Role: for testing purposes, no real role";
