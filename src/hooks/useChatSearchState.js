import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useMentionNames } from "../contexts/MentionNamesContext";
import { messageService } from "../services/messageService";
import { resolveRoleNames, resolveTeamNames } from "../utils/chatEntityResolvers";
import { getConversationUpdatedAt } from "../utils/chatHelpers";
import {
  collectMessageSearchPersonIds,
  collectMessageSearchRoleRefs,
  collectMessageSearchTeamIds,
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
  const { user, blockedRelationshipIds, blockedRelationshipNames } = useAuth();
  // 🔴 Why the index needs this at all: an event's stored text carries the name
  // the person had when it was WRITTEN. The four paths that render an event
  // resolve that from the id (FE #664) — this one did not, so a rename made the
  // index disagree with the banner above it: the current name found nothing,
  // the old one found a banner that no longer showed it.
  const { resolveIds } = useMentionNames();
  const searchOptions = useMemo(
    () => ({
      viewer: user,
      t,
      blockedIds: blockedRelationshipIds,
      blockedNames: blockedRelationshipNames,
    }),
    [user, t, blockedRelationshipIds, blockedRelationshipNames],
  );

  useEffect(() => {
    setChatMessageSearchIndex({});
    setChatMessageSearchSnippets({});
    // A new block/unblock changes an event sentence's perspective (D3), same
    // as a language switch — a cached index built before it would keep
    // showing the now-anonymized person's real name.
  }, [i18n.language, user?.id, blockedRelationshipIds, blockedRelationshipNames]);

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

    // ⚠️ Awaited, not fired off. This string is cached per conversation and
    // nothing rebuilds it when the names arrive, so resolving after the build
    // would bake the stored name in for the rest of the session. The map comes
    // back FROM `resolveIds` rather than being read from the hook: this resumes
    // on a microtask, before React has committed the render that carries the
    // resolution, so anything read from a render would be one batch behind.
    const indexedMessages = [
      ...allMessages,
      { content: conversation?.lastMessage?.content ?? conversation?.lastMessage },
      { content: conversation?.last_message?.content ?? conversation?.last_message },
    ];
    // Team and role names the same way: awaited, so the cached string carries
    // the current names (describeEvent reads them from the two registries).
    const [resolvedNames] = await Promise.all([
      resolveIds(collectMessageSearchPersonIds(indexedMessages)),
      resolveTeamNames(collectMessageSearchTeamIds(indexedMessages)),
      resolveRoleNames(
        collectMessageSearchRoleRefs(
          indexedMessages,
          conversation?.type === "team" ? conversation?.id : null,
        ),
      ),
    ]);
    const options = { ...searchOptions, names: resolvedNames };

    return {
      text: buildMessagesSearchText(allMessages, options),
      names: resolvedNames,
      snippets: buildMessageSearchSnippets(allMessages, options),
    };
  }, [resolveIds, searchOptions]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) return undefined;

    const key = `${conversationType}:${conversationId}`;
    // Guards against a superseded run landing last: `messages` changes as
    // history pages in, and the older build must not overwrite the newer one.
    let cancelled = false;

    // Resolve all event and mention ids before publishing a single snapshot.
    // Names are not a dependency: later lookup batches must not rebuild a
    // conversation that has already finished indexing.
    const buildIndex = async () => {
      const [resolvedNames] = await Promise.all([
        resolveIds(collectMessageSearchPersonIds(messages)),
        resolveTeamNames(collectMessageSearchTeamIds(messages)),
        resolveRoleNames(
          collectMessageSearchRoleRefs(
            messages,
            conversationType === "team" ? conversationId : null,
          ),
        ),
      ]);
      if (cancelled) return;

      const options = { ...searchOptions, names: resolvedNames };
      // ⚠️ REPLACES, where this appended to `prev[key]` until 2026-10-06. The
      // string is built from the whole `messages` array every time, so
      // appending added a second copy of everything already indexed on each
      // new message or page of history — inflating `countChatSearchMatches`,
      // the number that orders the conversation list. Its snippet sibling
      // below always replaced; that disagreement is what gave it away.
      const activeMessagesSearchText = buildMessagesSearchText(
        messages,
        options,
      );

      setChatMessageSearchIndex((prev) => ({
        ...prev,
        [key]: { text: activeMessagesSearchText, names: resolvedNames },
      }));
      setChatMessageSearchSnippets((prev) => ({
        ...prev,
        [key]: buildMessageSearchSnippets(messages, options),
      }));
    };

    buildIndex();

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    conversationType,
    messages,
    resolveIds,
    searchOptions,
  ]);

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
            next[result.value.key] = {
              text: result.value.result.text || " ",
              names: result.value.result.names,
            };
            return;
          }

          next[getConversationSearchKey(missingConversations[index])] = { text: " " };
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
        const entry = chatMessageSearchIndex[key];
        const conversationSearchText = buildConversationSearchText(conversation, {
          ...searchOptions,
          names: entry?.names,
        });
        const messageSearchText = entry?.text || "";
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
    searchOptions,
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
