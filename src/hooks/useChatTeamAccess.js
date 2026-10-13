import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { fetchTeamById } from "./useTeamQueries";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";
import {
  isUserTeamMember,
  mergeTeamDetailsIntoConversationData,
  isArchivedTeamData,
} from "../utils/chatHelpers";

// How often the active team chat re-checks membership. The socket is the
// primary signal, so a live connection only needs a slow safety net; without
// one the poll goes back to being the only way a revocation is noticed.
const CONNECTED_MEMBERSHIP_POLL_MS = 60000;
const DISCONNECTED_MEMBERSHIP_POLL_MS = 10000;

// Team-chat access + membership helpers extracted from Chat.jsx (Stage 5a).
// Owns team-details fetching, access revocation, live membership refresh, and
// conversation hydration. These helpers are consumed both here (send/edit/delete
// handlers) and by useActiveChatConversation / useChatSocketEvents, so keeping
// them in one hook untangles the previous Chat.jsx -> hooks prop wiring.
const useChatTeamAccess = ({
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
}) => {
  const { t } = useTranslation();

  const fetchTeamDetails = useCallback(
    (teamId, { force = false } = {}) => {
      if (!teamId) return Promise.resolve(null);
      // React Query handles caching and in-flight request dedup that this
      // component used to track by hand (see fetchTeamById).
      return fetchTeamById(queryClient, teamId, { force });
    },
    [queryClient],
  );

  // The default is worded here rather than left to the caller: every call site
  // that omits `message` means the same thing, and the English literal that used
  // to sit in this signature reached a German screen.
  const revokeTeamChatAccess = useCallback(
    (teamId, message) => {
      if (!teamId) return;

      const text = message ?? t("chatPage.errors.noTeamChatAccess");

      socketService.leaveConversation(teamId, "team");
      setError(text);
      setConversations((prev) =>
        prev.filter(
          (conversation) =>
            !(
              conversation.type === "team" &&
              String(conversation.id) === String(teamId)
            ),
        ),
      );

      const activeTeamId =
        activeConversationRef.current?.team?.id ?? activeConversationRef.current?.id;

      if (
        String(activeTeamId) === String(teamId) ||
        (String(conversationId) === String(teamId) &&
          (searchParams.get("type") || "direct") === "team")
      ) {
        setActiveConversation(null);
        setMessages([]);
        clearTypingUsers();
        setReplyingTo(null);
        setHighlightMessageIds([]);
        setHasMoreMessages(false);
        setShowChatView(false);
        navigate("/chat", { replace: true });
      }
    },
    [
      activeConversationRef,
      clearTypingUsers,
      conversationId,
      navigate,
      searchParams,
      setActiveConversation,
      setConversations,
      setError,
      setHasMoreMessages,
      setHighlightMessageIds,
      setMessages,
      setReplyingTo,
      setShowChatView,
      t,
    ],
  );

  const refreshActiveTeamMembership = useCallback(
    async (teamId) => {
      if (!teamId || !user?.id) return true;

      let teamPayload = null;

      try {
        const conversationResponse = await messageService.getConversationById(
          teamId,
          "team",
        );
        teamPayload = conversationResponse?.data?.team || null;
      } catch (conversationError) {
        if (
          conversationError.response?.status === 404 ||
          conversationError.response?.status === 403
        ) {
          revokeTeamChatAccess(teamId);
          return false;
        }

        throw conversationError;
      }

      if (!Array.isArray(teamPayload?.members)) {
        try {
          teamPayload = await fetchTeamDetails(teamId, { force: true });
        } catch (teamError) {
          if (teamError.response?.status === 404 && isArchivedTeamData(teamPayload)) {
            return true;
          }

          throw teamError;
        }
      }

      if (!isUserTeamMember(teamPayload.members, user.id)) {
        revokeTeamChatAccess(teamId);
        return false;
      }

      setActiveConversation((prev) => {
        if (
          !prev ||
          prev.type !== "team" ||
          String(prev.team?.id ?? prev.id) !== String(teamId)
        ) {
          return prev;
        }

        return {
          ...prev,
          team: mergeTeamDetailsIntoConversationData(prev, teamPayload).team,
        };
      });

      return true;
    },
    [fetchTeamDetails, revokeTeamChatAccess, setActiveConversation, user?.id],
  );

  const hydrateTeamConversationDetails = useCallback(
    async (conversationDetails, teamId) => {
      if (!conversationDetails?.data || !teamId) return false;

      if (isArchivedTeamData(conversationDetails.data.team)) {
        setIsTeamArchived(true);

        if (Array.isArray(conversationDetails.data.team?.members)) {
          if (!isUserTeamMember(conversationDetails.data.team.members, user?.id)) {
            revokeTeamChatAccess(teamId);
            setLoadingMessages(false);
            return true;
          }
        }

        return false;
      }

      try {
        const teamPayload = await fetchTeamDetails(teamId);

        setIsTeamArchived(isArchivedTeamData(teamPayload));

        if (Array.isArray(teamPayload?.members)) {
          if (!isUserTeamMember(teamPayload.members, user?.id)) {
            revokeTeamChatAccess(teamId);
            setLoadingMessages(false);
            return true;
          }

          conversationDetails.data = mergeTeamDetailsIntoConversationData(
            conversationDetails.data,
            teamPayload,
          );
        }
      } catch (teamError) {
        console.error("Error fetching team member details:", teamError);
      }

      return false;
    },
    [
      fetchTeamDetails,
      revokeTeamChatAccess,
      setIsTeamArchived,
      setLoadingMessages,
      user?.id,
    ],
  );

  useEffect(() => {
    if (
      conversationType !== "team" ||
      !activeConversation?.team?.id ||
      !user?.id
    ) {
      return undefined;
    }

    const teamId = activeConversation.team.id;
    let cancelled = false;
    let lastCheckedAt = 0;

    const checkMembership = async () => {
      lastCheckedAt = Date.now();

      try {
        if (!cancelled) {
          await refreshActiveTeamMembership(teamId);
        }
      } catch (err) {
        console.error("Error checking active team chat access:", err);
      }
    };

    // Membership loss already arrives over the socket (team:member_kicked is
    // emitted straight to the removed user, team:member_left to the team room),
    // and every send/edit/delete re-checks access before acting. This poll is
    // the fallback for events missed while the socket was down, so it only
    // needs to run often when there is no socket to miss them on.
    const tick = () => {
      const connected = socketService.getSocket()?.connected ?? false;
      const dueAfter = connected
        ? CONNECTED_MEMBERSHIP_POLL_MS
        : DISCONNECTED_MEMBERSHIP_POLL_MS;

      if (Date.now() - lastCheckedAt >= dueAfter) {
        checkMembership();
      }
    };

    checkMembership();
    // Ticking at the shorter cadence keeps the poll responsive to the socket
    // dropping; the tick itself is a timestamp comparison and does not fetch.
    const intervalId = window.setInterval(
      tick,
      DISCONNECTED_MEMBERSHIP_POLL_MS,
    );

    const handleFocus = () => {
      checkMembership();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [
    activeConversation?.team?.id,
    conversationType,
    refreshActiveTeamMembership,
    user?.id,
  ]);

  return {
    revokeTeamChatAccess,
    refreshActiveTeamMembership,
    hydrateTeamConversationDetails,
  };
};

export default useChatTeamAccess;
