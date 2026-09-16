import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { messageService } from "../services/messageService";
import { getConversationUpdatedAt } from "../utils/chatHelpers";
import {
  CHAT_SEARCH_PAGE_SIZE,
  CHAT_SEARCH_MAX_MESSAGES_PER_CONVERSATION,
  getConversationSearchKey,
  normalizeChatSearchText,
  countChatSearchMatches,
  buildMessageSearchSnippets,
  buildLatestMatchPreview,
  buildMessagesSearchText,
  buildConversationSearchText,
} from "../utils/chatSearch";

const useChatSearchState = ({
  conversationId,
  conversationType,
  conversations,
  isAuthenticated,
  messages,
  onSearchQueryChange,
}) => {
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatMessageSearchIndex, setChatMessageSearchIndex] = useState({});
  const [chatMessageSearchSnippets, setChatMessageSearchSnippets] = useState({});
  const [searchingChatMessages, setSearchingChatMessages] = useState(false);
  const [searchNoResultsToastQuery, setSearchNoResultsToastQuery] =
    useState(null);
  const searchNoResultsQueryRef = useRef(null);
  const [searchChatVisible, setSearchChatVisible] = useState(false);
  const chatSearchLoadingKeysRef = useRef(new Set());
  // ⚠️ The index holds event sentences as THIS reader sees them, in the active
  // language (D3). Both are therefore part of the index's identity: when either
  // changes, the index is dropped and rebuilt rather than left stale.
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const searchOptions = useMemo(() => ({ viewer: user, t }), [user, t]);

  useEffect(() => {
    setChatMessageSearchIndex({});
    setChatMessageSearchSnippets({});
  }, [i18n.language, user?.id]);

  const normalizedChatSearchQuery = useMemo(
    () => normalizeChatSearchText(chatSearchQuery.trim()),
    [chatSearchQuery],
  );
  const isChatSearchActive = normalizedChatSearchQuery.length > 0;

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
      text: buildMessagesSearchText(allMessages, searchOptions),
      snippets: buildMessageSearchSnippets(allMessages, searchOptions),
    };
  }, [searchOptions]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const key = `${conversationType}:${conversationId}`;
    const activeMessagesSearchText = buildMessagesSearchText(
      messages,
      searchOptions,
    );

    setChatMessageSearchIndex((prev) => ({
      ...prev,
      [key]: normalizeChatSearchText(
        `${prev[key] || ""} ${activeMessagesSearchText}`,
      ),
    }));
    setChatMessageSearchSnippets((prev) => ({
      ...prev,
      [key]: buildMessageSearchSnippets(messages, searchOptions),
    }));
  }, [conversationId, conversationType, messages, searchOptions]);

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
              searchMatchContent: matchedMessageSnippet.content,
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
      .map(({ conversation, searchMatchCount }) => ({
        ...conversation,
        searchMatchCount,
      }));
  }, [
    chatMessageSearchIndex,
    chatMessageSearchSnippets,
    conversations,
    isChatSearchActive,
    normalizedChatSearchQuery,
  ]);

  useEffect(() => {
    if (
      isChatSearchActive &&
      !searchingChatMessages &&
      filteredConversations.length === 0
    ) {
      const query = chatSearchQuery.trim();
      if (searchNoResultsQueryRef.current !== query) {
        searchNoResultsQueryRef.current = query;
        setSearchNoResultsToastQuery(query);
      }
    } else {
      searchNoResultsQueryRef.current = null;
      setSearchNoResultsToastQuery(null);
    }
  }, [
    chatSearchQuery,
    filteredConversations.length,
    isChatSearchActive,
    searchingChatMessages,
  ]);

  useEffect(() => {
    setSearchChatVisible(false);
    onSearchQueryChange?.();
  }, [chatSearchQuery, onSearchQueryChange]);

  const revealSearchChat = useCallback(() => {
    setSearchChatVisible(true);
  }, []);

  const isNoSearchResults =
    isChatSearchActive &&
    !searchingChatMessages &&
    filteredConversations.length === 0;
  const hideChatDuringSearch = isChatSearchActive && !searchChatVisible;
  const totalSearchMatches = isChatSearchActive
    ? filteredConversations.reduce(
        (sum, conversation) => sum + (conversation.searchMatchCount || 0),
        0,
      )
    : 0;

  const chatSearchEmptyState =
    isChatSearchActive && searchingChatMessages
      ? {
          title: "Searching chats...",
          description: `Looking through message history for "${chatSearchQuery.trim()}".`,
          showActions: false,
        }
      : null;

  return {
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
  };
};

export default useChatSearchState;
