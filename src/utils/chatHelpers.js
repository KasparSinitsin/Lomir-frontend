import { normalizeTimestampToDate } from "./dateHelpers";
import { joinNameParts } from "./nameFormatters";

// Entity / payload / team-member helpers for the chat page. These are pure
// functions with no component state, extracted verbatim from Chat.jsx so the
// page component can stay focused on orchestration. See also
// utils/chatEntityResolvers.js (network-backed profile resolution) and
// utils/chatSearch.js (search/preview helpers).

export const getConversationPartnerId = (conversation) =>
  conversation?.partner?.id ??
  conversation?.partnerUser?.id ??
  conversation?.partnerId ??
  conversation?.partner_id ??
  null;

export const resolveTypingUserId = (payload) =>
  payload?.userId ??
  payload?.user_id ??
  payload?.senderId ??
  payload?.sender_id ??
  payload?.id ??
  null;

export const resolveTypingDisplayName = (payload) => {
  const first = payload?.firstName || payload?.first_name || "";
  const last = payload?.lastName || payload?.last_name || "";
  const fullName = joinNameParts(first, last);
  return fullName || payload?.username || payload?.userName || payload?.name || null;
};

export const resolveConversationUser = (conversation, userId) => {
  if (!conversation || !userId) return null;

  if (conversation.type === "direct") {
    const partner = conversation.partner || conversation.partnerUser;
    if (
      partner &&
      String(getConversationPartnerId(conversation)) === String(userId)
    ) {
      return partner;
    }
  }

  if (conversation.type === "team") {
    const members = conversation.team?.members || conversation.members || [];
    const matchedMember = members.find((member) => {
      const memberUser = member.user || member;
      const memberId =
        member?.userId ??
        member?.user_id ??
        memberUser?.userId ??
        memberUser?.user_id ??
        memberUser?.id ??
        member?.id ??
        null;
      return String(memberId) === String(userId);
    });

    if (matchedMember) {
      return matchedMember.user || matchedMember;
    }
  }

  return null;
};

const getTeamMemberUserId = (member) => {
  const memberUser = member?.user || member;
  return (
    member?.userId ??
    member?.user_id ??
    memberUser?.userId ??
    memberUser?.user_id ??
    memberUser?.id ??
    member?.id ??
    null
  );
};

export const isActiveTeamMemberRow = (member) => {
  if (!member) return false;

  const rawStatus =
    member.membershipStatus ??
    member.membership_status ??
    member.memberStatus ??
    member.member_status ??
    member.status ??
    null;
  const status = String(rawStatus ?? "").trim().toLowerCase();

  if (
    status &&
    ["removed", "left", "former", "inactive", "deleted"].includes(status)
  ) {
    return false;
  }

  return !(
    member.removedAt ||
    member.removed_at ||
    member.leftAt ||
    member.left_at ||
    member.deletedAt ||
    member.deleted_at
  );
};

export const isUserTeamMember = (members, userId) => {
  if (userId == null) return false;
  if (!Array.isArray(members)) return false;

  return members.some((member) => {
    if (!isActiveTeamMemberRow(member)) return false;

    const memberId = getTeamMemberUserId(member);
    return memberId != null && String(memberId) === String(userId);
  });
};

export const getPayloadTeamId = (payload) =>
  payload?.teamId ??
  payload?.team_id ??
  payload?.team?.id ??
  payload?.data?.teamId ??
  payload?.data?.team_id ??
  payload?.metadata?.teamId ??
  payload?.metadata?.team_id ??
  null;

const getPayloadType = (payload) =>
  String(
    payload?.type ??
      payload?.notificationType ??
      payload?.notification_type ??
      payload?.eventType ??
      payload?.event_type ??
      payload?.data?.type ??
      payload?.metadata?.type ??
      "",
  ).toLowerCase();

const getRemovedMemberIdFromPayload = (payload) =>
  payload?.memberId ??
  payload?.member_id ??
  payload?.removedUserId ??
  payload?.removed_user_id ??
  payload?.targetUserId ??
  payload?.target_user_id ??
  payload?.data?.memberId ??
  payload?.data?.member_id ??
  payload?.metadata?.memberId ??
  payload?.metadata?.member_id ??
  null;

const getPayloadText = (payload) =>
  [
    payload?.message,
    payload?.content,
    payload?.text,
    payload?.body,
    payload?.title,
    payload?.data?.message,
    payload?.data?.content,
    payload?.metadata?.message,
    payload?.metadata?.content,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

export const isCurrentUserRemovalPayload = (payload, userId) => {
  const type = getPayloadType(payload);
  if (!type.includes("member_removed") && !type.includes("removed")) {
    return false;
  }

  const removedMemberId = getRemovedMemberIdFromPayload(payload);
  if (removedMemberId != null && String(removedMemberId) === String(userId)) {
    return true;
  }

  const text = getPayloadText(payload);
  return /\byou\b/.test(text) && /removed from/.test(text);
};

export const mergeTeamDetailsIntoConversationData = (conversationData, teamPayload) => {
  if (!conversationData || !teamPayload) return conversationData;

  const currentTeam = conversationData.team || {};
  const archivedAt =
    currentTeam.archivedAt ??
    currentTeam.archived_at ??
    teamPayload.archivedAt ??
    teamPayload.archived_at ??
    undefined;
  const status = currentTeam.status ?? teamPayload.status ?? undefined;

  return {
    ...conversationData,
    team: {
      ...currentTeam,
      archived_at: currentTeam.archived_at ?? teamPayload.archived_at ?? archivedAt,
      archivedAt,
      status,
      avatarUrl:
        currentTeam.avatarUrl ||
        currentTeam.teamavatarUrl ||
        currentTeam.teamavatar_url ||
        teamPayload.avatarUrl ||
        teamPayload.teamavatarUrl ||
        teamPayload.teamavatar_url,
      isSynthetic:
        currentTeam.isSynthetic ??
        currentTeam.is_synthetic ??
        teamPayload.isSynthetic ??
        teamPayload.is_synthetic ??
        undefined,
      is_synthetic:
        currentTeam.is_synthetic ??
        currentTeam.isSynthetic ??
        teamPayload.is_synthetic ??
        teamPayload.isSynthetic ??
        undefined,
      members: Array.isArray(teamPayload.members)
        ? teamPayload.members
        : currentTeam.members,
    },
  };
};

export const isArchivedTeamData = (team) =>
  Boolean(team?.archived_at || team?.archivedAt || team?.status === "inactive");

export const getConversationUpdatedAt = (conversation) => {
  const timestamp =
    conversation?.updatedAt ??
    conversation?.updated_at ??
    conversation?.createdAt ??
    conversation?.created_at ??
    conversation?.lastMessage?.createdAt ??
    conversation?.lastMessage?.created_at ??
    conversation?.team?.updatedAt ??
    conversation?.team?.updated_at ??
    null;

  if (!timestamp) return null;
  const parsedDate = normalizeTimestampToDate(timestamp);
  return parsedDate;
};

export const isDirectConversationForPartner = (conversation, partnerId) =>
  conversation?.type === "direct" &&
  String(getConversationPartnerId(conversation)) === String(partnerId);

// ---- Message de-duplication (focus: ownership/system duplicates) ----
export const toMinuteBucket = (isoOrDate) => {
  try {
    const d = isoOrDate ? normalizeTimestampToDate(isoOrDate) : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  } catch {
    return "";
  }
};

export const buildMessageDedupeKey = (msg) => {
  const content = (msg?.content || "").trim();
  const minute = toMinuteBucket(msg?.createdAt);
  const senderId = msg?.senderId ?? "";

  // OWNERSHIP_TEAM (legacy emoji optional)
  let m = content.match(/^(?:👑\s*)?OWNERSHIP_TEAM:\s*(.+?)\s*\|\s*(.+)\s*$/);
  if (m) return `ownership_team|${m[1].trim()}|${m[2].trim()}|${minute}`;

  // OWNERSHIP_TRANSFERRED (legacy emoji optional)
  m = content.match(
    /^(?:👑\s*)?OWNERSHIP_TRANSFERRED:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)\s*$/,
  );
  if (m)
    return `ownership_transferred|${m[1].trim()}|${m[2].trim()}|${m[3].trim()}|${minute}`;

  // Plain team chat sentence variant
  m = content.match(
    /^(.+?)\s+transferred\s+(?:team\s+)?ownership\s+to\s+(.+?)\.?$/i,
  );
  if (m)
    return `ownership_team_plain|${m[1].trim()}|${m[2].trim()}|${minute}`;

  // Plain DM sentence variant
  m = content.match(
    /^(.+?)\s+transferred\s+ownership\s+of\s+"(.+?)"\s+to\s+you\.\s*Congratulations!?\.?$/i,
  );
  if (m) return `ownership_dm_plain|${m[1].trim()}|${m[2].trim()}|${minute}`;

  // Fallback: exact duplicates per minute
  return `generic|${senderId}|${content}|${minute}`;
};

export const dedupeMessages = (list) => {
  const seen = new Set();
  const out = [];
  for (const msg of list || []) {
    const key = buildMessageDedupeKey(msg);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(msg);
  }
  return out;
};
