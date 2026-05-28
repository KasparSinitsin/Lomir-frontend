export const normalizeNumericId = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const numericIdsMatch = (left, right) => {
  const normalizedLeft = normalizeNumericId(left);
  const normalizedRight = normalizeNumericId(right);

  if (normalizedLeft === null || normalizedRight === null) return false;
  return normalizedLeft === normalizedRight;
};

export const idsMatch = (left, right) => {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  return String(left) === String(right);
};

export const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalizedValue)) return true;
    if (["false", "0", "no"].includes(normalizedValue)) return false;
  }

  return null;
};

export const isExistingMemberStatus = (value) => {
  if (typeof value !== "string") return false;

  const normalizedValue = value.trim().toLowerCase();
  return (
    normalizedValue === "member" ||
    normalizedValue === "existing-member" ||
    normalizedValue === "existing_member"
  );
};

export const getMemberUserId = (member) => {
  const memberUser = member?.user || member;

  return (
    member?.userId ??
    member?.user_id ??
    member?.memberId ??
    member?.member_id ??
    memberUser?.userId ??
    memberUser?.user_id ??
    memberUser?.id ??
    member?.id ??
    null
  );
};

export const extractRoleMatchData = (roleLike) => {
  const rawScore = roleLike?.matchScore ?? roleLike?.match_score ?? null;
  const numericScore = Number(rawScore);

  return {
    matchScore: Number.isFinite(numericScore) ? numericScore : null,
    matchDetails:
      roleLike?.matchDetails ??
      roleLike?.match_details ??
      roleLike?.scoreBreakdown ??
      null,
  };
};

export const getRequestRoleId = (request) =>
  request?.role?.id ?? request?.roleId ?? request?.role_id ?? null;

export const hasRequestRole = (request) =>
  Boolean(request?.role || request?.roleId || request?.role_id);

export const getRequestRoleSyntheticFlag = (request) =>
  request?.role?.is_synthetic ??
  request?.role?.isSynthetic ??
  request?.role_is_synthetic ??
  request?.roleIsSynthetic ??
  request?.is_synthetic ??
  request?.isSynthetic;

export const buildInvitationRoleForCard = (invitation, polledRole = null) => {
  const syntheticRoleFlag = getRequestRoleSyntheticFlag(invitation);

  if (invitation?.role) {
    return {
      ...invitation.role,
      ...(polledRole ?? {}),
      is_synthetic:
        invitation.role.is_synthetic ??
        invitation.role.isSynthetic ??
        syntheticRoleFlag,
      isSynthetic:
        invitation.role.isSynthetic ??
        invitation.role.is_synthetic ??
        syntheticRoleFlag,
    };
  }

  return {
    id: invitation?.roleId ?? invitation?.role_id,
    roleName: invitation?.roleName ?? invitation?.role_name,
    role_name: invitation?.role_name ?? invitation?.roleName,
    is_synthetic: syntheticRoleFlag,
    isSynthetic: syntheticRoleFlag,
    ...(polledRole ?? {}),
  };
};

export const buildApplicationRoleForCard = (
  application,
  polledRole = null,
  roleOverride = null,
) => {
  const syntheticRoleFlag = getRequestRoleSyntheticFlag(application);
  const roleId = getRequestRoleId(application);

  if (application?.role && roleId) {
    return {
      ...application.role,
      ...(polledRole ?? {}),
      is_synthetic:
        application.role.is_synthetic ??
        application.role.isSynthetic ??
        syntheticRoleFlag,
      isSynthetic:
        application.role.isSynthetic ??
        application.role.is_synthetic ??
        syntheticRoleFlag,
      status:
        roleOverride?.status ??
        polledRole?.status ??
        application.role.status ??
        "open",
      filledBy:
        roleOverride?.filledBy ??
        polledRole?.filledBy ??
        polledRole?.filled_by ??
        application.role.filledBy ??
        application.role.filled_by ??
        null,
      filledByUser:
        roleOverride?.filledByUser ??
        polledRole?.filledByUser ??
        polledRole?.filled_by_user ??
        application.role.filledByUser ??
        application.role.filled_by_user ??
        null,
    };
  }

  return application?.role
    ? {
        ...application.role,
        ...(polledRole ?? {}),
        is_synthetic:
          application.role.is_synthetic ??
          application.role.isSynthetic ??
          syntheticRoleFlag,
        isSynthetic:
          application.role.isSynthetic ??
          application.role.is_synthetic ??
          syntheticRoleFlag,
      }
    : null;
};
