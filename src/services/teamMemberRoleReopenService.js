import { messageService } from "./messageService";
import { vacantRoleService } from "./vacantRoleService";
import { buildRoleReopenedMessage } from "../utils/roleEventMessages";
import { resolveFilledRoleUser } from "../utils/vacantRoleUtils";

const unwrapData = (response) => {
  if (!response) return response;
  if (response.success !== undefined) return response.data;
  return response.data?.data ?? response.data ?? response;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getRoleId = (role) => role?.id ?? role?.roleId ?? role?.role_id ?? null;

const getFilledById = (role) =>
  role?.filledByUser?.id ??
  role?.filled_by_user?.id ??
  role?.filledByUserId ??
  role?.filled_by_user_id ??
  role?.filledBy ??
  role?.filled_by ??
  null;

export const getRolesFilledByMember = (roles, memberId) => {
  if (memberId == null) return [];

  return asArray(roles).filter((role) => {
    const roleId = getRoleId(role);
    if (roleId == null) return false;

    const status = String(role?.status ?? "").toLowerCase();
    const filledById = getFilledById(role);

    return (
      status === "filled" &&
      filledById != null &&
      String(filledById) === String(memberId)
    );
  });
};

export const fetchRolesFilledByMember = async (teamId, memberId) => {
  const response = await vacantRoleService.getVacantRoles(teamId, "all");
  return getRolesFilledByMember(unwrapData(response), memberId);
};

export const reopenRolesFilledByMember = async ({
  teamId,
  teamName,
  member,
  memberId,
  roles = null,
  useProvidedRoles = false,
}) => {
  const departingMemberId =
    memberId ?? member?.id ?? member?.userId ?? member?.user_id ?? null;

  if (!teamId || departingMemberId == null) {
    return [];
  }

  const rolesToReopen = Array.isArray(roles) && (useProvidedRoles || roles.length > 0)
    ? getRolesFilledByMember(roles, departingMemberId)
    : await fetchRolesFilledByMember(teamId, departingMemberId);

  const reopenedRoles = [];

  for (const role of rolesToReopen) {
    const roleId = getRoleId(role);
    if (roleId == null) continue;

    const updateResponse = await vacantRoleService.updateVacantRoleStatus(
      teamId,
      roleId,
      "open",
      null,
      { skipChatMessage: true },
    );
    const updatedRole = unwrapData(updateResponse);
    const eventRole =
      updatedRole && typeof updatedRole === "object"
        ? { ...role, ...updatedRole }
        : role;

    try {
      await messageService.sendMessage(
        teamId,
        buildRoleReopenedMessage({
          teamId,
          teamName,
          role,
          filledUser: member ?? resolveFilledRoleUser(role),
        }),
        "team",
      );
    } catch (messageError) {
      console.warn("Role reopened, but chat event could not be sent:", messageError);
    }

    reopenedRoles.push(eventRole);
  }

  return reopenedRoles;
};
