import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConversations,
  conversationsQueryKey,
  getConversationsQueryKey,
} from "../hooks/useChatQueries";
import PageContainer from "../components/layout/PageContainer";
import ConversationSidebar from "../components/chat/ConversationSidebar";
import MessageArea from "../components/chat/MessageArea";
import { useAuth } from "../contexts/AuthContext";
import { messageService } from "../services/messageService";
import useChatTyping from "../hooks/useChatTyping";
import useChatSocketEvents from "../hooks/useChatSocketEvents";
import useChatSearchState from "../hooks/useChatSearchState";
import useChatTeamAccess from "../hooks/useChatTeamAccess";
import useChatMessageActions from "../hooks/useChatMessageActions";
import useActiveChatConversation from "../hooks/useActiveChatConversation";
import { userService } from "../services/userService";
import { isQuietError } from "../services/api";
import ScreenAlert from "../components/common/ScreenAlert";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import TeamDetailsModal from "../components/teams/TeamDetailsModal";
import UserDetailsModal from "../components/users/UserDetailsModal";
import {
  formatArchiveTimeRemaining,
  msUntilNextArchiveChange,
} from "../utils/dateHelpers";
import {
  getConversationPartnerId,
  isActiveTeamMemberRow,
  isUserTeamMember,
  isArchivedTeamData,
  getConversationUpdatedAt,
  dedupeMessages,
} from "../utils/chatHelpers";
import {
  dedupeConversations,
  hydrateConversationPreviews,
} from "../utils/chatSearch";

// Stable empty fallback so the conversations query's default never changes
// identity between renders (avoids needless re-renders / effect re-runs).
const EMPTY_CONVERSATIONS = [];
const EMPTY_DIRECT_CONVERSATION_PREVIEW = "Start your conversation...";

const isTransientEmptyDirectConversation = (conversation) =>
  conversation?.type === "direct" &&
  conversation?.isVirtual &&
  (conversation.lastMessage ?? conversation.last_message) ===
    EMPTY_DIRECT_CONVERSATION_PREVIEW;

const Chat = () => {
  const { t } = useTranslation();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, blockedRelationshipIds } = useAuth();
  const isBlockedId = useCallback(
    (id) =>
      id != null && blockedRelationshipIds?.has?.(String(id)),
    [blockedRelationshipIds],
  );
  const activeConversationsQueryKey = useMemo(
    () => getConversationsQueryKey(user?.id),
    [user?.id],
  );
  // Conversation list is backed by the React Query cache. The query fetches +
  // dedupes + hydrates previews once per user (switching chats no longer
  // refetches the list); socket/local updates mutate that user's cache via the
  // setConversations wrapper below, keeping their (prev) => next shape.
  const fetchConversations = useCallback(async () => {
    const response = await messageService.getConversations();
    return hydrateConversationPreviews(dedupeConversations(response.data || []));
  }, []);
  const {
    data: conversations = EMPTY_CONVERSATIONS,
    isLoading: loading,
    isError: conversationsLoadError,
  } = useConversations(fetchConversations, isAuthenticated, user?.id);
  const setConversations = useCallback(
    (next) =>
      queryClient.setQueryData(
        activeConversationsQueryKey,
        (prev = EMPTY_CONVERSATIONS) =>
          typeof next === "function" ? next(prev) : next,
      ),
    [activeConversationsQueryKey, queryClient],
  );
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
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
  const messagesContainerRef = useRef(null);
  const pendingScrollAdjustmentRef = useRef(null);
  const conversationsRef = useRef([]);
  const activeConversationRef = useRef(null);
  const messagesRef = useRef([]);
  const pendingChatSearchTargetRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Conversation type (used for read-only rendering)
  const conversationType =
    activeConversation?.type ||
    new URLSearchParams(window.location.search).get("type") ||
    "direct";
  const handleChatSearchQueryChange = useCallback(() => {
    setHighlightMessageIds([]);
  }, []);
  const {
    activeTypingUsers,
    clearTypingUsers,
    handleTyping,
    handleTypingUpdate,
  } = useChatTyping({
    conversationId,
    currentUser: user,
    activeConversation,
  });
  const {
    chatSearchEmptyState,
    chatSearchQuery,
    filteredConversations,
    hideChatDuringSearch,
    isChatSearchActive,
    isNoSearchResults,
    normalizedChatSearchQuery,
    revealSearchChat,
    searchingChatMessages,
    searchNoResultsToastQuery,
    setChatSearchQuery,
    setSearchNoResultsToastQuery,
    totalSearchMatches,
  } = useChatSearchState({
    conversationId,
    conversationType,
    conversations,
    isAuthenticated,
    messages,
    onSearchQueryChange: handleChatSearchQueryChange,
  });

  const conversationPartner =
    conversationType === "direct"
      ? activeConversation?.partner || activeConversation?.partnerUser || null
      : null;

  const teamData =
    conversationType === "team" ? activeConversation?.team || null : null;
  const isActiveTeamArchived = isTeamArchived || isArchivedTeamData(teamData);

  // Time left before an archived team + its chat are permanently deleted
  // (whole days, then remaining hours on the final day). Refreshed on a
  // self-scheduling timer — once per day, then hourly on the final day —
  // instead of recomputing on every render.
  const activeTeamArchivedAt = teamData?.archivedAt ?? teamData?.archived_at;
  const [activeTeamArchiveTimeRemaining, setActiveTeamArchiveTimeRemaining] =
    useState(null);
  useEffect(() => {
    if (!isActiveTeamArchived || !activeTeamArchivedAt) {
      setActiveTeamArchiveTimeRemaining(null);
      return undefined;
    }
    let timeoutId;
    const update = () => {
      setActiveTeamArchiveTimeRemaining(
        formatArchiveTimeRemaining(activeTeamArchivedAt),
      );
      const delay = msUntilNextArchiveChange(activeTeamArchivedAt);
      if (delay != null) {
        timeoutId = setTimeout(update, delay);
      }
    };
    update();
    return () => clearTimeout(timeoutId);
  }, [isActiveTeamArchived, activeTeamArchivedAt]);

  const teamMembers = useMemo(() => {
    const members =
      conversationType === "team" ? activeConversation?.team?.members || [] : [];
    // Hide blocked users from the roster/mention list (both directions).
    return members.filter((member) => {
      const memberId =
        member?.userId ?? member?.user_id ?? member?.id ?? member?.user?.id;
      return !isBlockedId(memberId);
    });
  }, [conversationType, activeConversation?.team?.members, isBlockedId]);
  // Hide messages from blocked users from the rendered stream (both directions).
  // The backend already filters fetches and realtime delivery; this keeps an
  // open session consistent the instant a block is added/removed.
  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) => !isBlockedId(message?.senderId ?? message?.sender_id),
      ),
    [messages, isBlockedId],
  );
  const isCurrentUserActiveTeamMember =
    conversationType !== "team" || isUserTeamMember(teamMembers, user?.id);
  const canSendInActiveConversation =
    Boolean(activeConversation) && isCurrentUserActiveTeamMember;

  const {
    revokeTeamChatAccess,
    refreshActiveTeamMembership,
    hydrateTeamConversationDetails,
  } = useChatTeamAccess({
    queryClient,
    user,
    conversationId,
    conversationType,
    activeConversation,
    searchParams,
    navigate,
    activeConversationRef,
    clearTypingUsers,
    setError,
    setConversations,
    setActiveConversation,
    setMessages,
    setReplyingTo,
    setHighlightMessageIds,
    setHasMoreMessages,
    setShowChatView,
    setIsTeamArchived,
    setLoadingMessages,
  });

  const { loadEarlierMessages } = useActiveChatConversation({
    conversationId,
    conversationsRef,
    dedupeMessages,
    hasMoreMessages,
    hydrateTeamConversationDetails,
    isAuthenticated,
    loadingMore,
    messages,
    messagesContainerRef,
    navigate,
    pendingChatSearchTargetRef,
    pendingScrollAdjustmentRef,
    revokeTeamChatAccess,
    searchParams,
    setActiveConversation,
    setConversations,
    setError,
    setHasMoreMessages,
    setHighlightMessageIds,
    setIsTeamArchived,
    setLoadingMessages,
    setLoadingMore,
    setMessages,
    setSearchParams,
    user,
  });

  const mentionParticipants = useMemo(() => {
    if (conversationType === "direct") {
      return conversationPartner ? [conversationPartner] : [];
    }
    const members = teamMembers
      .filter(isActiveTeamMemberRow)
      .map((m) => m.user || m)
      .filter((m) => {
        const id = m.userId ?? m.user_id ?? m.id;
        return id && String(id) !== String(user?.id);
      })
      .map((m) => ({
        id: m.userId ?? m.user_id ?? m.id,
        firstName: m.firstName || m.first_name || "",
        lastName: m.lastName || m.last_name || "",
        avatarUrl: m.avatarUrl || m.avatar_url || null,
      }));
    return [{ id: "all", firstName: "all", lastName: "" }, ...members];
  }, [conversationType, conversationPartner, teamMembers, user?.id]);

  const conversationUpdatedAt =
    getConversationUpdatedAt(activeConversation) ||
    getConversationUpdatedAt(messages?.[messages.length - 1] || messages?.[0] || null);
  const showCompactConversationHeader =
    Boolean(conversationId) &&
    !isActiveConversationVisible;
  const showEmptyConversationState =
    !loading && conversations.length === 0 && !conversationId;

  useEffect(() => {
    setReplyingTo(null);
  }, [conversationId, conversationType]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    setConversations((prev) => {
      const next = prev.filter(
        (conversation) =>
          !isTransientEmptyDirectConversation(conversation) ||
          String(conversation.id) === String(conversationId),
      );

      return next.length === prev.length ? prev : next;
    });
  }, [conversationId, setConversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    setIsActiveConversationVisible(true);
  }, [conversationId]);

  const handleActiveConversationVisibilityChange = useCallback((isVisible) => {
    setIsActiveConversationVisible((current) =>
      current === isVisible ? current : isVisible,
    );
  }, []);

  // Re-fetch the conversation list by invalidating its query (the queryFn
  // re-runs the dedupe + preview hydration). React Query dedupes concurrent
  // invalidations, so the burst of socket handlers that used to each trigger a
  // fresh getConversations now collapse into a single refetch.
  const refreshConversationList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: conversationsQueryKey }),
    [queryClient],
  );

  // Apply live block/unblock changes to the chat view: drop blocked DMs (and
  // restore unblocked ones) from the list, and close the active DM if its
  // partner is now blocked. Team chats stay open — the blocker is hidden via
  // the visibleMessages / teamMembers filters. The first run is skipped because
  // the initial conversation fetch below already loads the correct state.
  const prevBlockedIdsRef = useRef(blockedRelationshipIds);
  useEffect(() => {
    if (!isAuthenticated) return;
    // Only react to an ACTUAL block/unblock change — compare the value, not a
    // first-run boolean. A "skip first run" boolean ref is defeated by React
    // StrictMode's mount double-invoke: the ref persists, so the 2nd invoke
    // passes the guard and refetches the list on every Chat mount. Comparing
    // the blockedRelationshipIds Set by reference (it only changes when
    // AuthContext updates it) is StrictMode-safe and mount-safe.
    if (prevBlockedIdsRef.current === blockedRelationshipIds) return;
    prevBlockedIdsRef.current = blockedRelationshipIds;

    refreshConversationList();

    const currentUrlType =
      new URLSearchParams(window.location.search).get("type") ||
      activeConversationRef.current?.type ||
      "direct";
    if (currentUrlType !== "direct") return;

    const activePartnerId = getConversationPartnerId(
      activeConversationRef.current,
    );
    if (isBlockedId(activePartnerId)) {
      setError(t("chatPage.conversationUnavailable"));
      setActiveConversation(null);
      setMessages([]);
      clearTypingUsers();
      setHighlightMessageIds([]);
      setHasMoreMessages(false);
      navigate("/chat", { replace: true });
    }
    // `navigate` is intentionally NOT a dependency: useNavigate() returns a new
    // function identity on every navigation, so including it made this effect
    // re-run — and refetch the whole conversation list — on every chat switch.
    // This effect must only react to block/unblock state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    blockedRelationshipIds,
    clearTypingUsers,
    isAuthenticated,
    isBlockedId,
    refreshConversationList,
  ]);

  // Surface a load failure from the conversations query (matches the old
  // fetch-effect error message).
  useEffect(() => {
    if (conversationsLoadError) {
      setError(t("chatPage.loadConversationsFailed"));
    }
  }, [conversationsLoadError, t]);

  // Once the conversation list has loaded, either auto-select the first chat
  // (landed on /chat with none chosen) or seed a virtual DM entry when the URL
  // points at a partner not yet in the list (new/never-messaged conversation).
  // Team virtuals are created in the messages effect, so this only handles
  // direct chats. Guarded so each missing id is attempted at most once.
  const seededVirtualConvRef = useRef(null);
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    if (!conversationId) {
      const persistentConversations = conversations.filter(
        (conversation) => !isTransientEmptyDirectConversation(conversation),
      );

      if (persistentConversations.length > 0) {
        const firstConversation = persistentConversations[0];
        const firstConversationType = firstConversation.type || "direct";
        navigate(`/chat/${firstConversation.id}?type=${firstConversationType}`);
      }
      return;
    }

    const conversationExists = conversations.some(
      (conv) => String(conv.id) === String(conversationId),
    );
    if (conversationExists) return;
    if (seededVirtualConvRef.current === String(conversationId)) return;

    const type =
      new URLSearchParams(window.location.search).get("type") || "direct";
    if (type !== "direct") return;

    seededVirtualConvRef.current = String(conversationId);

    (async () => {
      try {
        // A 404 (no such user — stale link or deleted account) is expected and
        // handled gracefully, not console noise.
        const userResponse = await userService.getUserById(conversationId, {
          quietErrorStatuses: [404],
        });
        const userData = userResponse.data;

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
          lastMessage: EMPTY_DIRECT_CONVERSATION_PREVIEW,
          updatedAt: new Date().toISOString(),
          isVirtual: true,
          unreadCount: 0,
        };

        setConversations((prev) =>
          dedupeConversations([virtualConversation, ...prev]),
        );
      } catch (error) {
        if (!isQuietError(error)) {
          console.error("Error creating virtual conversation:", error);
        }
      }
    })();
  }, [
    isAuthenticated,
    loading,
    conversationId,
    conversations,
    navigate,
    setConversations,
  ]);

  useChatSocketEvents({
    activeConversationRef,
    clearTypingUsers,
    conversationId,
    conversationType,
    conversationsRef,
    dedupeMessages,
    handleTypingUpdate,
    isAuthenticated,
    navigate,
    refreshActiveTeamMembership,
    refreshConversationList,
    revokeTeamChatAccess,
    setActiveConversation,
    setConversations,
    setError,
    setHasMoreMessages,
    setHighlightMessageIds,
    setMessages,
    setOnlineUsers,
    setTeamMembersRefreshSignal,
    user,
  });

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

  const {
    closePendingChatAction,
    handleLeaveTeam,
    handleTeamDetailsLeave,
    handleDeleteConversation,
    handleReplyToMessage,
    handleClearReply,
    handleSendFile,
    handleSendImage,
    handleDeleteMessage,
    confirmPendingChatAction,
    handleEditMessage,
    handleSendMessage,
  } = useChatMessageActions({
    activeConversation,
    conversationId,
    messages,
    user,
    replyingTo,
    pendingChatAction,
    pendingChatActionLoading,
    canSendInActiveConversation,
    isCurrentUserActiveTeamMember,
    searchParams,
    navigate,
    refreshActiveTeamMembership,
    handleTyping,
    clearTypingUsers,
    setPendingChatAction,
    setPendingChatActionLoading,
    setReplyingTo,
    setConversations,
    setActiveConversation,
    setMessages,
    setShowChatView,
    setError,
    setIsTeamModalOpen,
    setSelectedTeamId,
    setSelectedTeamData,
  });

  const selectConversation = (id) => {
    // Deselect only when the chat panel is actually open for this conversation.
    // If activeConversation is null and not loading, the panel isn't visible yet
    // (e.g. new virtual conversation) — re-open instead of deselecting.
    if (
      showChatView &&
      String(id) === String(conversationId) &&
      (activeConversation || loadingMessages)
    ) {
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
      revealSearchChat();
    }

    // Navigate with type parameter
    navigate(`/chat/${id}?type=${type}`);
  };

  const pendingChatActionType = pendingChatAction?.type;
  const pendingChatActionConfig = {
    "delete-message": {
      title: t("chatPage.deleteMessage.title"),
      message: t("chatPage.deleteMessage.message"),
      confirmLabel: t("chatPage.deleteMessage.confirmLabel"),
      loadingLabel: t("chatPage.deleteMessage.loadingLabel"),
      variant: "error",
      icon: <Trash2 size={16} />,
    },
    "delete-conversation": {
      title: t("chatPage.deleteConversation.title"),
      message: t("chatPage.deleteConversation.message"),
      confirmLabel: t("chatPage.deleteConversation.confirmLabel"),
      loadingLabel: t("chatPage.deleteConversation.loadingLabel"),
      variant: "error",
      icon: <Trash2 size={16} />,
    },
    "leave-team": {
      title: t("chatPage.leaveTeam.title"),
      message: t("chatPage.leaveTeam.message", {
        teamName:
          pendingChatAction?.teamName ||
          t("chatPage.leaveTeam.fallbackTeamName"),
      }),
      confirmLabel: t("chatPage.leaveTeam.confirmLabel"),
      loadingLabel: t("chatPage.leaveTeam.loadingLabel"),
      variant: "error",
      icon: <LogOut size={16} />,
    },
  }[pendingChatActionType];
  const shouldShowConversationPanel =
    !showEmptyConversationState &&
    !hideChatDuringSearch &&
    Boolean(conversationId) &&
    showChatView &&
    (Boolean(activeConversation) || loadingMessages);
  const chatSearchPlaceholder = t("chatPage.searchPlaceholder");
  const chatSearchInputWidth = `${Math.max(
    chatSearchQuery.length,
    chatSearchPlaceholder.length,
  )}ch`;

  const chatSearchAction = (
    <div className="flex max-w-full flex-col items-start sm:items-end">
      <label className="input input-bordered flex h-10 w-fit max-w-full items-center gap-2 rounded-lg bg-base-100">
        <Search size={16} className="shrink-0 text-base-content/50" />
        <input
          type="search"
          className="min-w-0 text-sm"
          placeholder={chatSearchPlaceholder}
          aria-label={t("chatPage.searchAria")}
          value={chatSearchQuery}
          onChange={(event) => setChatSearchQuery(event.target.value)}
          style={{
            width: chatSearchInputWidth,
            minWidth: `${chatSearchPlaceholder.length}ch`,
            maxWidth: "min(42vw, 24rem)",
          }}
        />
        {chatSearchQuery && (
          <button
            type="button"
            className="btn btn-ghost btn-xs ml-auto h-6 min-h-0 w-6 p-0"
            onClick={() => setChatSearchQuery("")}
            aria-label={t("chatPage.searchClearAria")}
          >
            <X size={14} />
          </button>
        )}
      </label>
      {isChatSearchActive && !isNoSearchResults && (
        <p className="mt-1 text-xs text-base-content/60 sm:text-right">
          {searchingChatMessages
            ? t("chatPage.searchCountSearching", {
                filtered: filteredConversations.length,
                total: conversations.length,
              })
            : t("chatPage.searchCountMatches", {
                filtered: filteredConversations.length,
                total: conversations.length,
                matches: totalSearchMatches,
              })}
        </p>
      )}
    </div>
  );
  return (
    <PageContainer
      title={t("chatPage.title")}
      action={chatSearchAction}
      className="p-0"
      variant="muted"
    >
      <ScreenAlert type="error" message={error} onClose={() => setError(null)} />
      <ScreenAlert
        type="violet"
        message={
          searchNoResultsToastQuery
            ? t("chatPage.searchNoResults", {
                query: searchNoResultsToastQuery,
              })
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
              {t("confirmModal.cancel")}
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
        <ConversationSidebar
          fullWidth={
            showEmptyConversationState ||
            hideChatDuringSearch ||
            !shouldShowConversationPanel
          }
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
          currentUser={user}
        />

        {shouldShowConversationPanel && (
          <MessageArea
            showChatView={showChatView}
            conversationId={conversationId}
            onBack={() => setShowChatView(false)}
            messagesContainerRef={messagesContainerRef}
            showCompactConversationHeader={showCompactConversationHeader}
            conversationType={conversationType}
            teamData={teamData}
            conversationPartner={conversationPartner}
            activeConversation={activeConversation}
            conversationUpdatedAt={conversationUpdatedAt}
            onTeamClick={handleHeaderTeamClick}
            onUserClick={handleHeaderUserClick}
            messages={visibleMessages}
            currentUserId={user?.id}
            loadingMessages={loadingMessages}
            typingUsers={activeTypingUsers}
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
            onReply={handleReplyToMessage}
            searchQuery={chatSearchQuery}
            isActiveTeamArchived={isActiveTeamArchived}
            isCurrentUserActiveTeamMember={isCurrentUserActiveTeamMember}
            activeTeamArchiveTimeRemaining={activeTeamArchiveTimeRemaining}
            onSendMessage={handleSendMessage}
            onSendImage={handleSendImage}
            onSendFile={handleSendFile}
            onTyping={handleTyping}
            canSendInActiveConversation={canSendInActiveConversation}
            participants={mentionParticipants}
            replyingTo={replyingTo}
            onClearReply={handleClearReply}
          />
        )}
      </div>
      <TeamDetailsModal
        isOpen={isTeamModalOpen}
        teamId={selectedTeamId}
        initialTeamData={selectedTeamData}
        hideMatchData
        onLeave={handleTeamDetailsLeave}
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
