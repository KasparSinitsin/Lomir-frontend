export const resolveFilledRoleUser = (
  role,
  { viewAsUserId = null, viewAsUser = null } = {},
) => {
  if (!role) return null;

  const filledById =
    role.filledByUser?.id ??
    role.filled_by_user?.id ??
    role.filledByUserId ??
    role.filled_by_user_id ??
    role.filledBy ??
    role.filled_by ??
    null;

  const flatFilledUser = (() => {
    const firstName =
      role.filledByUserFirstName ?? role.filled_by_user_first_name ?? null;
    const lastName =
      role.filledByUserLastName ?? role.filled_by_user_last_name ?? null;
    const username =
      role.filledByUserUsername ?? role.filled_by_user_username ?? null;
    const avatarUrl =
      role.filledByUserAvatarUrl ?? role.filled_by_user_avatar_url ?? null;

    if (!filledById && !firstName && !lastName && !username && !avatarUrl) {
      return null;
    }

    return {
      id: filledById,
      firstName,
      first_name: firstName,
      lastName,
      last_name: lastName,
      username,
      avatarUrl,
      avatar_url: avatarUrl,
    };
  })();

  const filledUserFromContext =
    filledById != null &&
    viewAsUser &&
    viewAsUserId != null &&
    String(filledById) === String(viewAsUserId)
      ? viewAsUser
      : null;

  const merged = {
    ...(filledUserFromContext || {}),
    ...(flatFilledUser || {}),
    ...(role.filled_by_user || {}),
    ...(role.filledByUser || {}),
  };

  return Object.keys(merged).length > 0 ? merged : null;
};
