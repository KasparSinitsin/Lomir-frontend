import { getDisplayName } from "./userHelpers";
import { resolveFilledRoleUser } from "./vacantRoleUtils";

const formatIdNameToken = (id, name) =>
  id != null ? `${id}:${name || "Unknown"}` : name || "Unknown";

const getUserEventId = (user) =>
  user?.id ?? user?.userId ?? user?.user_id ?? null;

const getUserEventName = (user) => {
  if (!user) return null;

  const displayName = getDisplayName(user);
  if (displayName && displayName !== "Unknown") return displayName;

  return (
    user?.username ??
    user?.userName ??
    user?.firstName ??
    user?.first_name ??
    null
  );
};

export const getRoleEventName = (role) =>
  role?.roleName ?? role?.role_name ?? role?.name ?? role?.title ?? "this role";

export const getFilledRoleUser = (role) => resolveFilledRoleUser(role);

export const getFilledRoleUserName = (role) => {
  const filledUser = getFilledRoleUser(role);

  if (filledUser && getDisplayName(filledUser) !== "Unknown") {
    return getDisplayName(filledUser);
  }

  return (
    role?.filledByUserUsername ??
    role?.filled_by_user_username ??
    role?.filledByUserName ??
    role?.filled_by_user_name ??
    "Someone"
  );
};

export const buildRoleReopenedMessage = ({ teamId, teamName, role, filledUser = null }) => {
  const resolvedFilledUser = filledUser ?? getFilledRoleUser(role);
  const filledUserId = getUserEventId(resolvedFilledUser);
  const filledUserName =
    getUserEventName(resolvedFilledUser) ??
    (filledUser ? null : getFilledRoleUserName(role));
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);

  return `🔓 ROLE_REOPENED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(filledUserId, filledUserName || "Someone")}`;
};

export const buildRoleFilledMessage = ({
  teamId,
  teamName,
  role,
  filledUser = null,
}) => {
  const resolvedFilledUser = filledUser ?? getFilledRoleUser(role);
  const filledUserId = getUserEventId(resolvedFilledUser);
  const filledUserName =
    getUserEventName(resolvedFilledUser) ??
    (filledUser ? null : getFilledRoleUserName(role));
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);

  return `✅ ROLE_FILLED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(filledUserId, filledUserName || "Someone")}`;
};
