import { useQuery } from "@tanstack/react-query";

// Cache key for the current user's conversation list. This is both the fetch
// key and the live cache: the list is seeded from the server, then mutated in
// place via queryClient.setQueryData as socket events arrive. Invalidate this
// key to re-fetch the whole list.
export const conversationsQueryKey = ["chat", "conversations"];

/**
 * The current user's conversation list. The query function is supplied by the
 * caller because the dedupe + last-message-preview hydration it needs lives in
 * Chat.jsx (slated to move into chatHelpers.js with the Tier 2 split). Stays
 * disabled until the user is authenticated.
 */
export const useConversations = (queryFn, enabled) =>
  useQuery({
    queryKey: conversationsQueryKey,
    queryFn,
    enabled,
    // The list is kept current by socket handlers (setQueryData) and explicit
    // refreshes (invalidateQueries) — never by polling. staleTime: Infinity
    // stops the query from refetching on every Chat mount/remount (the /chat ↔
    // /chat/:id routes are separate elements, so auto-select remounts Chat) and
    // on StrictMode's dev double-invoke. Switching chats / navigating back is
    // then served from cache. gcTime stays at the default so a long absence
    // (cache garbage-collected) still gets one fresh fetch on return.
    staleTime: Infinity,
  });
