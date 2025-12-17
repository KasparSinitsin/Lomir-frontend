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