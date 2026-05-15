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

export const buildRoleReopenedAdminMessage = ({ teamId, teamName, role, reopenedBy = null }) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const reopenedById = getUserEventId(reopenedBy);
  const reopenedByName = getUserEventName(reopenedBy) ?? "Someone";

  return `🔓 ROLE_REOPENED_ADMIN: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(reopenedById, reopenedByName)}`;
};

export const buildRoleClosedMessage = ({ teamId, teamName, role, closedBy = null }) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const closedById = getUserEventId(closedBy);
  const closedByName = getUserEventName(closedBy) ?? "Someone";

  return `🔒 ROLE_CLOSED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(closedById, closedByName)}`;
};

export const buildRoleUpdatedMessage = ({ teamId, teamName, role, updatedBy = null }) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const updatedById = getUserEventId(updatedBy);
  const updatedByName = getUserEventName(updatedBy) ?? "Someone";

  return `✏️ ROLE_UPDATED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(updatedById, updatedByName)}`;
};

export const buildRoleDeletedMessage = ({ teamId, teamName, role, deletedBy = null }) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const deletorId = getUserEventId(deletedBy);
  const deletorName = getUserEventName(deletedBy) ?? "Someone";

  return `🗑️ ROLE_DELETED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(deletorId, deletorName)}`;
};

export const buildRoleCreatedMessage = ({ teamId, teamName, role, creator = null }) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const creatorId = getUserEventId(creator);
  const creatorName = getUserEventName(creator) ?? "Someone";

  return `🆕 ROLE_CREATED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(creatorId, creatorName)}`;
};

export const buildRoleFilledMessage = ({
  teamId,
  teamName,
  role,
  filledUser = null,
  filledBy = null,
}) => {
  const resolvedFilledUser = filledUser ?? getFilledRoleUser(role);
  const filledUserId = getUserEventId(resolvedFilledUser);
  const filledUserName =
    getUserEventName(resolvedFilledUser) ??
    (filledUser ? null : getFilledRoleUserName(role));
  const filledById = getUserEventId(filledBy);
  const filledByName = getUserEventName(filledBy);
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);

  const baseMessage = `✅ ROLE_FILLED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(filledUserId, filledUserName || "Someone")}`;

  return filledById != null || filledByName
    ? `${baseMessage} | ${formatIdNameToken(filledById, filledByName || "Someone")}`
    : baseMessage;
};

export const buildRoleInvitationFilledMessage = ({
  teamId,
  teamName,
  role,
  invitee = null,
}) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const inviteeId = getUserEventId(invitee);
  const inviteeName = getUserEventName(invitee) ?? "Someone";

  return `✅ ROLE_INVITATION_FILLED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(inviteeId, inviteeName)}`;
};

export const buildRoleInvitationAcceptedMessage = ({
  teamId,
  teamName,
  role,
  invitee = null,
  inviter = null,
  fillRole = false,
}) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const inviteeId = getUserEventId(invitee);
  const inviteeName = getUserEventName(invitee) ?? "Someone";
  const inviterId = getUserEventId(inviter);
  const inviterName = getUserEventName(inviter) ?? "Someone";

  return `🤝 ROLE_INVITATION_ACCEPTED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(inviteeId, inviteeName)} | ${formatIdNameToken(inviterId, inviterName)} | ${fillRole ? "true" : "false"}`;
};

export const buildRoleApplicationFilledMessage = ({
  teamId,
  teamName,
  role,
  applicant = null,
  approver = null,
}) => {
  const roleId = role?.id ?? role?.roleId ?? role?.role_id ?? null;
  const roleName = getRoleEventName(role);
  const applicantId = getUserEventId(applicant);
  const applicantName = getUserEventName(applicant) ?? "Someone";
  const approverId = getUserEventId(approver);
  const approverName = getUserEventName(approver);

  const baseMessage = `✅ ROLE_APPLICATION_FILLED: ${formatIdNameToken(teamId, teamName)} | ${formatIdNameToken(roleId, roleName)} | ${formatIdNameToken(applicantId, applicantName)}`;

  return approverId != null || approverName
    ? `${baseMessage} | ${formatIdNameToken(approverId, approverName || "Someone")}`
    : baseMessage;
};
