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
