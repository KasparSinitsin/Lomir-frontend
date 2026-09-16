import { parseSystemMessage } from "../utils/messageSystemParser";
import { describeEvent } from "../utils/describeEvent";
import { getEventSentenceText } from "../utils/eventSentences";
import { formatDisplayName } from "../utils/nameFormatters";
import { normalizeTimestampToDate } from "../utils/dateHelpers";
import { messageService } from "../services/messageService";
import {
  getConversationPartnerId,
  isDirectConversationForPartner,
} from "./chatHelpers";

// Chat search, snippet, highlight and conversation-preview helpers, extracted
// verbatim from Chat.jsx. Pure functions plus one async preview hydrator that
// runs inside the conversations queryFn; no component state. See also
// utils/chatHelpers.js (entity/payload/team-member helpers).

export const CHAT_SEARCH_PAGE_SIZE = 100;
export const CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION = 500;

export const dedupeConversations = (list) =>
  (list || []).filter((conv, index, self) => {
    if (conv.type === "direct") {
      return (
        index ===
        self.findIndex((candidate) =>
          isDirectConversationForPartner(
            candidate,
            getConversationPartnerId(conv),
          ),
        )
      );
    }

    return index === self.findIndex((candidate) => candidate.id === conv.id);
  });

export const getConversationSearchKey = (conversation) =>
  `${conversation?.type || "direct"}:${conversation?.id}`;

export const normalizeChatSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const countChatSearchMatches = (value, normalizedQuery) => {
  if (!value || !normalizedQuery) return 0;

  let count = 0;
  let startIndex = 0;

  while (startIndex < value.length) {
    const matchIndex = value.indexOf(normalizedQuery, startIndex);
    if (matchIndex === -1) break;

    count += 1;
    startIndex = matchIndex + normalizedQuery.length;
  }

  return count;
};

const addSearchPart = (parts, value) => {
  if (value == null) return;

  if (Array.isArray(value)) {
    value.forEach((item) => addSearchPart(parts, item));
    return;
  }

  if (typeof value === "object") return;

  const text = String(value).trim();
  if (text) parts.push(text);
};

const addUserSearchParts = (parts, user) => {
  if (!user) return;
  const hasUserText =
    user.name ||
    user.username ||
    user.userName ||
    user.firstName ||
    user.first_name ||
    user.lastName ||
    user.last_name;

  if (!hasUserText) return;

  addSearchPart(parts, [
    user.name,
    user.username,
    user.userName,
    user.firstName,
    user.first_name,
    user.lastName,
    user.last_name,
    formatDisplayName(user),
  ]);
};

/**
 * The sentence a translated event shows THIS reader, in the active language —
 * the transcript/quote form (D3). `null` for everything that is not a
 * translated event, which keeps its old index.
 *
 * ⚠️ The stored content is deliberately NOT indexed for these: it is English
 * or a wire format ("ROLE_CLOSED: 12:Chor | …"), so a German reader searching
 * „geschlossen" found nothing and a search for "closed" found a German banner.
 *
 * ⚠️ Only the long form, not the list form as well: both usually share the
 * verb, so every event counted twice ("34 Treffer" for 17 banners) in the
 * number that orders the conversation list. Decided 2026-09-16; the cost is
 * a word that only the short form uses ("Rolle wieder geöffnet").
 */
const getTranslatedEventSearchParts = (message, { viewer = null, t = null } = {}) => {
  const event = describeEvent(message?.content ?? null, viewer);
  const full = getEventSentenceText(t, event, "full");
  if (full == null) return null;
  // What the member typed is shown beside the banner, so it stays searchable.
  return event.personalMessage ? [full, event.personalMessage] : [full];
};

/**
 * @param {object} message
 * @param {{ viewer?: object|null, t?: Function|null }} [options]
 *   the reader and the active `t` — required for the translated event families
 */
export const buildMessageSearchText = (message, options = {}) => {
  const parts = [];
  const eventParts = getTranslatedEventSearchParts(message, options);
  const parsedSystemMessage = eventParts ? null : parseSystemMessage(message?.content);
  const systemMessageText = buildSystemMessageSearchSnippet(parsedSystemMessage);

  addSearchPart(parts, [
    ...(eventParts ?? [message?.content, systemMessageText]),
    message?.fileName,
    message?.file_name,
    message?.senderUsername,
    message?.sender_username,
  ]);
  addUserSearchParts(parts, message?.sender);
  addUserSearchParts(parts, {
    firstName: message?.senderFirstName,
    first_name: message?.sender_first_name,
    lastName: message?.senderLastName,
    last_name: message?.sender_last_name,
    username: message?.senderUsername || message?.sender_username,
  });

  return normalizeChatSearchText(parts.join(" "));
};

/**
 * ⚠️ A name can be null — `parseSystemMessage` nulls the "Someone"/"Unknown"
 * placeholders — and an unguarded `${name}` put the literal string "null" into
 * the search index. The index drops the name instead; `buildSystemMessageSearchSnippet`
 * collapses the gap it leaves.
 */
const searchName = (name) => name || "";

const buildSystemMessageSearchSnippet = (parsedMessage) =>
  buildSystemMessageSearchSnippetText(parsedMessage).replace(/\s+/g, " ").trim();

const buildSystemMessageSearchSnippetText = (parsedMessage) => {
  if (!parsedMessage) return "";

  switch (parsedMessage.type) {
    case "application_approved_dm":
      return [
        `You approved ${searchName(parsedMessage.applicantName)}'s application for ${parsedMessage.teamName}`,
        `Your application to ${parsedMessage.teamName} was approved by ${searchName(parsedMessage.approverName)}`,
        parsedMessage.hasPersonalMessage ? "who added this message" : "Welcome to the team",
      ].join(". ");
    case "application_approved":
      return [
        `Your application was approved by ${searchName(parsedMessage.approverName)}. Welcome to the team`,
        `${searchName(parsedMessage.applicantName)} has applied successfully and was added by ${searchName(parsedMessage.approverName)}. Say hello to them`,
      ].join(". ");
    case "application_declined":
      return [
        `You declined ${searchName(parsedMessage.applicantName)}'s application for ${parsedMessage.teamName}`,
        `Your application to ${parsedMessage.teamName} was declined by ${searchName(parsedMessage.approverName)}`,
        parsedMessage.hasPersonalMessage
          ? "who added this message"
          : "Want to reach out to them in this chat",
      ].join(". ");
    case "application_response":
      return `Response to your application for ${parsedMessage.teamName}. Your decline response to ${searchName(parsedMessage.applicantName)}'s application for ${parsedMessage.teamName}. ${parsedMessage.personalMessage || ""}`;
    case "invitation_declined":
      return [
        `You declined ${searchName(parsedMessage.inviterName)}'s invitation for ${parsedMessage.teamName}`,
        `Your invitation for ${parsedMessage.teamName} was declined by ${searchName(parsedMessage.inviteeName)}`,
        parsedMessage.hasPersonalMessage
          ? "who added this message"
          : "Want to reach out to them in this chat",
      ].join(". ");
    case "invitation_response":
      return `Response to your invitation for ${parsedMessage.teamName}. ${parsedMessage.personalMessage || ""}`;
    case "invitation_cancelled":
      return `${searchName(parsedMessage.cancellerName)} cancelled your invitation to join ${parsedMessage.teamName}. You cancelled your invitation for ${searchName(parsedMessage.inviteeName)} to join ${parsedMessage.teamName}.`;
    case "application_cancelled":
      return `${searchName(parsedMessage.applicantName)} cancelled their application for ${parsedMessage.teamName}. You cancelled your application for ${parsedMessage.teamName}.`;
    default:
      return "";
  }
};

const buildMessageSearchSnippet = (message, options = {}) => {
  const eventParts = getTranslatedEventSearchParts(message, options);
  const systemMessageText =
    eventParts?.[0] ??
    buildSystemMessageSearchSnippet(parseSystemMessage(message?.content));
  const senderName = [
    message?.senderFirstName || message?.sender_first_name,
    message?.senderLastName || message?.sender_last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  const sender =
    senderName ||
    message?.senderUsername ||
    message?.sender_username ||
    message?.sender?.username ||
    "";
  const body =
    systemMessageText ||
    message?.content ||
    message?.fileName ||
    message?.file_name ||
    (message?.imageUrl || message?.image_url ? "Image" : "") ||
    (message?.fileUrl || message?.file_url ? "File" : "");

  return [sender, body].filter(Boolean).join(": ");
};

const getMessageSearchId = (message) =>
  message?.id || message?.messageId || message?.message_id || null;

const NOTIFICATION_EVENT_MESSAGE_MARKERS = {
  application_approved: ["APPLICATION_APPROVED"],
  application_rejected: ["APPLICATION_DECLINED"],
  application_cancelled: ["APPLICATION_CANCELLED"],
  role_application_cancelled: ["APPLICATION_CANCELLED"],
  invitation_declined: ["INVITATION_DECLINED"],
  invitation_cancelled: ["INVITATION_CANCELLED"],
  member_left: ["MEMBER_LEFT", "MEMBER_REMOVED_PUBLIC"],
  member_removed: ["MEMBER_REMOVED"],
  ownership_transferred: ["OWNERSHIP_TRANSFERRED"],
  role_changed: ["ROLE_CHANGED"],
  role_created: ["ROLE_CREATED"],
  role_updated: ["ROLE_UPDATED"],
  role_deleted: ["ROLE_DELETED"],
  role_closed: ["ROLE_CLOSED"],
  role_filled: [
    "ROLE_FILLED",
    "ROLE_APPLICATION_FILLED",
    "ROLE_INVITATION_FILLED",
  ],
  role_application_deferred_invite: ["ROLE_APPLICATION_DEFERRED_INVITE"],
  role_reopened: ["ROLE_REOPENED"],
  role_reopened_admin: ["ROLE_REOPENED_ADMIN"],
  team_deleted: ["TEAM_DELETED"],
};

export const getNotificationEventHighlightIds = (messages, eventTarget) => {
  const type = String(eventTarget?.type || "").toLowerCase();
  if (!type) return [];

  const markers = NOTIFICATION_EVENT_MESSAGE_MARKERS[type] || [];
  const referenceId = eventTarget.referenceId
    ? String(eventTarget.referenceId)
    : "";
  const actorId = eventTarget.actorId ? String(eventTarget.actorId) : "";
  const matchingMessages = (messages || []).filter((message) => {
    const content = String(message?.content || "");
    const normalizedContent = content.toUpperCase();
    const markerMatches =
      markers.length === 0 ||
      markers.some((marker) => normalizedContent.includes(marker));

    if (!markerMatches) return false;

    const referenceMatches =
      !referenceId ||
      content.includes(`| ${referenceId}:`) ||
      content.includes(`:${referenceId}:`) ||
      String(message?.id) === referenceId;
    const actorMatches =
      !actorId ||
      String(message?.senderId ?? message?.sender_id ?? "") === actorId ||
      content.includes(`${actorId}:`);

    return referenceMatches && actorMatches;
  });

  const target = matchingMessages[matchingMessages.length - 1];
  return target?.id ? [target.id] : [];
};

export const buildConversationLastMessagePreview = (message) => {
  if (message?.content) return message.content;

  const fileName = message?.fileName || message?.file_name;
  const fileUrl = message?.fileUrl || message?.file_url;
  const imageUrl = message?.imageUrl || message?.image_url;

  if (imageUrl) {
    return fileName ? `Image "${fileName}" sent` : "Image sent";
  }

  if (fileName || fileUrl) {
    const ext = fileName?.split(".").pop()?.toLowerCase();
    const label = ["xls", "xlsx", "csv"].includes(ext) ? "Spreadsheet" : "File";
    return `${label} "${fileName || "attachment"}" sent`;
  }

  return message?.content ?? "";
};

const hasConversationPreview = (conversation) => {
  const lastMessage = conversation?.lastMessage ?? conversation?.last_message;

  if (typeof lastMessage === "string") {
    return lastMessage.trim().length > 0;
  }

  if (lastMessage && typeof lastMessage === "object") {
    return Boolean(
      lastMessage.content ||
        lastMessage.fileName ||
        lastMessage.file_name ||
        lastMessage.fileUrl ||
        lastMessage.file_url ||
        lastMessage.imageUrl ||
        lastMessage.image_url,
    );
  }

  return Boolean(
    conversation?.lastMessageFileName ||
      conversation?.last_message_file_name ||
      conversation?.lastMessageFileUrl ||
      conversation?.last_message_file_url ||
      conversation?.lastMessageImageUrl ||
      conversation?.last_message_image_url,
  );
};

const getConversationType = (conversation) => conversation?.type || "direct";

const shouldKeepHydratedConversation = (conversation, previewByKey) => {
  const type = getConversationType(conversation);

  if (conversation?.isVirtual || type !== "direct") return true;
  if (hasConversationPreview(conversation)) return true;

  return previewByKey.has(`${type}:${String(conversation.id)}`);
};

// Fill in last-message previews for conversations the list endpoint returned
// without one, by fetching the latest message per conversation. Pure: returns a
// new list with previews merged in, and drops persistent empty direct chats so
// only DMs with at least one message stay in the conversation list.
export const hydrateConversationPreviews = async (conversationList) => {
  const conversationsToHydrate = (conversationList || []).filter(
    (conversation) =>
      !conversation.isVirtual && !hasConversationPreview(conversation),
  );

  if (conversationsToHydrate.length === 0) return conversationList || [];

  const hydratedPreviews = await Promise.allSettled(
    conversationsToHydrate.map(async (conversation) => {
      const type = conversation.type || "direct";
      const response = await messageService.getMessages(conversation.id, type, {
        limit: 1,
      });
      const latestMessage = response?.data?.[response.data.length - 1];
      const preview = buildConversationLastMessagePreview(latestMessage);

      if (!latestMessage || !preview) return null;

      return {
        id: conversation.id,
        type,
        preview,
        updatedAt:
          latestMessage.createdAt ||
          latestMessage.created_at ||
          conversation.updatedAt,
      };
    }),
  );

  const previewByKey = new Map();

  hydratedPreviews.forEach((result) => {
    if (result.status !== "fulfilled" || !result.value) return;
    previewByKey.set(
      `${result.value.type}:${String(result.value.id)}`,
      result.value,
    );
  });

  return (conversationList || [])
    .filter((conversation) =>
      shouldKeepHydratedConversation(conversation, previewByKey),
    )
    .map((conversation) => {
      const type = getConversationType(conversation);
      const hydratedPreview = previewByKey.get(
        `${type}:${String(conversation.id)}`,
      );

      if (!hydratedPreview || hasConversationPreview(conversation)) {
        return conversation;
      }

      return {
        ...conversation,
        lastMessage: hydratedPreview.preview,
        updatedAt: hydratedPreview.updatedAt || conversation.updatedAt,
      };
    });
};

const getMessageSearchTimestamp = (message) => {
  const timestamp =
    message?.createdAt ||
    message?.created_at ||
    message?.sentAt ||
    message?.sent_at ||
    message?.updatedAt ||
    message?.updated_at;
  const parsedDate = normalizeTimestampToDate(timestamp);

  return parsedDate?.getTime() ?? 0;
};

const getMessageSearchTimestampValue = (message) =>
  message?.createdAt ||
  message?.created_at ||
  message?.sentAt ||
  message?.sent_at ||
  message?.updatedAt ||
  message?.updated_at ||
  null;

export const buildMessageSearchSnippets = (messages, options = {}) =>
  (messages || [])
    .map((message, index) => ({
      message,
      index,
      timestamp: getMessageSearchTimestamp(message),
    }))
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .map(({ message }) => ({
      id: getMessageSearchId(message),
      text: buildMessageSearchSnippet(message, options),
      // Raw content is kept alongside the humanised search text so the
      // conversation list can render a matched system/event message with its
      // canonical icon + colour styling (via getEventPreview), not just plain text.
      content: message?.content ?? "",
      timestamp: getMessageSearchTimestampValue(message),
    }))
    .filter((snippet) => snippet.text);

export const buildLatestMatchPreview = (snippet, normalizedQuery) => {
  const text = String(snippet || "").trim();
  if (!text || !normalizedQuery) return text;

  const normalizedText = normalizeChatSearchText(text);
  const matchIndex = normalizedText.indexOf(normalizedQuery);
  if (matchIndex === -1 || text.length <= 120) return text;

  const contextBefore = 36;
  const contextAfter = 72;
  const start = Math.max(0, matchIndex - contextBefore);
  const end = Math.min(
    text.length,
    matchIndex + normalizedQuery.length + contextAfter,
  );
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
};

// ⚠️ Not `.map(buildMessageSearchText)`: map would pass the index as `options`.
export const buildMessagesSearchText = (messages, options = {}) =>
  normalizeChatSearchText(
    (messages || [])
      .map((message) => buildMessageSearchText(message, options))
      .join(" "),
  );

export const buildConversationSearchText = (conversation) => {
  const parts = [];
  const isTeam = conversation?.type === "team";

  addSearchPart(parts, [
    conversation?.type,
    conversation?.lastMessage,
    conversation?.last_message,
    conversation?.lastMessage?.content,
    conversation?.last_message?.content,
  ]);

  if (isTeam) {
    const team = conversation?.team || {};
    addSearchPart(parts, [
      "team",
      "team chat",
      team.name,
      team.teamName,
      team.team_name,
      team.description,
    ]);

    (team.members || conversation?.members || []).forEach((member) => {
      addUserSearchParts(parts, member?.user || member);
      addSearchPart(parts, [member?.role, member?.roleName, member?.role_name]);
    });
  } else {
    addSearchPart(parts, ["direct", "dm", "direct message"]);
    addUserSearchParts(parts, conversation?.partner || conversation?.partnerUser);
  }

  return normalizeChatSearchText(parts.join(" "));
};
