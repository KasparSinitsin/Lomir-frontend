import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import socketService from "../services/socketService";
import { userService } from "../services/userService";
import {
  resolveTypingUserId,
  resolveTypingDisplayName,
  resolveConversationUser,
} from "../utils/chatHelpers";
import { formatDisplayName } from "../utils/nameFormatters";
import { isConversation } from "../utils/conversationIdentity";

const useChatTyping = ({
  conversationId,
  conversationType = "direct",
  currentUser,
  activeConversation,
}) => {
  const [typingUsers, setTypingUsers] = useState({});
  const [resolvedUsers, setResolvedUsers] = useState({});
  const typingTimeoutRef = useRef(null);

  const clearTypingUsers = useCallback(() => {
    setTypingUsers({});
  }, []);

  const handleTyping = useCallback(
    (isTyping, type = "direct") => {
      if (!conversationId) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTyping) {
        socketService.sendTypingStart(conversationId, type, {
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
          username: currentUser?.username,
        });
        typingTimeoutRef.current = setTimeout(() => {
          socketService.sendTypingStop(conversationId, type);
        }, 3000);
      } else {
        socketService.sendTypingStop(conversationId, type);
      }
    },
    [
      conversationId,
      currentUser?.firstName,
      currentUser?.lastName,
      currentUser?.username,
    ],
  );

  const handleTypingUpdate = useCallback(
    async (data) => {
      if (
        !isConversation(
          { type: data.type, id: data.conversationId },
          conversationType,
          conversationId,
        )
      ) {
        return;
      }

      const typingUserId = resolveTypingUserId(data);
      if (!typingUserId) {
        return;
      }

      let displayName = resolveTypingDisplayName(data) || "User";
      const conversationUser = resolveConversationUser(
        activeConversation,
        typingUserId,
      );

      if (conversationUser) {
        displayName = formatDisplayName(conversationUser);
      } else if (resolvedUsers[typingUserId]) {
        displayName = formatDisplayName(resolvedUsers[typingUserId]);
      } else if (data.isTyping) {
        try {
          const userData = await userService.getUserById(typingUserId);
          setResolvedUsers((prev) => ({ ...prev, [typingUserId]: userData }));
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
    },
    [activeConversation, conversationId, conversationType, resolvedUsers],
  );

  const activeTypingUsers = useMemo(
    () =>
      Object.entries(typingUsers)
        .filter(
          ([userId, username]) =>
            String(userId) !== String(currentUser?.id) && username,
        )
        .map(([, username]) => username),
    [currentUser?.id, typingUsers],
  );

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    },
    [],
  );

  return {
    activeTypingUsers,
    clearTypingUsers,
    handleTyping,
    handleTypingUpdate,
    typingUsers,
  };
};

export default useChatTyping;
