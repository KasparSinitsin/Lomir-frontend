import { format } from "date-fns";

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

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null);

export const getUserPublicFlag = (user) =>
  firstPresent(
    user?.is_public,
    user?.isPublic,
    user?.profile_is_public,
    user?.profileIsPublic,
    user?.public_profile,
    user?.publicProfile,
  );

export const getUserPrivateFlag = (user) =>
  firstPresent(
    user?.is_private,
    user?.isPrivate,
    user?.profile_is_private,
    user?.profileIsPrivate,
    user?.private_profile,
    user?.privateProfile,
  );

export const isPrivateProfileUser = (user) => {
  if (!user) return false;

  return (
    normalizeBoolean(getUserPublicFlag(user)) === false ||
    normalizeBoolean(getUserPrivateFlag(user)) === true
  );
};

export const getPrivateAwareUserLabel = (user, fallback = "Their") => {
  if (isPrivateProfileUser(user)) return "Private Profile";

  return user?.first_name ?? user?.firstName ?? user?.username ?? fallback;
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

export const getRequestUserId = (request, userKey) =>
  request?.[userKey]?.id ??
  request?.[`${userKey}Id`] ??
  request?.[`${userKey}_id`] ??
  null;

export const getRequestUser = (request, userKey) =>
  request?.[userKey] ?? null;

export const getRequestUserLabel = (request, userKey, fallback = "Their") => {
  const user = getRequestUser(request, userKey);

  return getPrivateAwareUserLabel(user, fallback);
};

export const isRequestForUser = (request, userKey, userId) =>
  idsMatch(getRequestUserId(request, userKey), userId);

export const getRequestDateValue = (request) =>
  request?.created_at ??
  request?.createdAt ??
  request?.date ??
  request?.applied_at ??
  request?.appliedAt ??
  request?.sent_at ??
  request?.sentAt ??
  request?.invited_at ??
  request?.invitedAt ??
  request?.submitted_at ??
  request?.submittedAt ??
  null;

export const formatRequestDate = (request, fallback = "Unknown date") => {
  const date = getRequestDateValue(request);
  if (!date) return fallback;

  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch (error) {
    console.error("Error formatting request date:", error);
    return fallback;
  }
};

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

export const buildCurrentFilledRoleForCard = (
  invitation,
  filledUser = null,
) => {
  const currentRole =
    invitation?.currentFilledRole ??
    invitation?.current_filled_role ??
    null;
  const currentRoleLocation =
    currentRole?.roleLocation ??
    currentRole?.role_location ??
    invitation?.currentFilledRoleLocation ??
    invitation?.current_filled_role_location ??
    null;
  const filledUserId = getRequestUserId(invitation, "invitee");
  const currentRoleSyntheticFlag = firstPresent(
    currentRole?.isSynthetic,
    currentRole?.is_synthetic,
    invitation?.currentFilledRoleIsSynthetic,
    invitation?.current_filled_role_is_synthetic,
    invitation?.role_is_synthetic,
  );
  const currentRoleId = firstPresent(
    currentRole?.id,
    invitation?.current_filled_role_id,
    invitation?.currentFilledRoleId,
  );

  if (currentRoleId == null) return null;

  return {
    ...(currentRole ?? {}),
    id: currentRoleId,
    role_name: firstPresent(
      currentRole?.role_name,
      currentRole?.roleName,
      invitation?.current_filled_role_name,
      invitation?.currentFilledRoleName,
    ),
    roleName: firstPresent(
      currentRole?.roleName,
      currentRole?.role_name,
      invitation?.currentFilledRoleName,
      invitation?.current_filled_role_name,
    ),
    status: currentRole?.status ?? "filled",
    filled_by: firstPresent(currentRole?.filled_by, currentRole?.filledBy, filledUserId),
    filledBy: firstPresent(currentRole?.filledBy, currentRole?.filled_by, filledUserId),
    filled_by_user:
      currentRole?.filled_by_user ??
      currentRole?.filledByUser ??
      filledUser ??
      null,
    filledByUser:
      currentRole?.filledByUser ??
      currentRole?.filled_by_user ??
      filledUser ??
      null,
    is_synthetic: currentRoleSyntheticFlag,
    isSynthetic: currentRoleSyntheticFlag,
    is_remote: firstPresent(
      currentRole?.is_remote,
      currentRole?.isRemote,
      invitation?.current_filled_role_is_remote,
      invitation?.currentFilledRoleIsRemote,
    ),
    isRemote: firstPresent(
      currentRole?.isRemote,
      currentRole?.is_remote,
      invitation?.currentFilledRoleIsRemote,
      invitation?.current_filled_role_is_remote,
    ),
    city: firstPresent(
      currentRole?.city,
      currentRoleLocation?.city,
      invitation?.current_filled_role_city,
      invitation?.currentFilledRoleCity,
    ),
    state: firstPresent(
      currentRole?.state,
      currentRoleLocation?.state,
      invitation?.current_filled_role_state,
      invitation?.currentFilledRoleState,
    ),
    country: firstPresent(
      currentRole?.country,
      currentRoleLocation?.country,
      invitation?.current_filled_role_country,
      invitation?.currentFilledRoleCountry,
    ),
    postal_code: firstPresent(
      currentRole?.postal_code,
      currentRole?.postalCode,
      currentRoleLocation?.postal_code,
      currentRoleLocation?.postalCode,
      invitation?.current_filled_role_postal_code,
      invitation?.currentFilledRolePostalCode,
    ),
    postalCode: firstPresent(
      currentRole?.postalCode,
      currentRole?.postal_code,
      currentRoleLocation?.postalCode,
      currentRoleLocation?.postal_code,
      invitation?.currentFilledRolePostalCode,
      invitation?.current_filled_role_postal_code,
    ),
    max_distance_km: firstPresent(
      currentRole?.max_distance_km,
      currentRole?.maxDistanceKm,
      invitation?.current_filled_role_max_distance_km,
      invitation?.currentFilledRoleMaxDistanceKm,
    ),
    maxDistanceKm: firstPresent(
      currentRole?.maxDistanceKm,
      currentRole?.max_distance_km,
      invitation?.currentFilledRoleMaxDistanceKm,
      invitation?.current_filled_role_max_distance_km,
    ),
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
