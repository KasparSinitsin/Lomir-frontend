import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LogOut,
  ChevronRight,
  ChevronLeft,
  Users,
  User,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";
import ConversationList from "../components/chat/ConversationList";
import MessageDisplay, { parseSystemMessage } from "../components/chat/MessageDisplay";
import MessageInput from "../components/chat/MessageInput";
import { useAuth } from "../contexts/AuthContext";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";
import { userService } from "../services/userService";
import { teamService } from "../services/teamService";
import ScreenAlert from "../components/common/ScreenAlert";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Tooltip from "../components/common/Tooltip";
import { CountBadge } from "../components/common/NotificationBadge";
import { uploadToImageKit } from "../config/imagekit";
import UserAvatar from "../components/users/UserAvatar";
import DemoAvatarOverlay from "../components/users/DemoAvatarOverlay";
import TeamDetailsModal from "../components/teams/TeamDetailsModal";
import UserDetailsModal from "../components/users/UserDetailsModal";
import { getTeamInitials, isSyntheticTeam } from "../utils/userHelpers";
import { formatDisplayName } from "../utils/nameFormatters";
import {
  formatRelativeChatTimestamp,
  normalizeTimestampToDate,
} from "../utils/dateHelpers";
import { getTeamAvatarUrl } from "../utils/chatEntityResolvers";
import { getMessageConversationTarget } from "../utils/messageNotificationUtils";

const getConversationPartnerId = (conversation) =>
  conversation?.partner?.id ??
  conversation?.partnerUser?.id ??
  conversation?.partnerId ??
  conversation?.partner_id ??
  null;

const resolveTypingUserId = (payload) =>
  payload?.userId ??
  payload?.user_id ??
  payload?.senderId ??
  payload?.sender_id ??
  payload?.id ??
  null;

const resolveTypingDisplayName = (payload) => {
  const first = payload?.firstName || payload?.first_name || "";
  const last = payload?.lastName || payload?.last_name || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || payload?.username || payload?.userName || payload?.name || null;
};

const resolveConversationUser = (conversation, userId) => {
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
        memberUser?.id ??
        memberUser?.userId ??
        memberUser?.user_id ??
        member?.id ??
        member?.userId ??
        member?.user_id ??
        null;
      return String(memberId) === String(userId);
    });

    if (matchedMember) {
      return matchedMember.user || matchedMember;
    }
  }

  return null;
};

const getConversationUpdatedAt = (conversation) => {
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

const isDirectConversationForPartner = (conversation, partnerId) =>
  conversation?.type === "direct" &&
  String(getConversationPartnerId(conversation)) === String(partnerId);

const CHAT_SEARCH_PAGE_SIZE = 100;
const CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION = 500;

const dedupeConversations = (list) =>
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

const getConversationSearchKey = (conversation) =>
  `${conversation?.type || "direct"}:${conversation?.id}`;

const normalizeChatSearchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const countChatSearchMatches = (value, normalizedQuery) => {
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

const buildMessageSearchText = (message) => {
  const parts = [];
  const parsedSystemMessage = parseSystemMessage(message?.content);
  const systemMessageText = buildSystemMessageSearchSnippet(parsedSystemMessage);

  addSearchPart(parts, [
    message?.content,
    systemMessageText,
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

const buildSystemMessageSearchSnippet = (parsedMessage) => {
  if (!parsedMessage) return "";

  switch (parsedMessage.type) {
    case "application_approved_dm":
      return [
        `You approved ${parsedMessage.applicantName}'s application for ${parsedMessage.teamName}`,
        `Your application to ${parsedMessage.teamName} was approved by ${parsedMessage.approverName}`,
        parsedMessage.hasPersonalMessage ? "who added this message" : "Welcome to the team",
      ].join(". ");
    case "application_approved":
      return [
        `Your application was approved by ${parsedMessage.approverName}. Welcome to the team`,
        `${parsedMessage.applicantName} has applied successfully and was added by ${parsedMessage.approverName}. Say hello to them`,
      ].join(". ");
    case "application_declined":
      return [
        `You declined ${parsedMessage.applicantName}'s application for ${parsedMessage.teamName}`,
        `Your application to ${parsedMessage.teamName} was declined by ${parsedMessage.approverName}`,
        parsedMessage.hasPersonalMessage
          ? "who added this message"
          : "Want to reach out to them in this chat",
      ].join(". ");
    case "application_response":
      return `Response to your application for ${parsedMessage.teamName}. Your decline response to ${parsedMessage.applicantName}'s application for ${parsedMessage.teamName}. ${parsedMessage.personalMessage || ""}`;
    case "invitation_declined":
      return [
        `You declined ${parsedMessage.inviterName}'s invitation for ${parsedMessage.teamName}`,
        `Your invitation for ${parsedMessage.teamName} was declined by ${parsedMessage.inviteeName}`,
        parsedMessage.hasPersonalMessage
          ? "who added this message"
          : "Want to reach out to them in this chat",
      ].join(". ");
    case "invitation_response":
      return `Response to your invitation for ${parsedMessage.teamName}. ${parsedMessage.personalMessage || ""}`;
    case "team_join":
      return `${parsedMessage.userName} joined the team. You joined the team. Welcome aboard. ${parsedMessage.personalMessage || ""}`;
    case "team_leave":
      return `${parsedMessage.userName} has left the team. You have left the team.`;
    case "member_removed_public":
      return `${parsedMessage.userName} has been removed from the team. You removed ${parsedMessage.userName} from the team.`;
    case "invitation_cancelled":
      return `${parsedMessage.cancellerName} cancelled your invitation to join ${parsedMessage.teamName}. You cancelled your invitation for ${parsedMessage.inviteeName} to join ${parsedMessage.teamName}.`;
    case "application_cancelled":
      return `${parsedMessage.applicantName} cancelled their application for ${parsedMessage.teamName}. You cancelled your application for ${parsedMessage.teamName}.`;
    case "member_removed":
      return `You were removed from ${parsedMessage.teamName} by ${parsedMessage.removerName}. You removed ${parsedMessage.memberName} from ${parsedMessage.teamName}.`;
    case "role_changed":
      return `Your role in ${parsedMessage.teamName} was changed to ${parsedMessage.newRole} by ${parsedMessage.changerName}. You changed ${parsedMessage.memberName}'s role to ${parsedMessage.newRole} in ${parsedMessage.teamName}.`;
    case "ownership_team":
      return `${parsedMessage.prevOwnerName} transferred ownership to ${parsedMessage.newOwnerName}`;
    case "ownership_transferred":
      return `${parsedMessage.prevOwnerName} transferred ownership of ${parsedMessage.teamName} to you. You transferred team ownership of ${parsedMessage.teamName} to ${parsedMessage.newOwnerName}. Congratulations`;
    case "team_deleted":
      return `${parsedMessage.ownerName} has initiated the deletion of the team ${parsedMessage.teamName}. You initiated the deletion of the team ${parsedMessage.teamName}. The team is archived and inactive now.`;
    default:
      return "";
  }
};

const buildMessageSearchSnippet = (message) => {
  const parsedSystemMessage = parseSystemMessage(message?.content);
  const systemMessageText = buildSystemMessageSearchSnippet(parsedSystemMessage);
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

const buildMessageSearchSnippets = (messages) =>
  (messages || [])
    .map((message, index) => ({
      message,
      index,
      timestamp: getMessageSearchTimestamp(message),
    }))
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .map(({ message }) => ({
      id: getMessageSearchId(message),
      text: buildMessageSearchSnippet(message),
      timestamp: getMessageSearchTimestampValue(message),
    }))
    .filter((snippet) => snippet.text);

const buildLatestMatchPreview = (snippet, normalizedQuery) => {
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

const buildMessagesSearchText = (messages) =>
  normalizeChatSearchText((messages || []).map(buildMessageSearchText).join(" "));

const buildConversationSearchText = (conversation) => {
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

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [users, setUsers] = useState({});
  const [highlightMessageIds, setHighlightMessageIds] = useState([]);
  const [isTeamArchived, setIsTeamArchived] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [teamMembersRefreshSignal, setTeamMembersRefreshSignal] =
    useState(null);
  const [showChatView, setShowChatView] = useState(true); // Toggle between list and chat on mobile
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeamData, setSelectedTeamData] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pendingChatAction, setPendingChatAction] = useState(null);
  const [pendingChatActionLoading, setPendingChatActionLoading] =
    useState(false);
  const [isActiveConversationVisible, setIsActiveConversationVisible] =
    useState(true);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatMessageSearchIndex, setChatMessageSearchIndex] = useState({});
  const [chatMessageSearchSnippets, setChatMessageSearchSnippets] = useState({});
  const [searchingChatMessages, setSearchingChatMessages] = useState(false);
  const [searchNoResultsToastQuery, setSearchNoResultsToastQuery] = useState(null);
  const searchNoResultsQueryRef = useRef(null);
  const [searchChatVisible, setSearchChatVisible] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pendingScrollAdjustmentRef = useRef(null);
  const conversationsRef = useRef([]);
  const activeConversationRef = useRef(null);
  const chatSearchLoadingKeysRef = useRef(new Set());
  const pendingChatSearchTargetRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ---- Message de-duplication (focus: ownership/system duplicates) ----
  const toMinuteBucket = (isoOrDate) => {
    try {
      const d = isoOrDate ? normalizeTimestampToDate(isoOrDate) : null;
      if (!d || Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    } catch {
      return "";
    }
  };

  const buildMessageDedupeKey = (msg) => {
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

  const dedupeMessages = (list) => {
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

  // Conversation type (used for read-only rendering)
  const conversationType =
    activeConversation?.type ||
    new URLSearchParams(window.location.search).get("type") ||
    "direct";

  const conversationPartner =
    conversationType === "direct"
      ? activeConversation?.partner || activeConversation?.partnerUser || null
      : null;

  const teamData =
    conversationType === "team" ? activeConversation?.team || null : null;

  const teamMembers =
    conversationType === "team" ? activeConversation?.team?.members || [] : [];

  const conversationUpdatedAt =
    getConversationUpdatedAt(activeConversation) ||
    getConversationUpdatedAt(messages?.[messages.length - 1] || messages?.[0] || null);
  const showCompactConversationHeader =
    Boolean(conversationId) &&
    !isActiveConversationVisible;
  const showEmptyConversationState =
    !loading && conversations.length === 0 && !conversationId;
  const normalizedChatSearchQuery = useMemo(
    () => normalizeChatSearchText(chatSearchQuery.trim()),
    [chatSearchQuery],
  );
  const isChatSearchActive = normalizedChatSearchQuery.length > 0;

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const fetchConversationSearchText = useCallback(async (conversation) => {
    const conversationType = conversation?.type || "direct";
    const allMessages = [];
    let before;
    let hasMore = true;

    while (
      hasMore &&
      allMessages.length < CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION
    ) {
      const remaining =
        CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION - allMessages.length;
      const response = await messageService.getMessages(
        conversation.id,
        conversationType,
        {
          before,
          limit: Math.min(CHAT_SEARCH_PAGE_SIZE, remaining),
        },
      );
      const pageMessages = Array.isArray(response?.data) ? response.data : [];

      if (pageMessages.length === 0) {
        break;
      }

      allMessages.push(...pageMessages);
      hasMore = Boolean(response?.hasMore);
      before = pageMessages[0]?.id;

      if (!before) {
        break;
      }
    }

    return {
      text: buildMessagesSearchText(allMessages),
      snippets: buildMessageSearchSnippets(allMessages),
    };
  }, []);

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const key = `${conversationType}:${conversationId}`;
    const activeMessagesSearchText = buildMessagesSearchText(messages);

    setChatMessageSearchIndex((prev) => ({
      ...prev,
      [key]: normalizeChatSearchText(
        `${prev[key] || ""} ${activeMessagesSearchText}`,
      ),
    }));
    setChatMessageSearchSnippets((prev) => ({
      ...prev,
      [key]: buildMessageSearchSnippets(messages),
    }));
  }, [conversationId, conversationType, messages]);

  useEffect(() => {
    if (!isAuthenticated || !isChatSearchActive || conversations.length === 0) {
      setSearchingChatMessages(false);
      return;
    }

    const missingConversations = conversations.filter((conversation) => {
      const key = getConversationSearchKey(conversation);
      return (
        !chatMessageSearchIndex[key] &&
        !chatSearchLoadingKeysRef.current.has(key)
      );
    });

    if (missingConversations.length === 0) {
      setSearchingChatMessages(chatSearchLoadingKeysRef.current.size > 0);
      return;
    }

    missingConversations.forEach((conversation) => {
      chatSearchLoadingKeysRef.current.add(getConversationSearchKey(conversation));
    });
    setSearchingChatMessages(true);

    Promise.allSettled(
      missingConversations.map(async (conversation) => ({
        key: getConversationSearchKey(conversation),
        result: await fetchConversationSearchText(conversation),
      })),
    ).then((results) => {
      setChatMessageSearchIndex((prev) => {
        const next = { ...prev };

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[result.value.key] = result.value.result.text || " ";
            return;
          }

          next[getConversationSearchKey(missingConversations[index])] = " ";
        });

        return next;
      });
      setChatMessageSearchSnippets((prev) => {
        const next = { ...prev };

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[result.value.key] = result.value.result.snippets || [];
            return;
          }

          next[getConversationSearchKey(missingConversations[index])] = [];
        });

        return next;
      });

      results.forEach((result, index) => {
        const key =
          result.status === "fulfilled"
            ? result.value.key
            : getConversationSearchKey(missingConversations[index]);
        chatSearchLoadingKeysRef.current.delete(key);
      });
      setSearchingChatMessages(chatSearchLoadingKeysRef.current.size > 0);
    });
  }, [
    chatMessageSearchIndex,
    conversations,
    fetchConversationSearchText,
    isAuthenticated,
    isChatSearchActive,
  ]);

  const filteredConversations = useMemo(() => {
    if (!isChatSearchActive) return conversations;

    return conversations
      .map((conversation) => {
        const key = getConversationSearchKey(conversation);
        const conversationSearchText = buildConversationSearchText(conversation);
        const messageSearchText = chatMessageSearchIndex[key] || "";
        const searchMatchCount =
          countChatSearchMatches(
            conversationSearchText,
            normalizedChatSearchQuery,
          ) +
          countChatSearchMatches(messageSearchText, normalizedChatSearchQuery);
        const matchedMessageSnippet = [
          ...(chatMessageSearchSnippets[key] || []),
        ]
          .reverse()
          .find((snippet) =>
            normalizeChatSearchText(snippet.text).includes(
              normalizedChatSearchQuery,
            ),
          );
        const nextConversation = matchedMessageSnippet
          ? {
              ...conversation,
              searchMatchPreview: buildLatestMatchPreview(
                matchedMessageSnippet.text,
                normalizedChatSearchQuery,
              ),
              searchMatchMessageId: matchedMessageSnippet.id,
              searchMatchCreatedAt: matchedMessageSnippet.timestamp,
            }
          : conversation;

        return {
          conversation: nextConversation,
          searchMatchCount,
        };
      })
      .filter(({ searchMatchCount }) => searchMatchCount > 0)
      .sort((a, b) => {
        if (b.searchMatchCount !== a.searchMatchCount) {
          return b.searchMatchCount - a.searchMatchCount;
        }

        const aDate = getConversationUpdatedAt(a.conversation)?.getTime() ?? 0;
        const bDate = getConversationUpdatedAt(b.conversation)?.getTime() ?? 0;
        return bDate - aDate;
      })
      .map(({ conversation, searchMatchCount }) => ({ ...conversation, searchMatchCount }));
  }, [
    chatMessageSearchIndex,
    chatMessageSearchSnippets,
    conversations,
    isChatSearchActive,
    normalizedChatSearchQuery,
  ]);

  useEffect(() => {
    if (isChatSearchActive && !searchingChatMessages && filteredConversations.length === 0) {
      const query = chatSearchQuery.trim();
      if (searchNoResultsQueryRef.current !== query) {
        searchNoResultsQueryRef.current = query;
        setSearchNoResultsToastQuery(query);
      }
    } else {
      searchNoResultsQueryRef.current = null;
      setSearchNoResultsToastQuery(null);
    }
  }, [isChatSearchActive, searchingChatMessages, filteredConversations.length, chatSearchQuery]);

  useEffect(() => {
    setSearchChatVisible(false);
    setHighlightMessageIds([]);
  }, [chatSearchQuery]);

  useEffect(() => {
    setIsActiveConversationVisible(true);
  }, [conversationId]);

  const handleActiveConversationVisibilityChange = useCallback((isVisible) => {
    setIsActiveConversationVisible((current) =>
      current === isVisible ? current : isVisible,
    );
  }, []);

  const refreshConversationList = useCallback(async () => {
    try {
      const response = await messageService.getConversations();
      setConversations(dedupeConversations(response.data || []));
    } catch (err) {
      console.error("Error refreshing conversations:", err);
    }
  }, []);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await messageService.getConversations();
        let conversationsList = response.data || [];

        // If we have a conversationId from URL but it's not in the conversations list,
        // create a virtual conversation entry
        if (conversationId && conversationsList.length >= 0) {
          const conversationExists = conversationsList.some(
            (conv) => String(conv.id) === String(conversationId),
          );

          if (!conversationExists) {
            const urlParams = new URLSearchParams(window.location.search);
            const type = urlParams.get("type") || "direct";

            if (type === "direct") {
              try {
                // Get the user details for the virtual conversation
                const userResponse =
                  await userService.getUserById(conversationId);

                const userData = userResponse.data;

                // Create a virtual conversation entry
                const virtualConversation = {
                  id: parseInt(conversationId),
                  type: "direct",
                  partner: {
                    id: userData.id,
                    username: userData.username,
                    firstName: userData.firstName || userData.first_name,
                    lastName: userData.lastName || userData.last_name,
                    avatarUrl: userData.avatarUrl || userData.avatar_url,
                    isSynthetic:
                      userData.isSynthetic ?? userData.is_synthetic ?? undefined,
                    is_synthetic:
                      userData.is_synthetic ?? userData.isSynthetic ?? undefined,
                  },
                  lastMessage: "Start your conversation...",
                  updatedAt: new Date().toISOString(),
                  isVirtual: true,
                  unreadCount: 0,
                };

                // Add to the beginning of the conversations list
                conversationsList = [virtualConversation, ...conversationsList];
              } catch (error) {
                console.error("Error creating virtual conversation:", error);
              }
            }
          }
        }

        const deduplicatedList = dedupeConversations(conversationsList);
        setConversations(deduplicatedList);

        // If there are conversations but none is selected, select the first one
        if (deduplicatedList.length > 0 && !conversationId) {
          const firstConversationType = deduplicatedList[0].type || "direct";
          navigate(
            `/chat/${deduplicatedList[0].id}?type=${firstConversationType}`,
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError("Failed to load conversations. Please try again.");
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, conversationId, navigate]);

  // Fetch messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;

      try {
        setLoadingMessages(true);
        setLoadingMore(false);
        setHasMoreMessages(false);

        // ✅ Reset archived state when switching conversations
        setIsTeamArchived(false);

        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type") || "direct";

        let conversationDetails;
        try {
          conversationDetails = await messageService.getConversationById(
            conversationId,
            type,
          );

          // If it's a team conversation, fetch detailed team member information
          if (type === "team" && conversationDetails?.data) {
            try {
              const teamDetails = await teamService.getTeamById(conversationId);

              // ✅ Check if team is archived
              if (
                teamDetails.data?.archived_at ||
                teamDetails.data?.status === "inactive"
              ) {
                setIsTeamArchived(true);
              } else {
                setIsTeamArchived(false);
              }

              if (teamDetails?.data?.members) {
                conversationDetails.data.team = {
                  ...conversationDetails.data.team,
                  avatarUrl:
                    conversationDetails.data.team.avatarUrl ||
                    conversationDetails.data.team.teamavatarUrl ||
                    conversationDetails.data.team.teamavatar_url ||
                    teamDetails.data.avatarUrl ||
                    teamDetails.data.teamavatarUrl ||
                    teamDetails.data.teamavatar_url,
                  isSynthetic:
                    conversationDetails.data.team.isSynthetic ??
                    conversationDetails.data.team.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    undefined,
                  is_synthetic:
                    conversationDetails.data.team.is_synthetic ??
                    conversationDetails.data.team.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    undefined,
                  members: teamDetails.data.members,
                };
              }
            } catch (teamError) {
              console.error("Error fetching team member details:", teamError);
            }
          }

          setActiveConversation(conversationDetails.data);

          // Ensure team conversation appears in conversation list
          if (type === "team" && conversationDetails.data) {
            setConversations((prev) => {
              const existingConversation = prev.find(
                (conv) =>
                  String(conv.id) === String(conversationId) &&
                  conv.type === "team",
              );

              if (!existingConversation) {
                const newTeamConversation = {
                  id: parseInt(conversationId),
                  type: "team",
                  team: {
                    id: conversationDetails.data.team.id,
                    name: conversationDetails.data.team.name,
                    avatarUrl: conversationDetails.data.team.avatarUrl,
                    isSynthetic:
                      conversationDetails.data.team.isSynthetic ??
                      conversationDetails.data.team.is_synthetic ??
                      undefined,
                    is_synthetic:
                      conversationDetails.data.team.is_synthetic ??
                      conversationDetails.data.team.isSynthetic ??
                      undefined,
                  },
                  lastMessage: "Start your team conversation...",
                  updatedAt: new Date().toISOString(),
                  isVirtual: true,
                  unreadCount: 0,
                };

                return [newTeamConversation, ...prev];
              }

              return prev;
            });
          }
        } catch (error) {
          // Check if it's an access denied error (user was removed from team)
          if (error.response?.status === 403) {
            setError("You no longer have access to this conversation.");
            setLoadingMessages(false);
            // Navigate back to chat list or my teams
            navigate("/chat");
            return;
          }

          if (type === "team" && conversationDetails?.data) {
            try {
              const teamDetails = await teamService.getTeamById(conversationId);

              // ✅ Check if team is archived (also in fallback path)
              if (
                teamDetails.data?.archived_at ||
                teamDetails.data?.status === "inactive"
              ) {
                setIsTeamArchived(true);
              } else {
                setIsTeamArchived(false);
              }

              if (teamDetails?.data?.members) {
                conversationDetails.data.team = {
                  ...conversationDetails.data.team,
                  avatarUrl:
                    conversationDetails.data.team.avatarUrl ||
                    conversationDetails.data.team.teamavatarUrl ||
                    conversationDetails.data.team.teamavatar_url ||
                    teamDetails.data.avatarUrl ||
                    teamDetails.data.teamavatarUrl ||
                    teamDetails.data.teamavatar_url,
                  isSynthetic:
                    conversationDetails.data.team.isSynthetic ??
                    conversationDetails.data.team.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    undefined,
                  is_synthetic:
                    conversationDetails.data.team.is_synthetic ??
                    conversationDetails.data.team.isSynthetic ??
                    teamDetails.data.is_synthetic ??
                    teamDetails.data.isSynthetic ??
                    undefined,
                  members: teamDetails.data.members,
                };
              }
            } catch (error) {}
          }

          if (type === "direct") {
            try {
              await messageService.startConversation(
                parseInt(conversationId),
                "",
              );

              conversationDetails = await messageService.getConversationById(
                conversationId,
                type,
              );
              setActiveConversation(conversationDetails.data);

              const conversationsResponse =
                await messageService.getConversations();
              setConversations(conversationsResponse.data || []);
            } catch (createError) {
              console.error("Failed to create conversation:", createError);
            }
          }
        }

        // Get messages for the conversation
        try {
          const messagesResponse = await messageService.getMessages(
            conversationId,
            type,
          );
          const searchTarget = pendingChatSearchTargetRef.current;
          const shouldRevealSearchTarget =
            searchTarget?.messageId &&
            String(searchTarget.conversationId) === String(conversationId) &&
            searchTarget.type === type;
          let fetchedMessages = messagesResponse.data || [];
          let nextHasMoreMessages = messagesResponse.hasMore || false;

          if (shouldRevealSearchTarget) {
            let oldestMessage = fetchedMessages[0];
            let loadedCount = fetchedMessages.length;

            while (
              nextHasMoreMessages &&
              oldestMessage?.id &&
              loadedCount < CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION
            ) {
              const remaining =
                CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION - loadedCount;
              const earlierResponse = await messageService.getMessages(
                conversationId,
                type,
                {
                  before: oldestMessage.id,
                  limit: Math.min(50, remaining),
                },
              );
              const earlierMessages = earlierResponse.data || [];

              if (earlierMessages.length === 0) {
                nextHasMoreMessages = false;
                break;
              }

              fetchedMessages = [...earlierMessages, ...fetchedMessages];
              loadedCount += earlierMessages.length;
              nextHasMoreMessages = earlierResponse.hasMore || false;
              oldestMessage = earlierMessages[0];
            }
          }

          setHasMoreMessages(nextHasMoreMessages);
          setMessages(dedupeMessages(fetchedMessages));

          // Check if we need to highlight messages from a specific user (from notification)
          const highlightUser = searchParams.get("highlightUser");

          if (
            shouldRevealSearchTarget &&
            fetchedMessages.some(
              (msg) => String(msg.id) === String(searchTarget.messageId),
            )
          ) {
            const query = searchTarget.query;
            const allMatchingIds = query
              ? fetchedMessages
                  .filter((msg) => buildMessageSearchText(msg).includes(query))
                  .map((msg) => msg.id)
                  .filter(Boolean)
              : [];
            // Put the target (most recent match) first so the view scrolls to it
            const highlightIds = [
              searchTarget.messageId,
              ...allMatchingIds.filter(
                (id) => String(id) !== String(searchTarget.messageId),
              ),
            ];
            setHighlightMessageIds(highlightIds);
            pendingChatSearchTargetRef.current = null;
            // No auto-clear — highlights persist until search query changes
          } else if (highlightUser) {
            if (shouldRevealSearchTarget) {
              pendingChatSearchTargetRef.current = null;
            }

            // Highlight the most recent messages from this user (join message + response)
            const userMessages = fetchedMessages
              .filter((msg) => String(msg.senderId) === String(highlightUser))
              .slice(-3) // Get last 3 messages from this user
              .map((msg) => msg.id);

            if (userMessages.length > 0) {
              setHighlightMessageIds(userMessages);
              // Clear highlights after 4 seconds
              setTimeout(() => {
                setHighlightMessageIds([]);
                // Clear the URL parameter
                setSearchParams((prev) => {
                  prev.delete("highlightUser");
                  return prev;
                });
              }, 4000);
            }
          } else {
            if (shouldRevealSearchTarget) {
              pendingChatSearchTargetRef.current = null;
            }

            // Default behavior: highlight unread messages
            const unreadIds = fetchedMessages
              .filter((msg) => msg.senderId !== user?.id && !msg.readAt)
              .map((msg) => msg.id);

            if (unreadIds.length > 0) {
              setHighlightMessageIds(unreadIds);
              // Clear highlights after 3 seconds
              setTimeout(() => {
                setHighlightMessageIds([]);
              }, 3000);
            }
          }
        } catch (messagesError) {
          setHasMoreMessages(false);
          setMessages([]);
        }

        setLoadingMessages(false);

        // Wait for socket to be connected before joining
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          socketService.joinConversation(conversationId, type);
          socketService.markMessagesAsRead(conversationId, type);
        } else {
          const checkConnection = setInterval(() => {
            const socket = socketService.getSocket();
            if (socket && socket.connected) {
              const urlParams = new URLSearchParams(window.location.search);
              const type = urlParams.get("type") || "direct";
              socketService.joinConversation(conversationId, type);
              socketService.markMessagesAsRead(conversationId, type);
              clearInterval(checkConnection);
            }
          }, 100);

          setTimeout(() => clearInterval(checkConnection), 5000);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError("Failed to load messages. Please try again.");
        setLoadingMessages(false);
      }
    };

    if (isAuthenticated && conversationId) {
      fetchMessages();

      return () => {
        if (conversationId) {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type") || "direct";
          socketService.leaveConversation(conversationId, type);
        }
      };
    }
  }, [
    isAuthenticated,
    conversationId,
    searchParams,
    setSearchParams,
    navigate,
    user?.id,
  ]);

  useEffect(() => {
    if (!pendingScrollAdjustmentRef.current) return;

    const container = messagesContainerRef.current;

    if (!container) {
      pendingScrollAdjustmentRef.current = null;
      return;
    }

    const { previousScrollHeight, previousScrollTop } =
      pendingScrollAdjustmentRef.current;

    container.scrollTop =
      container.scrollHeight - previousScrollHeight + previousScrollTop;
    pendingScrollAdjustmentRef.current = null;
  }, [messages, hasMoreMessages]);

  const handleKickedFromTeam = useCallback(
    (data) => {
      if (
        conversationType === "team" &&
        parseInt(conversationId, 10) === data.teamId
      ) {
        setError("You have been removed from this team.");
        setConversations((prev) =>
          prev.filter((c) => !(c.type === "team" && c.id === data.teamId)),
        );
        navigate("/chat");
        setActiveConversation(null);
        setMessages([]);
        return;
      }

      setConversations((prev) =>
        prev.filter((c) => !(c.type === "team" && c.id === data.teamId)),
      );
    },
    [conversationId, conversationType, navigate],
  );

  // Set up WebSocket event listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    if (!socket || !isAuthenticated) {
      return;
    }

    // Handle online users
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    // Handle new messages
    const handleNewMessage = (message) => {
      const messageTarget = getMessageConversationTarget(message, user?.id);
      const messageConvId = String(
        messageTarget.conversationId ?? message.conversationId,
      );
      const currentConvId = String(conversationId);

      // Get current conversation type from URL
      const urlParams = new URLSearchParams(window.location.search);
      const currentType = urlParams.get("type") || "direct";

      // Check if message belongs to current conversation
      let isForCurrentConversation = false;

      if (message.type === currentType) {
        if (currentType === "team") {
          // For team chats: conversationId must match
          isForCurrentConversation = messageConvId === currentConvId;
        } else {
          // For DMs: either I sent it to this person, or this person sent it to me
          const isSentByMe =
            message.senderId === user?.id && messageConvId === currentConvId;
          const isReceivedFromThem = String(message.senderId) === currentConvId;
          isForCurrentConversation = isSentByMe || isReceivedFromThem;
        }
      }

      if (isForCurrentConversation) {
        setMessages((prev) => {
          // If this is our own message, replace the optimistic version
          if (message.senderId === user.id) {
            const withoutOptimistic = prev.filter(
              (msg) => !msg.isOptimistic || msg.senderId !== user.id,
            );

            const messageExists = withoutOptimistic.some(
              (msg) => msg.id === message.id,
            );
            if (messageExists) {
              return prev;
            }

            const newMessage = {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              imageUrl: message.imageUrl,
              fileUrl: message.fileUrl,
              fileName: message.fileName,
              createdAt: message.createdAt,
              senderUsername: message.senderUsername,
              type: message.type,
              fileSize: message.fileSize,
              fileExpiresAt: message.fileExpiresAt,
              fileDeletedAt: message.fileDeletedAt,
              readCount: message.readCount,
              recipientCount: message.recipientCount,
              readByUsers: message.readByUsers,
              editedAt: message.editedAt || message.edited_at,
              editedBy: message.editedBy ?? message.edited_by,
              isEdited: message.isEdited || message.is_edited,
            };

            return dedupeMessages([...withoutOptimistic, newMessage]);
          } else {
            const messageExists = prev.some((msg) => msg.id === message.id);
            if (messageExists) {
              return prev;
            }

            const newMessage = {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              imageUrl: message.imageUrl,
              fileUrl: message.fileUrl,
              fileName: message.fileName,
              createdAt: message.createdAt,
              senderUsername: message.senderUsername,
              type: message.type,
              fileSize: message.fileSize,
              fileExpiresAt: message.fileExpiresAt,
              fileDeletedAt: message.fileDeletedAt,
              readCount: message.readCount,
              recipientCount: message.recipientCount,
              readByUsers: message.readByUsers,
              editedAt: message.editedAt || message.edited_at,
              editedBy: message.editedBy ?? message.edited_by,
              isEdited: message.isEdited || message.is_edited,
            };

            return dedupeMessages([...prev, newMessage]);
          }
        });

        // Mark as read if viewing and didn't send it
        if (message.senderId !== user.id) {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type") || "direct";
          socketService.markMessagesAsRead(currentConvId, type);
        }
      }

      // Update conversation list
      setConversations((prev) => {
        const isUnreadIncoming =
          messageConvId !== currentConvId && message.senderId !== user.id;
        let conversationUpdated = false;
        const updatedList = prev.map((conv) => {
          if (String(conv.id) === messageConvId) {
            conversationUpdated = true;
            const currentUnreadCount = conv.unreadCount ?? conv.unread_count ?? 0;
            const unreadCount = isUnreadIncoming
              ? currentUnreadCount + 1
              : currentUnreadCount;

            return {
              ...conv,
              lastMessage: message.content,
              updatedAt: message.createdAt,
              isVirtual: false,
              unreadCount,
              unread_count: unreadCount,
            };
          }
          return conv;
        });

        if (!conversationUpdated) {
          if (messageTarget.type === "direct" && message.senderId !== user.id) {
            updatedList.unshift({
              id: Number.isNaN(Number(messageConvId))
                ? messageConvId
                : Number(messageConvId),
              type: "direct",
              partner: {
                id: message.senderId,
                username: message.senderUsername,
                firstName: message.senderFirstName,
                lastName: message.senderLastName,
                avatarUrl: message.senderAvatarUrl,
              },
              lastMessage: message.content,
              updatedAt: message.createdAt,
              unreadCount: isUnreadIncoming ? 1 : 0,
              unread_count: isUnreadIncoming ? 1 : 0,
            });
          }

          refreshConversationList();
        }

        const deduplicatedList = dedupeConversations(updatedList);

        return deduplicatedList.sort((a, b) => {
          const aDate = normalizeTimestampToDate(a.updatedAt)?.getTime() ?? 0;
          const bDate = normalizeTimestampToDate(b.updatedAt)?.getTime() ?? 0;
          return bDate - aDate;
        });
      });
    };

    // Handle typing indicators
    const handleTypingUpdate = async (data) => {
      if (String(data.conversationId) !== String(conversationId)) {
        return;
      }

      const typingUserId = resolveTypingUserId(data);
      if (!typingUserId) {
        return;
      }

      let displayName = resolveTypingDisplayName(data) || "User";
      const conversationUser = resolveConversationUser(activeConversation, typingUserId);

      if (conversationUser) {
        displayName = formatDisplayName(conversationUser);
      } else if (users[typingUserId]) {
        displayName = formatDisplayName(users[typingUserId]);
      } else if (data.isTyping) {
        try {
          const userData = await userService.getUserById(typingUserId);
          setUsers((prev) => ({ ...prev, [typingUserId]: userData }));
          displayName = formatDisplayName(userData);
        } catch (error) {
          console.error("Error fetching user for typing:", error);
          displayName = resolveTypingDisplayName(data) || "User";
        }
      }

      setTypingUsers((prev) => {
        const updated = {
          ...prev,
          [typingUserId]: data.isTyping ? displayName : null,
        };

        Object.keys(updated).forEach((key) => {
          if (updated[key] === null) {
            delete updated[key];
          }
        });

        return updated;
      });
    };

    // Handle message status updates
    const handleMessageStatus = (data) => {
      if (String(data.conversationId) === String(conversationId)) {
        const readCountByMessageId = new Map(
          (data.messageReadCounts || []).map((status) => [
            String(status.messageId),
            status,
          ]),
        );

        setMessages((prev) =>
          prev.map((msg) => {
            if (data.type === "team") {
              const status = readCountByMessageId.get(String(msg.id));

              if (!status) {
                return msg;
              }

              return {
                ...msg,
                readAt: msg.readAt || status.firstReadAt || data.readAt,
                readCount: status.readCount,
                recipientCount: status.recipientCount,
                readByUsers: status.readByUsers || msg.readByUsers,
              };
            }

            if (msg.senderId !== user.id) {
              return msg;
            }

            return {
              ...msg,
              readAt: msg.readAt || data.readAt,
              readCount: 1,
              recipientCount: 1,
            };
          }),
        );
      }
    };

    // Handle conversation updates
    const handleConversationUpdate = (data) => {
      setConversations((prev) => {
        const conversationIndex = prev.findIndex(
          (c) => String(c.id) === String(data.id),
        );

        if (conversationIndex === -1) {
          refreshConversationList();
          return prev;
        }

        const updatedList = [...prev];
        updatedList[conversationIndex] = {
          ...updatedList[conversationIndex],
          lastMessage: data.lastMessage,
          updatedAt: data.updatedAt,
        };

        const deduplicatedList = dedupeConversations(updatedList);

        return deduplicatedList.sort((a, b) => {
          const aDate = normalizeTimestampToDate(a.updatedAt)?.getTime() ?? 0;
          const bDate = normalizeTimestampToDate(b.updatedAt)?.getTime() ?? 0;
          return bDate - aDate;
        });
      });
    };

    const handleTeamMemberLeft = (data) => {
      if (!data?.teamId) return;

      setTeamMembersRefreshSignal({
        teamId: data.teamId,
        userId: data.userId ?? null,
        receivedAt: Date.now(),
      });

      const hasTeamConversation = conversationsRef.current.some(
        (conversation) =>
          conversation.type === "team" &&
          String(conversation.id) === String(data.teamId),
      );

      if (hasTeamConversation) {
        refreshConversationList();
      }

      const activeTeamId =
        activeConversationRef.current?.team?.id ?? activeConversationRef.current?.id;

      if (String(activeTeamId) !== String(data.teamId)) {
        return;
      }

      teamService
        .getTeamById(data.teamId)
        .then((response) => {
          const teamPayload =
            response?.data && typeof response.data === "object"
              ? response.data
              : response;

          if (!Array.isArray(teamPayload?.members)) {
            return;
          }

          setActiveConversation((prev) => {
            if (
              !prev ||
              prev.type !== "team" ||
              String(prev.team?.id ?? prev.id) !== String(data.teamId)
            ) {
              return prev;
            }

            return {
              ...prev,
              team: {
                ...prev.team,
                members: teamPayload.members,
              },
            };
          });
        })
        .catch((err) =>
          console.error("Error refreshing active team members:", err),
        );
    };

    const handleConversationDeleted = (data) => {
      if (!data?.partnerId) return;

      setConversations((prev) =>
        prev.filter(
          (conversation) =>
            !isDirectConversationForPartner(conversation, data.partnerId),
        ),
      );

      const currentUrlType =
        new URLSearchParams(window.location.search).get("type") ||
        activeConversationRef.current?.type ||
        "direct";

      const activePartnerId =
        getConversationPartnerId(activeConversationRef.current) ??
        getConversationPartnerId(
          conversationsRef.current.find(
            (conversation) =>
              conversation.type === "direct" &&
              String(conversation.id) === String(conversationId),
          ),
        );

      const isCurrentConversationDeleted =
        currentUrlType === "direct" &&
        (String(activePartnerId ?? "") === String(data.partnerId) ||
          String(conversationId ?? "") === String(data.partnerId));

      if (!isCurrentConversationDeleted) {
        return;
      }

      setError("This conversation is no longer available.");
      setActiveConversation(null);
      setMessages([]);
      setTypingUsers({});
      setHighlightMessageIds([]);
      setHasMoreMessages(false);
      navigate("/chat", { replace: true });
    };

    // Handle message deleted (soft delete broadcast)
    const handleMessageDeleted = (payload) => {
      // payload: { messageId, deletedAt, deletedBy, type, teamId, senderId, receiverId }
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(payload.messageId)
            ? {
                ...m,
                deletedAt: payload.deletedAt || new Date().toISOString(),
                deletedBy: payload.deletedBy,
                content: null,
                imageUrl: null,
                fileUrl: null,
                fileName: null,
                fileSize: null,
              }
            : m,
        ),
      );
      refreshConversationList();
    };

    const handleMessageEdited = (payload) => {
      const messageId = payload.messageId ?? payload.id;
      if (!messageId) return;
      const nextContent = payload.content;

      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? {
                ...m,
                content: nextContent ?? m.content,
                editedAt:
                  payload.editedAt ||
                  payload.edited_at ||
                  payload.updatedAt ||
                  payload.updated_at ||
                  new Date().toISOString(),
                editedBy: payload.editedBy ?? payload.edited_by ?? m.editedBy,
                isEdited: true,
              }
            : m,
        ),
      );

      if (payload.isLatestMessage || payload.isLastMessage) {
        setConversations((prev) =>
          prev.map((conversation) =>
            String(conversation.id) === String(payload.conversationId) ||
            (payload.type === "direct" &&
              (String(conversation.id) === String(payload.senderId) ||
                String(conversation.id) === String(payload.receiverId)))
              ? {
                  ...conversation,
                  lastMessage: nextContent ?? conversation.lastMessage,
                }
              : conversation,
          ),
        );
      }
    };

    // Subscribe to events
    socket.on("users:online", handleOnlineUsers);
    socket.on("message:received", handleNewMessage);
    socket.on("typing:update", handleTypingUpdate);
    socket.on("message:status", handleMessageStatus);
    socket.on("conversation:updated", handleConversationUpdate);
    socket.on("team:member_left", handleTeamMemberLeft);
    socket.on("conversation:deleted", handleConversationDeleted);
    socket.on("team:member_kicked", handleKickedFromTeam);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:edited", handleMessageEdited);

    // Cleanup function to remove listeners
    return () => {
      socket.off("users:online", handleOnlineUsers);
      socket.off("message:received", handleNewMessage);
      socket.off("typing:update", handleTypingUpdate);
      socket.off("message:status", handleMessageStatus);
      socket.off("conversation:updated", handleConversationUpdate);
      socket.off("team:member_left", handleTeamMemberLeft);
      socket.off("conversation:deleted", handleConversationDeleted);
      socket.off("team:member_kicked", handleKickedFromTeam);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:edited", handleMessageEdited);
    };
  }, [
    conversationId,
    handleKickedFromTeam,
    isAuthenticated,
    navigate,
    refreshConversationList,
    activeConversation,
    searchParams,
    user?.id,
    user?.username,
    users,
  ]);

  const handleHeaderTeamClick = (e) => {
    e.stopPropagation();
    if (teamData?.id) {
      setSelectedTeamId(teamData.id);
      setSelectedTeamData(teamData);
      setIsTeamModalOpen(true);
    }
  };

  const handleHeaderUserClick = (e) => {
    e.stopPropagation();
    if (conversationPartner?.id) {
      setSelectedUserId(conversationPartner.id);
      setIsUserModalOpen(true);
    }
  };

  const closePendingChatAction = () => {
    if (pendingChatActionLoading) return;
    setPendingChatAction(null);
  };

  // Handle leaving a deleted team (removes from conversation list)
  const handleLeaveTeam = async () => {
    if (!activeConversation?.team?.id) {
      return;
    }

    const teamId = activeConversation.team.id;
    const teamName = activeConversation.team.name || "this team";

    setPendingChatAction({ type: "leave-team", teamId, teamName });
  };

  const executeLeaveTeam = async ({ teamId }) => {
    try {
      // Call the existing leave team API
      await teamService.removeTeamMember(teamId, user.id);

      // Remove from local conversation list
      setConversations((prev) => prev.filter((c) => c.id !== teamId));

      // Navigate away
      navigate("/chat");

      setActiveConversation(null);
      setMessages([]);
      return true;
    } catch (error) {
      console.error("Error leaving team:", error);
      setError("Failed to leave team. Please try again.");
      return false;
    }
  };

  // Handle deleting a conversation from the list
  const handleDeleteConversation = async () => {
    if (!activeConversation) {
      return;
    }

    setPendingChatAction({
      type: "delete-conversation",
      conversationId: activeConversation.id,
    });
  };

  const executeDeleteConversation = async ({ conversationId }) => {
    try {
      const convId = conversationId;

      // Remove from local state
      setConversations((prev) => prev.filter((c) => c.id !== convId));

      // Navigate away
      navigate("/chat");

      setActiveConversation(null);
      setMessages([]);
      return true;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setError("Failed to delete conversation. Please try again.");
      return false;
    }
  };

  const loadEarlierMessages = async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return;

    const container = messagesContainerRef.current;

    if (container) {
      pendingScrollAdjustmentRef.current = {
        previousScrollHeight: container.scrollHeight,
        previousScrollTop: container.scrollTop,
      };
    }

    setLoadingMore(true);

    try {
      const oldestMessage = messages[0];
      const type = searchParams.get("type") || "direct";
      const response = await messageService.getMessages(conversationId, type, {
        before: oldestMessage.id,
        limit: 50,
      });
      const olderMessages = response.data || [];

      setHasMoreMessages(response.hasMore || false);

      if (olderMessages.length > 0) {
        setMessages((prev) => dedupeMessages([...olderMessages, ...prev]));
      } else {
        pendingScrollAdjustmentRef.current = null;
      }
    } catch (err) {
      pendingScrollAdjustmentRef.current = null;
      console.error("Error loading earlier messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendFile = async (file) => {
    if (!activeConversation || !file) return;

    try {
      // Upload file attachment before sending the message
      const uploadResult = await uploadToImageKit(file, "chatFiles");

      if (!uploadResult.success) {
        setError(uploadResult.error || "Failed to upload file");
        return;
      }

      // Get conversation type and target ID
      const type = searchParams.get("type") || "direct";
      const targetId =
        type === "team"
          ? activeConversation.team?.id
          : activeConversation.partner?.id;

      // Send message with file via socket
      socketService.sendMessage(
        targetId,
        null,
        type,
        null,
        uploadResult.url,
        file.name,
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Failed to upload file. Please try again.");
    }
  };

  const handleSendImage = async (file, previewUrl) => {
    if (!activeConversation || !file) return;

    try {
      // Upload image attachment before sending the message
      const uploadResult = await uploadToImageKit(file, "chatImages");

      if (!uploadResult.success) {
        setError(uploadResult.error || "Failed to upload image");
        return;
      }

      // Get conversation type and target ID
      const type = searchParams.get("type") || "direct";
      const targetId =
        type === "team"
          ? activeConversation.team?.id
          : activeConversation.partner?.id;

      // Send message with image via socket
      socketService.sendMessage(targetId, null, type, uploadResult.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Failed to upload image. Please try again.");
    }
  };

  // Delete message (soft delete)
  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;

    setPendingChatAction({ type: "delete-message", messageId });
  };

  const executeDeleteMessage = async ({ messageId }) => {
    try {
      // Optimistic UI update
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id) === String(messageId)
            ? {
                ...m,
                deletedAt: new Date().toISOString(),
                deletedBy: user?.id,
                content: null,
                imageUrl: null,
                fileUrl: null,
                fileName: null,
                fileSize: null,
              }
            : m,
        ),
      );

      await messageService.deleteMessage(messageId);
      return true;
    } catch (err) {
      console.error("Failed to delete message:", err);
      setError("Failed to delete message. Please try again.");

      // Optional: re-fetch messages for correctness after failure
      // (you can leave this out if you don’t want)
      return false;
    }
  };

  const confirmPendingChatAction = async () => {
    if (!pendingChatAction) return;

    try {
      setPendingChatActionLoading(true);

      let actionSucceeded = false;

      if (pendingChatAction.type === "leave-team") {
        actionSucceeded = await executeLeaveTeam(pendingChatAction);
      } else if (pendingChatAction.type === "delete-conversation") {
        actionSucceeded = await executeDeleteConversation(pendingChatAction);
      } else if (pendingChatAction.type === "delete-message") {
        actionSucceeded = await executeDeleteMessage(pendingChatAction);
      }

      if (actionSucceeded) {
        setPendingChatAction(null);
      }
    } finally {
      setPendingChatActionLoading(false);
    }
  };

  const handleEditMessage = async (messageId, content) => {
    if (!messageId) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error("Message cannot be empty.");
    }

    const previousMessage = messages.find(
      (m) => String(m.id) === String(messageId),
    );
    const isLatestMessage =
      messages.length > 0 &&
      String(messages[messages.length - 1]?.id) === String(messageId);
    const editedAt = new Date().toISOString();

    setMessages((prev) =>
      prev.map((m) =>
        String(m.id) === String(messageId)
          ? {
              ...m,
              content: trimmedContent,
              editedAt,
              editedBy: user?.id,
              isEdited: true,
            }
          : m,
      ),
    );

    if (isLatestMessage) {
      setConversations((prev) =>
        prev.map((conversation) =>
          String(conversation.id) === String(conversationId)
            ? {
                ...conversation,
                lastMessage: trimmedContent,
              }
            : conversation,
        ),
      );
    }

    try {
      const response = await messageService.updateMessage(
        messageId,
        trimmedContent,
      );
      const updatedMessage = response?.data || response?.message || response;

      if (updatedMessage && typeof updatedMessage === "object") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId)
              ? {
                  ...m,
                  ...updatedMessage,
                  content: updatedMessage.content ?? trimmedContent,
                  editedAt:
                    updatedMessage.editedAt ||
                    updatedMessage.edited_at ||
                    updatedMessage.updatedAt ||
                    updatedMessage.updated_at ||
                    editedAt,
                  editedBy:
                    updatedMessage.editedBy ??
                    updatedMessage.edited_by ??
                    user?.id,
                  isEdited: true,
                }
              : m,
          ),
        );
      }
    } catch (err) {
      if (previousMessage) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(messageId) ? previousMessage : m,
          ),
        );
      }
      if (isLatestMessage) {
        setConversations((prev) =>
          prev.map((conversation) =>
            String(conversation.id) === String(conversationId)
              ? {
                  ...conversation,
                  lastMessage: previousMessage?.content || conversation.lastMessage,
                }
              : conversation,
          ),
        );
      }
      console.error("Failed to edit message:", err);
      setError("Failed to edit message. Please try again.");
      throw err;
    }
  };

  const handleSendMessage = (content) => {
    if (!content.trim() || !conversationId) return;

    // Get type from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type") || "direct";

    // Create optimistic message (show immediately)
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      content: content,
      createdAt: new Date().toISOString(),
      senderUsername: user.username,
      type: type,
      isOptimistic: true,
    };

    // Add optimistic message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send message via WebSocket
    socketService.sendMessage(conversationId, content, type);

    // Clear typing indicator
    clearTimeout(typingTimeoutRef.current);
    socketService.sendTypingStop(conversationId, type);
  };

  const handleTyping = (isTyping, type = "direct") => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      socketService.sendTypingStart(conversationId, type, {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendTypingStop(conversationId, type);
      }, 3000);
    } else {
      socketService.sendTypingStop(conversationId, type);
    }
  };

  const selectConversation = (id) => {
    // Deselect only when the chat panel is currently visible for this conversation
    if (showChatView && String(id) === String(conversationId)) {
      setShowChatView(false);
      navigate("/chat");
      return;
    }

    // Find the conversation to get its type
    const conversation =
      filteredConversations.find((c) => c.id === id) ||
      conversations.find((c) => c.id === id);
    const type = conversation?.type || "direct";

    pendingChatSearchTargetRef.current =
      isChatSearchActive && conversation?.searchMatchMessageId
        ? {
            conversationId: id,
            type,
            messageId: conversation.searchMatchMessageId,
            query: normalizedChatSearchQuery,
          }
        : null;

    // Reset unread count for selected conversation
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, unreadCount: 0 } : conv)),
    );

    // Show chat view on mobile/tablet when conversation is selected
    setShowChatView(true);

    // When search is active, reveal the chat panel
    if (isChatSearchActive) {
      setSearchChatVisible(true);
    }

    // Navigate with type parameter
    navigate(`/chat/${id}?type=${type}`);
  };

  // Get active typing users for current conversation
  const activeTypingUsers = Object.entries(typingUsers)
    .filter(([userId, username]) => userId !== user?.id && username)
    .map(([_, username]) => username);

  const pendingChatActionType = pendingChatAction?.type;
  const pendingChatActionConfig = {
    "delete-message": {
      title: "Delete Message",
      message:
        "Delete this message? It will be replaced with a deleted-message marker in this chat.",
      confirmLabel: "Delete",
      loadingLabel: "Deleting...",
      variant: "error",
      icon: <Trash2 size={16} />,
    },
    "delete-conversation": {
      title: "Remove Chat",
      message:
        "Remove this chat from your conversation list? Your message history with this conversation will no longer be shown here.",
      confirmLabel: "Remove",
      loadingLabel: "Removing...",
      variant: "error",
      icon: <Trash2 size={16} />,
    },
    "leave-team": {
      title: "Leave Team Chat",
      message: `Leave "${pendingChatAction?.teamName || "this team"}"? This removes the chat from your conversation list.`,
      confirmLabel: "Leave",
      loadingLabel: "Leaving...",
      variant: "error",
      icon: <LogOut size={16} />,
    },
  }[pendingChatActionType];
  const isNoSearchResults =
    isChatSearchActive && !searchingChatMessages && filteredConversations.length === 0;
  const hideChatDuringSearch = isChatSearchActive && !searchChatVisible;
  const totalSearchMatches = isChatSearchActive
    ? filteredConversations.reduce((sum, conv) => sum + (conv.searchMatchCount || 0), 0)
    : 0;

  const chatSearchAction = (
    <div className="flex flex-col items-start sm:items-end">
      <label className="input input-bordered flex h-10 items-center gap-2 rounded-lg bg-base-100 !w-48">
        <Search size={16} className="shrink-0 text-base-content/50" />
        <input
          type="search"
          className="text-sm flex-1 min-w-0"
          placeholder="Search chats..."
          aria-label="Search chats"
          value={chatSearchQuery}
          onChange={(event) => setChatSearchQuery(event.target.value)}
        />
        {chatSearchQuery && (
          <button
            type="button"
            className="btn btn-ghost btn-xs h-6 min-h-0 w-6 p-0"
            onClick={() => setChatSearchQuery("")}
            aria-label="Clear chat search"
          >
            <X size={14} />
          </button>
        )}
      </label>
      {isChatSearchActive && !isNoSearchResults && (
        <p className="mt-1 text-xs text-base-content/60 sm:text-right">
          {filteredConversations.length} of {conversations.length} chats
          {searchingChatMessages
            ? " · searching messages..."
            : ` · ${totalSearchMatches} ${totalSearchMatches === 1 ? "match" : "matches"}`}
        </p>
      )}
    </div>
  );
  const chatSearchEmptyState =
    isChatSearchActive && searchingChatMessages
      ? {
          title: "Searching chats...",
          description: `Looking through message history for "${chatSearchQuery.trim()}".`,
          showActions: false,
        }
      : null;

  return (
    <PageContainer
      title="Chats"
      action={chatSearchAction}
      className="p-0"
      variant="muted"
    >
      <ScreenAlert type="error" message={error} onClose={() => setError(null)} />
      <ScreenAlert
        type="violet"
        message={
          searchNoResultsToastQuery
            ? `No user names, team names, or messages match "${searchNoResultsToastQuery}". Try a different search term.`
            : null
        }
        onClose={() => setSearchNoResultsToastQuery(null)}
      />

      <Modal
        isOpen={Boolean(pendingChatAction)}
        onClose={closePendingChatAction}
        title={pendingChatActionConfig?.title}
        position="center"
        size="small"
        bodyClassName="p-4"
        closeOnBackdrop={!pendingChatActionLoading}
        closeOnEscape={!pendingChatActionLoading}
        showCloseButton={!pendingChatActionLoading}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={closePendingChatAction}
              disabled={pendingChatActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={pendingChatActionConfig?.variant || "primary"}
              onClick={confirmPendingChatAction}
              disabled={pendingChatActionLoading}
              icon={pendingChatActionConfig?.icon}
            >
              {pendingChatActionLoading
                ? pendingChatActionConfig?.loadingLabel
                : pendingChatActionConfig?.confirmLabel}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-base-content/80">
          {pendingChatActionConfig?.message}
        </p>
      </Modal>

      <div className="flex h-[calc(100vh-200px)] gap-2">
        {/* Conversation List - Left Sidebar */}
        <div
          data-conversation-list-viewport="true"
          className={`lomir-conversation-list-scrollbar overflow-y-auto transition-all duration-300 ${
            showEmptyConversationState || hideChatDuringSearch || !conversationId || !showChatView
              ? "w-full"
              : "hidden md:block md:w-1/3"
          }`}
          style={{ direction: "rtl" }}
        >
          <div className="h-full" style={{ direction: "ltr" }}>
            <ConversationList
              conversations={isNoSearchResults ? conversations : filteredConversations}
              activeConversationId={conversationId}
              onSelectConversation={selectConversation}
              loading={loading}
              onlineUsers={onlineUsers}
              onActiveConversationVisibilityChange={
                handleActiveConversationVisibilityChange
              }
              teamMembersRefreshSignal={teamMembersRefreshSignal}
              emptyState={isNoSearchResults ? null : chatSearchEmptyState}
              searchQuery={isNoSearchResults ? "" : chatSearchQuery}
              chatVisible={!hideChatDuringSearch && showChatView}
            />
          </div>
        </div>

        {/* Message Display - Right Side */}
        {!showEmptyConversationState && !hideChatDuringSearch && conversationId && showChatView && (
        <div className={`bg-white shadow-soft rounded-xl overflow-hidden flex flex-col min-w-0 transition-all duration-300 ${
          showChatView ? "w-full md:w-2/3" : "hidden md:flex md:w-2/3"
        }`}>
          {conversationId ? (
            <>
              {/* Compact header, also shown on desktop when both regular headers are out of view */}
              <div
                className={`flex items-center justify-between border-b border-base-200 p-3 md:p-4 bg-base-100 ${
                  showCompactConversationHeader ? "md:flex" : "md:hidden"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Back/List toggle button - visible on small screens */}
                  <Tooltip
                    content="Back to conversation list"
                    position="bottom"
                    wrapperClassName="md:hidden inline-flex items-center flex-shrink-0"
                  >
                    <button
                      onClick={() => setShowChatView(false)}
                      className="flex items-center justify-center p-2 hover:bg-base-200 rounded-lg transition-colors"
                      aria-label="Back to conversation list"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </Tooltip>
                  
                  {/* Conversation Header - Avatar and name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {conversationType === "team" && teamData ? (
                      <Tooltip
                        content={`View ${teamData.name} details`}
                        position="bottom"
                        wrapperClassName="inline-flex items-center flex-shrink-0"
                      >
                        <div
                          className="w-10 h-10 rounded-full relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={handleHeaderTeamClick}
                        >
                          {getTeamAvatarUrl(teamData) ? (
                            <img
                              src={getTeamAvatarUrl(teamData)}
                              alt={teamData.name}
                              className="object-cover w-full h-full rounded-full"
                              onError={(e) => {
                                e.target.style.display = "none";
                                const fallback = e.target.parentElement.querySelector(".avatar-fallback");
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                            style={{ display: getTeamAvatarUrl(teamData) ? "none" : "flex" }}
                          >
                            <span className="text-sm font-medium">{getTeamInitials(teamData)}</span>
                          </div>
                          {isSyntheticTeam(teamData) && (
                            <DemoAvatarOverlay textClassName="text-[7px]" />
                          )}
                          {(activeConversation?.unreadCount || activeConversation?.unread_count) > 0 && (
                            <CountBadge
                              count={activeConversation.unreadCount ?? activeConversation.unread_count}
                              className="absolute -top-1 -left-2 z-10"
                            />
                          )}
                        </div>
                      </Tooltip>
                    ) : conversationPartner ? (
                      <Tooltip
                        content={`View ${[conversationPartner.firstName, conversationPartner.lastName].filter(Boolean).join(" ")} details`}
                        position="bottom"
                        wrapperClassName="inline-flex items-center flex-shrink-0"
                      >
                        <div
                          className="cursor-pointer hover:opacity-80 transition-opacity relative"
                          onClick={handleHeaderUserClick}
                        >
                          <UserAvatar
                            user={conversationPartner}
                            sizeClass="w-10 h-10"
                            iconSize={20}
                            initialsClassName="text-sm font-medium"
                            showDemoOverlay
                            demoOverlayTextClassName="text-[7px]"
                            demoOverlayTextTranslateClassName="-translate-y-[2px]"
                          />
                          {(activeConversation?.unreadCount || activeConversation?.unread_count) > 0 && (
                            <CountBadge
                              count={activeConversation.unreadCount ?? activeConversation.unread_count}
                              className="absolute -top-1 -left-2 z-10"
                            />
                          )}
                        </div>
                      </Tooltip>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <Tooltip
                        content={
                          conversationType === "team"
                            ? `View ${teamData?.name} details`
                            : `View ${[conversationPartner?.firstName, conversationPartner?.lastName].filter(Boolean).join(" ")} details`
                        }
                        position="bottom"
                        wrapperClassName="block min-w-0"
                      >
                        <h3
                          className="font-medium truncate text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={conversationType === "team" ? handleHeaderTeamClick : handleHeaderUserClick}
                        >
                          {conversationType === "team" ? teamData?.name : [conversationPartner?.firstName, conversationPartner?.lastName].filter(Boolean).join(" ")}
                        </h3>
                      </Tooltip>
                      {conversationType === "team" ? (
                        <div className="text-xs text-base-content/60 flex items-center justify-between gap-1.5 flex-nowrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Users size={12} className="flex-shrink-0" />
                            <span className="truncate">
                              {teamData?.members
                                ? `Team Chat with ${teamData.members.length} ${teamData.members.length === 1 ? "Member" : "Members"}`
                                : "Team Chat"}
                            </span>
                          </div>
                          {conversationUpdatedAt && (
                            <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                              {formatRelativeChatTimestamp(conversationUpdatedAt)}
                            </span>
                          )}
                        </div>
                      ) : conversationType === "direct" ? (
                        <div className="text-xs text-base-content/60 flex items-center justify-between gap-1.5 flex-nowrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User size={12} className="flex-shrink-0" />
                            <span className="truncate">DM Chat</span>
                          </div>
                          {conversationUpdatedAt && (
                            <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                              {formatRelativeChatTimestamp(conversationUpdatedAt)}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4">
                <MessageDisplay
                  messages={messages}
                  currentUserId={user?.id}
                  conversationPartner={conversationPartner}
                  teamData={teamData}
                  loading={loadingMessages}
                  typingUsers={activeTypingUsers}
                  conversationType={conversationType}
                  teamMembers={teamMembers}
                  highlightMessageIds={highlightMessageIds}
                  hasMoreMessages={hasMoreMessages}
                  loadingMore={loadingMore}
                  teamMembersRefreshSignal={teamMembersRefreshSignal}
                  onLoadEarlierMessages={loadEarlierMessages}
                  onDeleteConversation={handleDeleteConversation}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onLeaveTeam={handleLeaveTeam}
                  searchQuery={chatSearchQuery}
                />
              </div>

              {/* Deleted team banner + message input */}
              <div className="border-t border-base-200">
                {/* Show banner for archived teams */}
                {isTeamArchived && conversationType === "team" && (
                  <div
                    className="flex flex-col items-center gap-3 px-5 py-4 mx-4 mt-4 rounded-2xl text-center"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      color: "#dc2626",
                    }}
                  >
                    <span className="text-sm font-medium">
                      {activeConversation?.team?.members?.some(
                        (m) => m.userId === user?.id && m.role === "owner",
                      )
                        ? `You initiated the deletion of this team. The team is archived and inactive now. Remaining members are able to text in this chat until the last member leaves.`
                        : `${(() => {
                            const owner =
                              activeConversation?.team?.members?.find(
                                (m) => m.role === "owner",
                              );
                            return owner
                              ? `${owner.firstName} ${owner.lastName}`
                              : "The owner";
                          })()} has initiated the deletion of this team. The team is archived and inactive now. Remaining members are able to text in this chat until the last member leaves.`}
                    </span>

                    {/* Leave Team Button */}
                    <button
                      onClick={() => handleLeaveTeam()}
                      className="flex items-center gap-1 text-xs underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <LogOut size={14} />
                      Leave team and remove from chat list
                    </button>
                  </div>
                )}

                {/* Always show message input */}
                <div className="p-4">
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    onSendImage={handleSendImage}
                    onSendFile={handleSendFile}
                    onTyping={handleTyping}
                    disabled={!activeConversation}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-base-content/70">
                Select a conversation to start chatting
              </p>
              <button
                onClick={() => setShowChatView(false)}
                className="md:hidden flex items-center gap-2 btn btn-sm btn-outline"
              >
                <ChevronLeft size={16} />
                Back to conversations
              </button>
            </div>
          )}
        </div>
        )}
      </div>
      <TeamDetailsModal
        isOpen={isTeamModalOpen}
        teamId={selectedTeamId}
        initialTeamData={selectedTeamData}
        hideMatchData
        onClose={() => { setIsTeamModalOpen(false); setSelectedTeamId(null); setSelectedTeamData(null); }}
      />

      <UserDetailsModal
        isOpen={isUserModalOpen}
        userId={selectedUserId}
        onClose={() => { setIsUserModalOpen(false); setSelectedUserId(null); }}
      />
    </PageContainer>
  );
};

export default Chat;
