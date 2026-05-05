const asIdString = (value) =>
  value === null || value === undefined ? null : String(value);

export const getMessageSenderId = (message) =>
  message?.senderId ?? message?.sender_id ?? message?.sender?.id ?? null;

export const getMessageType = (message) => {
  if (message?.type) return message.type;
  return message?.teamId || message?.team_id ? "team" : "direct";
};

export const getMessageConversationTarget = (message, viewerId = null) => {
  const type = getMessageType(message);
  const viewerIdString = asIdString(viewerId);

  if (type === "team") {
    return {
      conversationId:
        message?.teamId ??
        message?.team_id ??
        message?.conversationId ??
        message?.conversation_id ??
        null,
      type: "team",
    };
  }

  const senderId = getMessageSenderId(message);
  const conversationId = message?.conversationId ?? message?.conversation_id;
  const receiverId =
    message?.receiverId ??
    message?.receiver_id ??
    message?.recipientId ??
    message?.recipient_id;

  const candidates = [senderId, conversationId, receiverId].filter(
    (id) => id !== null && id !== undefined,
  );
  const partnerId =
    candidates.find((id) => viewerIdString && asIdString(id) !== viewerIdString) ??
    conversationId ??
    senderId ??
    receiverId ??
    null;

  return {
    conversationId: partnerId,
    type: "direct",
  };
};

export const isOwnMessage = (message, viewerId) => {
  const senderId = getMessageSenderId(message);
  return (
    senderId !== null &&
    senderId !== undefined &&
    viewerId !== null &&
    viewerId !== undefined &&
    asIdString(senderId) === asIdString(viewerId)
  );
};

export const isMessageForCurrentChatPath = (
  message,
  pathname,
  search = "",
  viewerId = null,
) => {
  if (!pathname?.startsWith("/chat/")) return false;

  const currentConversationId = pathname.split("/chat/")[1]?.split("/")[0];
  if (!currentConversationId) return false;

  const target = getMessageConversationTarget(message, viewerId);
  const currentType = new URLSearchParams(search).get("type") || "direct";

  if (target.type !== currentType) return false;

  if (target.type === "team") {
    return asIdString(target.conversationId) === currentConversationId;
  }

  const possibleDirectIds = [
    target.conversationId,
    message?.conversationId,
    message?.conversation_id,
    getMessageSenderId(message),
    message?.receiverId,
    message?.receiver_id,
    message?.recipientId,
    message?.recipient_id,
  ]
    .map(asIdString)
    .filter(Boolean);

  return possibleDirectIds.includes(currentConversationId);
};

export const getMessagePreviewText = (message) => {
  const content = message?.content?.trim();
  if (content) return content;
  if (message?.imageUrl || message?.image_url) return "Sent an image";
  if (message?.fileUrl || message?.file_url) return "Sent a file";
  return "New message";
};
