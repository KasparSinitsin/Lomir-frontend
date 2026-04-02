export const DELETED_USER_DISPLAY_NAME = "Former Lomir User";

export const isDeletedUser = (user) => {
  return (
    !user ||
    (!user.id && !user.userId && !user.user_id && !user.username)
  );
};

export const getDisplayName = (
  user,
  fallback = DELETED_USER_DISPLAY_NAME,
) => {
  if (!user) return fallback;

  const first = user.firstName || user.first_name || "";
  const last = user.lastName || user.last_name || "";
  const full = `${first} ${last}`.trim();

  return full || user.username || fallback;
};
