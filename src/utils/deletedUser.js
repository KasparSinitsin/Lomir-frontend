// ⚠️ A wire value, not a label: both repos write it into stored messages and
// compare against it. Display it as t("user.formerUser"), never translate it.
export const DELETED_USER_DISPLAY_NAME = "Former Lomir User";

export const isDeletedUser = (user) => {
  return (
    !user ||
    (!user.id && !user.userId && !user.user_id && !user.username)
  );
};

/** ⚠️ The default fallback is the English wire value — pass t("user.formerUser") for display. */
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
