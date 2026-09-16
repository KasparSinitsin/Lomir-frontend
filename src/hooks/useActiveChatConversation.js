import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";
import { userService } from "../services/userService";
import { isQuietError } from "../services/api";
import {
  buildConversationLastMessagePreview,
  buildMessageSearchText,
  getNotificationEventHighlightIds,
  CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION,
} from "../utils/chatSearch";
import { isArchivedTeamData } from "../utils/chatHelpers";

const useActiveChatConversation = ({
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
}) => {
  const dedupeMessagesRef = useRef(dedupeMessages);
  const { t } = useTranslation();
  // Read through a ref like dedupeMessages: a language switch must re-match
  // the search target, not refetch the conversation.
  const searchOptionsRef = useRef({ viewer: user, t });

  useEffect(() => {
    dedupeMessagesRef.current = dedupeMessages;
  }, [dedupeMessages]);

  useEffect(() => {
    searchOptionsRef.current = { viewer: user, t };
  }, [user, t]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversationId) return;

      try {
        setLoadingMessages(true);
        setLoadingMore(false);
        setHasMoreMessages(false);
        setIsTeamArchived(false);

        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("type") || "direct";
        const highlightedMessageId =
          urlParams.get("highlightMessage") || urlParams.get("messageId");
        const highlightedEventTarget = {
          type:
            urlParams.get("highlightEvent") ||
            urlParams.get("highlightEventType") ||
            "",
          referenceId:
            urlParams.get("highlightRef") ||
            urlParams.get("highlightReferenceId") ||
            "",
          actorId: urlParams.get("highlightActor") || "",
        };

        let conversationDetails;
        try {
          conversationDetails = await messageService.getConversationById(
            conversationId,
            type,
          );

          if (type === "team" && conversationDetails?.data) {
            setIsTeamArchived(isArchivedTeamData(conversationDetails.data.team));

            const accessRevoked = await hydrateTeamConversationDetails(
              conversationDetails,
              conversationId,
            );
            if (accessRevoked) return;
          }

          setActiveConversation(conversationDetails.data);

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
                    archived_at: conversationDetails.data.team.archived_at,
                    archivedAt:
                      conversationDetails.data.team.archivedAt ??
                      conversationDetails.data.team.archived_at,
                    status: conversationDetails.data.team.status,
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
          if (
            type === "team" &&
            (error.response?.status === 404 || error.response?.status === 403)
          ) {
            revokeTeamChatAccess(
              conversationId,
              "You no longer have access to this team chat.",
            );
            setLoadingMessages(false);
            return;
          }

          if (error.response?.status === 403) {
            setError("You no longer have access to this conversation.");
            setLoadingMessages(false);
            navigate("/chat");
            return;
          }

          if (type === "team" && conversationDetails?.data) {
            const accessRevoked = await hydrateTeamConversationDetails(
              conversationDetails,
              conversationId,
            );
            if (accessRevoked) return;
          }

          if (type === "direct") {
            const knownConv = conversationsRef.current.find(
              (c) =>
                String(c.id) === String(conversationId) &&
                c.type === "direct",
            );
            if (knownConv?.partner) {
              setActiveConversation({
                id: parseInt(conversationId),
                type: "direct",
                partner: knownConv.partner,
                isVirtual: true,
              });
            } else {
              try {
                const userResponse = await userService.getUserById(
                  conversationId,
                  { quietErrorStatuses: [404] },
                );
                const userData = userResponse.data;
                setActiveConversation({
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
                  isVirtual: true,
                });
              } catch (userError) {
                if (!isQuietError(userError)) {
                  console.error(
                    "Failed to load partner for new conversation:",
                    userError,
                  );
                }
              }
            }
          }
        }

        try {
          const messagesResponse = await messageService.getMessages(
            conversationId,
            type,
          );
          const searchTarget = highlightedMessageId
            ? {
                conversationId,
                type,
                messageId: highlightedMessageId,
                query: null,
              }
            : pendingChatSearchTargetRef.current;
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
          setMessages(dedupeMessagesRef.current(fetchedMessages));

          const latestFetchedMessage =
            fetchedMessages[fetchedMessages.length - 1] || null;
          const latestPreview =
            buildConversationLastMessagePreview(latestFetchedMessage);

          if (latestFetchedMessage && latestPreview) {
            setConversations((prev) =>
              prev.map((conversation) =>
                String(conversation.id) === String(conversationId)
                  ? {
                      ...conversation,
                      lastMessage: latestPreview,
                      updatedAt:
                        latestFetchedMessage.createdAt ||
                        latestFetchedMessage.created_at ||
                        conversation.updatedAt,
                    }
                  : conversation,
              ),
            );
          }

          const highlightUser = searchParams.get("highlightUser");
          const eventHighlightIds = getNotificationEventHighlightIds(
            fetchedMessages,
            highlightedEventTarget,
          );

          if (
            shouldRevealSearchTarget &&
            fetchedMessages.some(
              (msg) => String(msg.id) === String(searchTarget.messageId),
            )
          ) {
            const query = searchTarget.query;
            const allMatchingIds = query
              ? fetchedMessages
                  .filter((msg) =>
                    buildMessageSearchText(msg, searchOptionsRef.current).includes(query),
                  )
                  .map((msg) => msg.id)
                  .filter(Boolean)
              : [];
            const highlightIds = [
              searchTarget.messageId,
              ...allMatchingIds.filter(
                (id) => String(id) !== String(searchTarget.messageId),
              ),
            ];
            setHighlightMessageIds(highlightIds);
            pendingChatSearchTargetRef.current = null;
          } else if (eventHighlightIds.length > 0) {
            if (shouldRevealSearchTarget) {
              pendingChatSearchTargetRef.current = null;
            }

            setHighlightMessageIds(eventHighlightIds);
            setTimeout(() => {
              setHighlightMessageIds([]);
            }, 3500);
          } else if (highlightUser) {
            if (shouldRevealSearchTarget) {
              pendingChatSearchTargetRef.current = null;
            }

            const userMessages = fetchedMessages
              .filter((msg) => String(msg.senderId) === String(highlightUser))
              .slice(-3)
              .map((msg) => msg.id);

            if (userMessages.length > 0) {
              setHighlightMessageIds(userMessages);
              setTimeout(() => {
                setHighlightMessageIds([]);
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

            const unreadIds = fetchedMessages
              .filter((msg) => msg.senderId !== user?.id && !msg.readAt)
              .map((msg) => msg.id);

            if (unreadIds.length > 0) {
              setHighlightMessageIds(unreadIds);
              setTimeout(() => {
                setHighlightMessageIds([]);
              }, 3000);
            }
          }
        } catch (messagesError) {
          if (
            type === "team" &&
            (messagesError.response?.status === 404 ||
              messagesError.response?.status === 403)
          ) {
            revokeTeamChatAccess(
              conversationId,
              "You no longer have access to this team chat.",
            );
            setLoadingMessages(false);
            return;
          }

          setHasMoreMessages(false);
          setMessages([]);
        }

        setLoadingMessages(false);

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
    conversationId,
    conversationsRef,
    hydrateTeamConversationDetails,
    isAuthenticated,
    navigate,
    pendingChatSearchTargetRef,
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
  }, [hasMoreMessages, messages, messagesContainerRef, pendingScrollAdjustmentRef]);

  const loadEarlierMessages = useCallback(async () => {
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
        setMessages((prev) =>
          dedupeMessagesRef.current([...olderMessages, ...prev]),
        );
      } else {
        pendingScrollAdjustmentRef.current = null;
      }
    } catch (err) {
      pendingScrollAdjustmentRef.current = null;
      console.error("Error loading earlier messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    conversationId,
    hasMoreMessages,
    loadingMore,
    messages,
    messagesContainerRef,
    pendingScrollAdjustmentRef,
    searchParams,
    setHasMoreMessages,
    setLoadingMore,
    setMessages,
  ]);

  return { loadEarlierMessages };
};

export default useActiveChatConversation;
