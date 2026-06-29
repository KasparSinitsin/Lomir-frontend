import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  formatLocalTime,
  formatDateHeading as formatMessageDateHeading,
  getDateGroupKey,
} from "../../utils/dateHelpers";
import {
  getTeamInitials,
  isSyntheticTeam,
} from "../../utils/userHelpers";
import {
  UserPlus,
  UserMinus,
  LogOut,
  PartyPopper,
  Crown,
  Shield,
  User,
  UserCheck,
  UserSearch,
  CircleX,
  FileText,
  Download,
  AlertTriangle,
  Clock,
  Trash2,
  Pencil,
  Reply,
  X,
  Check,
} from "lucide-react";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import VacantRoleDetailsModal from "../teams/VacantRoleDetailsModalLazy";
import UserDetailsModal from "../users/UserDetailsModal";
import UserAvatar from "../users/UserAvatar";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { userService } from "../../services/userService";
import { vacantRoleService } from "../../services/vacantRoleService";
import { getFileExpirationStatus } from "../../utils/fileExpiration";
import MessageText from "./MessageText";
import ReadReceipt from "./ReadReceipt";
import FileAttachment from "./FileAttachment";
import { createEventRenderers } from "./messageEventRenderers";
import Tooltip from "../common/Tooltip";
import {
  DELETED_USER_DISPLAY_NAME,
  getDisplayName as getDeletedUserDisplayName,
} from "../../utils/deletedUser";
import {
  getCachedChatTeamProfile,
  getCachedChatUserProfile,
  getTeamAvatarUrl,
  mergeResolvedTeamData,
  mergeResolvedUserData,
} from "../../utils/chatEntityResolvers";
import { parseSystemMessage } from "../../utils/messageSystemParser";
import {
  getEventReactionPreview,
  formatReplyTooltipText,
  getFileIcon,
} from "../../utils/messageDisplayHelpers";
import {
  renderReplyContent,
  renderHighlightedSearchText,
} from "../../utils/messageDisplayRenderers";

const MessageDisplay = ({
  messages,
  currentUserId,
  conversationPartner,
  teamData,
  loading,
  typingUsers = [],
  conversationType = "direct",
  teamMembers = [],
  highlightMessageIds = [],
  hasMoreMessages = false,
  loadingMore = false,
  teamMembersRefreshSignal = null,
  onLoadEarlierMessages,
  onDeleteMessage,
  onEditMessage,
  onReply,
  onConversationHeaderVisibilityChange,
  searchQuery = "",
}) => {
  const messagesEndRef = useRef(null);
  const highlightedMessageRef = useRef(null);
  const [conversationHeaderElement, setConversationHeaderElement] =
    useState(null);
  const previousMessageSnapshotRef = useRef({
    firstMessageId: null,
    lastMessageId: null,
    length: 0,
  });

  // State for team details modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamMembersRefreshKey, setTeamMembersRefreshKey] = useState(0);

  // State for user details modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRoleData, setSelectedRoleData] = useState(null);

  // Mention lookup (frontend-only)
  const [resolvingName, setResolvingName] = useState(false);
  const [nameResolveError, setNameResolveError] = useState(null);

  const [nameToIdCache, setNameToIdCache] = useState({});
  const [resolvedChatUsers, setResolvedChatUsers] = useState({});
  const [resolvedChatTeams, setResolvedChatTeams] = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingError, setEditingError] = useState(null);
  const [savingEditMessageId, setSavingEditMessageId] = useState(null);
  const messagesById = useMemo(() => {
    const map = new Map();

    messages.forEach((message) => {
      if (message?.id != null) {
        map.set(String(message.id), message);
      }
    });

    return map;
  }, [messages]);

  const highlightEventContent = useCallback(
    (node) => {
      if (node == null || typeof node === "boolean") return node;
      if (typeof node === "string" || typeof node === "number") {
        return renderHighlightedSearchText(node, searchQuery);
      }
      if (Array.isArray(node)) {
        return node.map((child, index) => (
          <React.Fragment key={index}>
            {highlightEventContent(child)}
          </React.Fragment>
        ));
      }
      if (React.isValidElement(node)) {
        const children = node.props?.children;
        if (children == null) return node;
        return React.cloneElement(node, {
          children: highlightEventContent(children),
        });
      }
      return node;
    },
    [searchQuery],
  );

  const setConversationHeaderRef = useCallback((node) => {
    setConversationHeaderElement(node);
  }, []);

  useEffect(() => {
    if (!onConversationHeaderVisibilityChange) return undefined;

    if (!conversationHeaderElement) {
      onConversationHeaderVisibilityChange(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        onConversationHeaderVisibilityChange(
          entry.isIntersecting && entry.intersectionRatio > 0,
        );
      },
      {
        threshold: [0, 0.01, 1],
      },
    );

    observer.observe(conversationHeaderElement);
    return () => observer.disconnect();
  }, [conversationHeaderElement, onConversationHeaderVisibilityChange]);

  const startEditingMessage = (message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content || "");
    setEditingError(null);
  };

  const cancelEditingMessage = () => {
    if (savingEditMessageId) return;
    setEditingMessageId(null);
    setEditingContent("");
    setEditingError(null);
  };

  const saveEditingMessage = async (messageId) => {
    const nextContent = editingContent.trim();

    if (!nextContent) {
      setEditingError("Message cannot be empty.");
      return;
    }

    try {
      setSavingEditMessageId(messageId);
      setEditingError(null);
      await onEditMessage(messageId, nextContent);
      setEditingMessageId(null);
      setEditingContent("");
    } catch (err) {
      setEditingError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not save your edit.",
      );
    } finally {
      setSavingEditMessageId(null);
    }
  };

  const isMessageEdited = (message) =>
    Boolean(
      message?.isEdited ||
        message?.is_edited ||
        message?.editedAt ||
        message?.edited_at,
    );

  const getMessageDisplayTime = (message) =>
    isMessageEdited(message)
      ? message?.editedAt ||
        message?.edited_at ||
        message?.updatedAt ||
        message?.updated_at ||
        message?.createdAt
      : message?.createdAt;

  const getDisplayName = (userData) => {
    if (!userData) return "";
    const first = userData.firstName ?? userData.first_name;
    const last = userData.lastName ?? userData.last_name;
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    return userData.username ?? "";
  };

  const formatReadByTooltip = (names) => {
    const uniqueNames = [...new Set((names || []).filter(Boolean))];
    if (uniqueNames.length === 0) return "Read.";
    if (uniqueNames.length === 1) return `Read by ${uniqueNames[0]}.`;
    if (uniqueNames.length === 2) {
      return `Read by ${uniqueNames[0]} and ${uniqueNames[1]}.`;
    }

    const lastName = uniqueNames[uniqueNames.length - 1];
    const leadingNames = uniqueNames.slice(0, -1).join(", ");
    return `Read by ${leadingNames} and ${lastName}.`;
  };

  const getReadByTooltip = (message) => {
    if (conversationType === "team") {
      const readByUsers = message.readByUsers ?? message.read_by_users ?? [];
      return formatReadByTooltip(readByUsers.map(getDisplayName));
    }

    return formatReadByTooltip([getDisplayName(resolvedConversationPartner)]);
  };

  useEffect(() => {
    const previousSnapshot = previousMessageSnapshotRef.current;
    const currentSnapshot = {
      firstMessageId: messages[0]?.id ?? null,
      lastMessageId: messages[messages.length - 1]?.id ?? null,
      length: messages.length,
    };

    const isLoadingEarlierMessages =
      currentSnapshot.length > previousSnapshot.length &&
      previousSnapshot.length > 0 &&
      currentSnapshot.firstMessageId !== previousSnapshot.firstMessageId &&
      currentSnapshot.lastMessageId === previousSnapshot.lastMessageId;

    previousMessageSnapshotRef.current = currentSnapshot;

    if (isLoadingEarlierMessages) return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Scroll to first highlighted (unread) message
  useEffect(() => {
    if (highlightMessageIds.length > 0 && highlightedMessageRef.current) {
      const timer = setTimeout(() => {
        highlightedMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightMessageIds]);

  useEffect(() => {
    const openTeamModalId =
      conversationType === "team" ? teamData?.id : selectedTeamId;

    if (
      !teamMembersRefreshSignal?.teamId ||
      !isTeamModalOpen ||
      String(openTeamModalId) !== String(teamMembersRefreshSignal.teamId)
    ) {
      return;
    }

    setTeamMembersRefreshKey((prev) => prev + 1);
  }, [
    conversationType,
    isTeamModalOpen,
    selectedTeamId,
    teamData?.id,
    teamMembersRefreshSignal,
  ]);

  useEffect(() => {
    const userIdsToFetch = [];

    if (
      conversationPartner?.id != null &&
      !conversationPartner?.isDeletedUser &&
      (!(conversationPartner?.avatar_url || conversationPartner?.avatarUrl) ||
        (conversationPartner?.is_synthetic == null &&
          conversationPartner?.isSynthetic == null))
    ) {
      userIdsToFetch.push(conversationPartner.id);
    }

    (teamMembers || []).forEach((member) => {
      const memberId = member?.user_id ?? member?.userId ?? null;
      if (memberId == null) return;

      if (
        !(member?.avatar_url || member?.avatarUrl) ||
        (member?.is_synthetic == null && member?.isSynthetic == null)
      ) {
        userIdsToFetch.push(memberId);
      }
    });

    const uniqueUserIds = [...new Set(userIdsToFetch)];

    if (uniqueUserIds.length === 0) {
      return undefined;
    }

    let cancelled = false;

    Promise.allSettled(
      uniqueUserIds.map(async (userId) => ({
        userId,
        profile: await getCachedChatUserProfile(userId),
      })),
    ).then((results) => {
      if (cancelled) return;

      const fetchedProfiles = {};

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        fetchedProfiles[String(result.value.userId)] = result.value.profile;
      });

      if (Object.keys(fetchedProfiles).length > 0) {
        setResolvedChatUsers((prev) => ({
          ...prev,
          ...fetchedProfiles,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [conversationPartner, teamMembers]);

  useEffect(() => {
    const teamId = teamData?.id;

    if (
      teamId == null ||
      (getTeamAvatarUrl(teamData) &&
        (teamData?.is_synthetic != null || teamData?.isSynthetic != null))
    ) {
      return undefined;
    }

    let cancelled = false;

    getCachedChatTeamProfile(teamId)
      .then((profile) => {
        if (!cancelled) {
          setResolvedChatTeams((prev) => ({
            ...prev,
            [String(teamId)]: profile,
          }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [teamData]);

  // Handle team avatar/name click
  const handleTeamClick = () => {
    if (conversationType !== "team") return;
    if (!teamData?.id) return;
    setIsTeamModalOpen(true);
  };

  // Handle closing the team details modal
  const handleTeamModalClose = () => {
    setIsTeamModalOpen(false);
    setSelectedTeamId(null);
  };

  // -----------------------
  // Mention lookup helpers
  // -----------------------
  const normalizeName = (s = "") =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/\s+/g, " ");

  // Handle user avatar/name click
  const handleUserClick = (userId, knownName = null) => {
    if (!userId) return;

    // Cache if we know a display name
    if (knownName) {
      setNameToIdCache((prev) => ({
        ...prev,
        [normalizeName(knownName)]: userId,
      }));
    }

    setSelectedUserId(userId);
    setIsUserModalOpen(true);
  };

  // Handle closing the user details modal
  const handleUserModalClose = () => {
    setIsUserModalOpen(false);
    setSelectedUserId(null);
  };

  const handleRoleModalClose = () => {
    setIsRoleModalOpen(false);
    setSelectedRoleData(null);
  };

  const resolvedConversationPartner = mergeResolvedUserData(
    conversationPartner,
    conversationPartner?.id != null
      ? resolvedChatUsers[String(conversationPartner.id)]
      : null,
  );

  const resolvedTeamData = mergeResolvedTeamData(
    teamData,
    teamData?.id != null ? resolvedChatTeams[String(teamData.id)] : null,
  );

  const getResolvedUserData = (userData, userId = null) =>
    mergeResolvedUserData(
      userData,
      userId != null ? resolvedChatUsers[String(userId)] : null,
    );

  const getTeamMemberFullName = (m) => {
    const first = m.first_name ?? m.firstName;
    const last = m.last_name ?? m.lastName;
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    return m.username ?? "";
  };

  const resolveUserIdFromTeamMembers = (name) => {
    const target = normalizeName(name);
    if (!target) return null;

    const match = (teamMembers || []).find((m) => {
      const full = getTeamMemberFullName(m);
      return normalizeName(full) === target;
    });

    return match?.user_id ?? match?.userId ?? null;
  };

  const resolveUserIdByName = async (name) => {
    // 1) best: teamMembers (team chat)
    const cached = nameToIdCache[normalizeName(name)];
    if (cached) return cached;

    const fromTeam = resolveUserIdFromTeamMembers(name);
    if (fromTeam) return fromTeam;

    // 2) fallback: backend search
    const res = await userService.searchUsers(name);
    const users = res?.data?.data?.users || [];

    if (users.length === 1) return users[0].id;

    // try exact match when multiple results
    const target = normalizeName(name);
    const exact = users.find((u) => {
      const full =
        u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username;
      return normalizeName(full) === target;
    });

    return exact?.id ?? null;
  };

  const handleMentionClick = async (name) => {
    const safe = (name || "").trim().replace(/\s+/g, " ");

    if (!safe) return;

    try {
      setNameResolveError(null);
      setResolvingName(true);

      const userId = await resolveUserIdByName(safe);

      if (!userId) {
        setNameResolveError(`Could not open "${safe}" (user not found).`);
        return;
      }

      handleUserClick(userId, safe);
    } catch (err) {
      console.error("Error resolving user by name:", err);
      setNameResolveError(`Could not look up "${safe}".`);
    } finally {
      setResolvingName(false);
    }
  };

  const Mention = ({ name }) => {
    const safe = (name || "").trim();
    if (!safe) return null;
    if (safe === DELETED_USER_DISPLAY_NAME) {
      return (
        <span className="font-medium text-base-content/50">
          {renderHighlightedSearchText(safe, searchQuery)}
        </span>
      );
    }

    return (
      <Tooltip content={`Open ${safe}`} position="top">
        <button
          type="button"
          className="font-medium underline underline-offset-2 hover:no-underline hover:text-primary transition-colors"
          onClick={() => handleMentionClick(safe)}
          disabled={resolvingName}
        >
          {renderHighlightedSearchText(safe, searchQuery)}
        </button>
      </Tooltip>
    );
  };

  const MentionById = ({ userId, name }) => {
    const safeName = (name || "").trim() || "User";
    if (!userId) {
      return safeName === DELETED_USER_DISPLAY_NAME ? (
        <span className="font-medium text-base-content/50">
          {renderHighlightedSearchText(safeName, searchQuery)}
        </span>
      ) : (
        <Mention name={safeName} />
      );
    }

    return (
      <Tooltip content={`Open ${safeName}`} position="top">
        <button
          type="button"
          className="font-medium underline underline-offset-2 hover:no-underline hover:text-primary transition-colors"
          onClick={() => handleUserClick(userId, safeName)}
        >
          {renderHighlightedSearchText(safeName, searchQuery)}
        </button>
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading loading-spinner loading-md text-primary"></div>
      </div>
    );
  }

  const openTeamModal = (teamId) => {
    if (!teamId) return;
    setSelectedTeamId(teamId);
    setIsTeamModalOpen(true);
  };

  const TeamMentionById = ({ teamId, name }) => {
    const safeName = (name || "").trim() || "Team";

    // legacy / missing id => non-clickable fallback
    if (!teamId) {
      return (
        <span className="font-medium">
          "{renderHighlightedSearchText(safeName, searchQuery)}"
        </span>
      );
    }

    return (
      <Tooltip content={`Open ${safeName}`} position="top">
        <button
          type="button"
          className="font-medium underline underline-offset-2 hover:no-underline hover:text-primary transition-colors"
          onClick={() => openTeamModal(teamId)}
        >
          "{renderHighlightedSearchText(safeName, searchQuery)}"
        </button>
      </Tooltip>
    );
  };

  const normalizeRoleLookupValue = (value) =>
    String(value ?? "").trim().toLowerCase();

  const getRoleName = (role) =>
    role?.roleName ?? role?.role_name ?? role?.name ?? role?.title ?? "";

  const getRoleFilledUserId = (role) =>
    role?.filledByUser?.id ??
    role?.filled_by_user?.id ??
    role?.filledByUserId ??
    role?.filled_by_user_id ??
    role?.filledBy ??
    role?.filled_by ??
    null;

  const getRoleFilledUserName = (role) => {
    const user = role?.filledByUser ?? role?.filled_by_user ?? {};
    const firstName =
      user.firstName ?? user.first_name ?? role?.filledByUserFirstName ?? role?.filled_by_user_first_name ?? "";
    const lastName =
      user.lastName ?? user.last_name ?? role?.filledByUserLastName ?? role?.filled_by_user_last_name ?? "";
    const fullName = `${firstName} ${lastName}`.trim();
    return (
      fullName ||
      user.username ||
      role?.filledByUserUsername ||
      role?.filled_by_user_username ||
      ""
    );
  };

  const findMatchingRole = (
    roles,
    { roleId, roleName, filledUserId, filledUserName },
  ) => {
    const normalizedRoleName = normalizeRoleLookupValue(roleName);
    const normalizedFilledUserName = normalizeRoleLookupValue(filledUserName);
    const candidates = (roles || []).filter((role) => {
      if (roleId != null && String(role?.id) === String(roleId)) return true;

      return (
        normalizedRoleName &&
        normalizeRoleLookupValue(getRoleName(role)) === normalizedRoleName
      );
    });

    if (candidates.length === 0) return null;

    const matchingFilledRole = candidates.find((role) => {
      const isFilled = normalizeRoleLookupValue(role?.status) === "filled";
      if (!isFilled) return false;

      const roleFilledUserId = getRoleFilledUserId(role);
      if (
        filledUserId != null &&
        roleFilledUserId != null &&
        String(roleFilledUserId) === String(filledUserId)
      ) {
        return true;
      }

      if (normalizedFilledUserName) {
        return (
          normalizeRoleLookupValue(getRoleFilledUserName(role)) ===
          normalizedFilledUserName
        );
      }

      return true;
    });

    if (matchingFilledRole) return matchingFilledRole;

    const openRole = candidates.find(
      (role) => normalizeRoleLookupValue(role?.status) === "open",
    );

    return openRole ?? candidates[0];
  };

  const openRoleModal = async ({
    roleId = null,
    roleName,
    filledUserId = null,
    filledUserName = null,
    filledAt = null,
  }) => {
    const safeName = (roleName || "").trim();
    if (!safeName && !roleId) return;

    const teamId = resolvedTeamData?.id ?? teamData?.id ?? null;
    const teamName = resolvedTeamData?.name ?? teamData?.name ?? null;
    const safeFilledUserName = (filledUserName || "").trim();
    const fallbackStatus =
      filledUserId || safeFilledUserName || filledAt ? "filled" : "open";
    const filledUser =
      filledUserId || safeFilledUserName
        ? {
            id: filledUserId,
            username: safeFilledUserName || undefined,
          }
        : null;

    const fallbackRole = {
      id: roleId,
      roleName: safeName || "Vacant Role",
      role_name: safeName || "Vacant Role",
      status: fallbackStatus,
      teamId,
      team_id: teamId,
      teamName,
      team_name: teamName,
      filledAt,
      filled_at: filledAt,
      filledBy: filledUserId,
      filled_by: filledUserId,
      filledByUserId: filledUserId,
      filled_by_user_id: filledUserId,
      filledByUser: filledUser,
      filled_by_user: filledUser,
    };

    let resolvedRole = fallbackRole;

    if (teamId) {
      try {
        if (roleId) {
          const response = await vacantRoleService.getVacantRoleById(
            teamId,
            roleId,
          );
          resolvedRole = response?.data ?? response ?? fallbackRole;
        } else {
          const response = await vacantRoleService.getVacantRoles(teamId, "all");
          const roles = response?.data ?? response ?? [];
          resolvedRole =
            findMatchingRole(roles, {
              roleId,
              roleName: safeName,
              filledUserId,
              filledUserName: safeFilledUserName,
            }) ?? fallbackRole;
        }
      } catch (error) {
        console.warn("Could not fetch role details for chat event:", error);
      }
    }

    setSelectedRoleData({
      ...fallbackRole,
      ...resolvedRole,
      status: resolvedRole?.status ?? fallbackRole.status,
    });
    setIsRoleModalOpen(true);
  };

  const RoleMentionById = ({
    roleId = null,
    name,
    filledUserId = null,
    filledUserName = null,
    filledAt = null,
  }) => {
    const safeName = (name || "").trim() || "Role";

    return (
      <Tooltip content={`Open ${safeName}`} position="top">
        <button
          type="button"
          className="font-medium underline underline-offset-2 hover:no-underline hover:opacity-80 transition-opacity"
          onClick={() =>
            openRoleModal({
              roleId,
              roleName: safeName,
              filledUserId,
              filledUserName,
              filledAt,
            })
          }
        >
          {renderHighlightedSearchText(safeName, searchQuery)}
        </button>
      </Tooltip>
    );
  };

  const isCurrentUserTeamMember = () => {
    if (conversationType !== "team" || currentUserId == null) return false;

    const members = [
      ...(teamMembers || []),
      ...(resolvedTeamData?.members || []),
      ...(teamData?.members || []),
    ];

    return members.some((member) => {
      const memberUser = member?.user || member;
      const memberId =
        memberUser?.id ??
        memberUser?.userId ??
        memberUser?.user_id ??
        member?.userId ??
        member?.user_id ??
        member?.id ??
        null;
      return memberId != null && String(memberId) === String(currentUserId);
    });
  };

  const isCurrentViewer = (userId) =>
    userId != null &&
    currentUserId != null &&
    String(userId) === String(currentUserId);

  const userMentionOrYou = (userId, name, { capitalized = false } = {}) => {
    if (isCurrentViewer(userId)) return capitalized ? "You" : "you";

    return userId ? (
      <MentionById userId={userId} name={name} />
    ) : (
      <Mention name={name} />
    );
  };

  const possessiveUserMentionOrYour = (userId, name) => {
    if (isCurrentViewer(userId)) return "Your";

    return (
      <>
        {userMentionOrYou(userId, name)}
        {"'s"}
      </>
    );
  };

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    const date = getDateGroupKey(message.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Format date heading
  const formatDateHeading = (dateString) => formatMessageDateHeading(dateString);

  // Get sender info from team members or message data
  const getSenderInfo = (senderId, message = null) => {
    if (conversationType === "team" && teamMembers.length > 0) {
      const member = teamMembers.find(
        (m) =>
          m.user_id === senderId ||
          m.userId === senderId ||
          String(m.user_id) === String(senderId) ||
          String(m.userId) === String(senderId),
      );

      if (member) {
        return getResolvedUserData(
          {
          id: member.user_id || member.userId || senderId,
          username: member.username,
          firstName: member.first_name || member.firstName,
          lastName: member.last_name || member.lastName,
          avatarUrl: member.avatar_url || member.avatarUrl,
          isSynthetic:
            member.isSynthetic ?? member.is_synthetic ?? undefined,
          is_synthetic:
            member.is_synthetic ?? member.isSynthetic ?? undefined,
          isCurrentMember: true,
          isDeletedUser: false,
          },
          member.user_id || member.userId || senderId,
        );
      }
    }

    if (resolvedConversationPartner && senderId === resolvedConversationPartner.id) {
      return {
        ...resolvedConversationPartner,
        isCurrentMember: true,
        isDeletedUser: false,
      };
    }

    // Fallback: Use sender info embedded in the message (for former team members)
    if (message && conversationType === "team") {
      const embeddedSender = {
        id: message.senderId ?? message.sender_id ?? senderId ?? null,
        userId: message.senderId ?? message.sender_id ?? senderId ?? null,
        username: message.senderUsername ?? message.sender_username ?? null,
        firstName:
          message.senderFirstName ?? message.sender_first_name ?? null,
        lastName: message.senderLastName ?? message.sender_last_name ?? null,
        avatarUrl: message.senderAvatarUrl ?? message.sender_avatar_url ?? null,
        isCurrentMember: message.isCurrentMember === true,
      };
      const hasMessageSenderInfo =
        embeddedSender.username ||
        embeddedSender.firstName ||
        embeddedSender.lastName ||
        embeddedSender.avatarUrl;
      const isDeletedSender =
        embeddedSender.id == null || !embeddedSender.username;

      if (hasMessageSenderInfo || isDeletedSender) {
        return getResolvedUserData(
          {
            ...embeddedSender,
            isDeletedUser: isDeletedSender,
          },
          embeddedSender.id,
        );
      }
    }

    return null;
  };

  // Get display name with former member indicator
  const getSenderDisplayName = (senderInfo, includeFormerLabel = true) => {
    if (!senderInfo || senderInfo.isDeletedUser) {
      return DELETED_USER_DISPLAY_NAME;
    }

    let name = getDeletedUserDisplayName(senderInfo, "Unknown");

    // Add "(former team member)" suffix if they're no longer a member
    if (includeFormerLabel && senderInfo.isCurrentMember === false) {
      name += " (former team member)";
    }
    return name;
  };

  // Render avatar (optionally clickable) - with former member handling
  const renderAvatar = (senderInfo, clickable = false, userId = null) => {
    if (!senderInfo) return null;

    const isFormerMember = senderInfo.isCurrentMember === false;
    const isDeletedSender = senderInfo.isDeletedUser === true;
    const isClickable = clickable && userId && !isDeletedSender;
    const handleClick = isClickable ? () => handleUserClick(userId) : undefined;

    if (isDeletedSender) {
      return (
        <Tooltip content={DELETED_USER_DISPLAY_NAME} wrapperClassName="inline-flex flex-shrink-0 mr-2">
          <UserAvatar
            user={senderInfo}
            deleted
            sizeClass="w-8 h-8"
            iconSize={16}
          />
        </Tooltip>
      );
    }

    if (!isFormerMember) {
      return (
        <Tooltip
          content={isClickable ? `View ${getSenderDisplayName(senderInfo, false)} details` : undefined}
          wrapperClassName="inline-flex flex-shrink-0 mr-2"
        >
          <UserAvatar
            user={senderInfo}
            sizeClass="w-8 h-8"
            clickable={Boolean(isClickable)}
            onClick={handleClick}
            iconSize={16}
            initialsClassName="text-sm font-medium event-message-text"
            showDemoOverlay
            demoOverlayTextClassName="text-[5px]"
            demoOverlayTextTranslateClassName="-translate-y-[1px]"
          />
        </Tooltip>
      );
    }

    const formerMemberTooltip = isClickable
      ? `View ${getSenderDisplayName(senderInfo, false)} details`
      : isFormerMember
        ? "Former team member"
        : undefined;

    return (
      <Tooltip content={formerMemberTooltip} wrapperClassName="inline-flex flex-shrink-0 mr-2">
      <div
        className={`avatar ${
          isClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
        } ${isFormerMember ? "opacity-70" : ""}`}
        onClick={handleClick}
      >
        <div className="w-8 h-8 rounded-full relative">
          <div
            className="avatar-fallback bg-base-300 text-base-content/60 flex items-center justify-center w-full h-full rounded-full absolute inset-0"
          >
            <span className="text-sm font-medium event-message-text">
              FM
            </span>
          </div>
        </div>
      </div>
      </Tooltip>
    );
  };

  const renderSenderName = (senderInfo, senderId, className = "") => {
    if (!senderInfo) return null;

    const displayName = getSenderDisplayName(senderInfo);
    const isDeletedSender = senderInfo.isDeletedUser === true;
    const isFormerMember = senderInfo.isCurrentMember === false;
    const canClick = Boolean(!isDeletedSender && senderId);

    return (
      <Tooltip
        content={canClick ? `View ${getSenderDisplayName(senderInfo, false)} details` : undefined}
        position="top"
      >
        <div
          className={[
            className,
            canClick ? "cursor-pointer hover:text-primary transition-colors" : "",
            isDeletedSender ? "text-base-content/50" : "",
          ].join(" ")}
          style={
            isDeletedSender
              ? undefined
              : {
                  color: isFormerMember ? "#6b7280" : "#036b0c",
                }
          }
          onClick={canClick ? () => handleUserClick(senderId, displayName) : undefined}
        >
          {displayName}
        </div>
      </Tooltip>
    );
  };

  const renderConversationPartnerAvatar = () => {
    if (!resolvedConversationPartner) return null;

    return (
      <Tooltip
        content={`View ${resolvedConversationPartner.firstName || resolvedConversationPartner.username} details`}
        wrapperClassName="inline-flex mb-2 mx-auto"
      >
        <UserAvatar
          user={resolvedConversationPartner}
          sizeClass="w-16 h-16"
          clickable
          onClick={() => handleUserClick(resolvedConversationPartner.id)}
          iconSize={24}
          initialsClassName="text-xl font-medium"
          showDemoOverlay
          demoOverlayTextClassName="text-[9px]"
          demoOverlayTextTranslateClassName="-translate-y-[4px]"
        />
      </Tooltip>
    );
  };

  const renderTeamConversationAvatar = () => {
    if (!resolvedTeamData) return null;

    const teamAvatarUrl = getTeamAvatarUrl(resolvedTeamData);

    return (
      <Tooltip content={`View ${resolvedTeamData.name} details`} wrapperClassName="inline-flex mb-2">
      <div
        className="avatar cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleTeamClick}
      >
        <div className="w-16 h-16 rounded-full mx-auto relative overflow-hidden">
          {teamAvatarUrl ? (
            <img
              src={teamAvatarUrl}
              alt={resolvedTeamData.name}
              className="object-cover w-full h-full rounded-full"
              onError={(e) => {
                e.target.style.display = "none";
                const fallback =
                  e.target.parentElement.querySelector(".avatar-fallback");
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
            style={{ display: teamAvatarUrl ? "none" : "flex" }}
          >
            <span className="text-xl font-medium">
              {getTeamInitials(resolvedTeamData)}
            </span>
          </div>
          {isSyntheticTeam(resolvedTeamData) && (
            <DemoAvatarOverlay
              textClassName="text-[9px]"
              textTranslateClassName="-translate-y-[4px]"
            />
          )}
        </div>
      </div>
      </Tooltip>
    );
  };

  const {
    renderApplicationApprovedDmMessage,
    renderApplicationApprovedMessage,
    renderRoleApplicationApprovedMessage,
    renderRoleApplicationFilledMessage,
    renderRoleApplicationDeferredInviteMessage,
    renderRoleInvitationFilledMessage,
    renderRoleInvitationAcceptedMessage,
    renderRoleInvitationAssignedLegacyMessage,
    renderRoleReopenedMessage,
    renderRoleReopenedAdminMessage,
    renderRoleFilledMessage,
    renderRoleCreatedMessage,
    renderRoleClosedMessage,
    renderRoleUpdatedMessage,
    renderRoleDeletedMessage,
  } = createEventRenderers({
    MentionById,
    TeamMentionById,
    RoleMentionById,
    userMentionOrYou,
    possessiveUserMentionOrYour,
    isCurrentViewer,
    highlightEventContent,
  });

  // =============================================================================
  // renderLeaveMessage - Neutral grey theme (pill shape)
  // =============================================================================
  const renderLeaveMessage = (message, parsedMessage, isCurrentUser) => {
    const leaveText = isCurrentUser ? (
      "You have left the team."
    ) : (
      <>
        <MentionById
          userId={parsedMessage.userId}
          name={parsedMessage.userName}
        />{" "}
        has left the team.
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <UserMinus size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(leaveText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderUserLeftLomirMessage - Neutral grey theme
  // =============================================================================
  const renderUserLeftLomirMessage = (message) => {
    const leaveText = <>Former Lomir Member has left Lomir.</>;

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <LogOut size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(leaveText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  const renderMemberRemovedPublicMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const isRemovedMemberCurrentUser = isCurrentViewer(parsedMessage.userId);
    const text = isRemovedMemberCurrentUser ? (
      "You were removed from the team."
    ) : isCurrentUser ? (
      <>
        You removed{" "}
        <MentionById
          userId={parsedMessage.userId}
          name={parsedMessage.userName}
        />{" "}
        from the team.
      </>
    ) : (
      <>
        <MentionById
          userId={parsedMessage.userId}
          name={parsedMessage.userName}
        />{" "}
        has been removed from the team.
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <UserMinus size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(text)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  /**
   * Render a team join message with special formatting
   * Shows announcement banner + personal message in bubble
   */
  const renderJoinMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser,
    senderId,
  ) => {
    const pronoun = isCurrentUser ? "you" : "them";
    const roleMention = parsedMessage.roleName ? (
      <>
        <UserCheck size={16} className="event-inline-icon mx-1" />
        <Mention name={parsedMessage.roleName} />
      </>
    ) : null;
    const welcomeText = isCurrentUser ? (
      roleMention ? (
        <>You joined the team as{" "}{roleMention}. Welcome aboard!</>
      ) : (
        <>You joined the team. Welcome aboard!</>
      )
    ) : roleMention ? (
      <>
        <Mention name={parsedMessage.userName} /> joined the team as{" "}
        {roleMention}. Say hello to {pronoun}!
      </>
    ) : (
      <>
        <Mention name={parsedMessage.userName} /> has followed your invite and
        joined your team. Say hello to {pronoun}!
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--success mb-3">
          <span className="text-sm font-medium event-message-text">
            <UserPlus size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(welcomeText)}
            <PartyPopper size={16} className="event-inline-icon ml-1" />
          </span>
        </div>

        {parsedMessage.personalMessage && (
          <div
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } w-full`}
          >
            {!isCurrentUser && renderAvatar(senderInfo, true, senderId)}

            <div className="flex flex-col max-w-[70%]">
            {!isCurrentUser && (
                renderSenderName(
                  senderInfo,
                  senderId,
                  "text-xs font-medium mb-1 ml-3",
                )
              )}

              <div
                className={`
                  rounded-lg p-3 
                  ${
                    isCurrentUser
                      ? "bg-green-100 text-base-content rounded-br-none ml-auto"
                      : "bg-base-200 rounded-bl-none"
                  }
                `}
              >
                <p>{renderHighlightedSearchText(parsedMessage.personalMessage, searchQuery)}</p>
                <div
                  className={`
                    flex justify-end items-center text-xs mt-1 
                    ${
                      isCurrentUser
                        ? "text-base-content/60"
                        : "text-base-content/50"
                    }
                  `}
                >
                  <span>{formatLocalTime(message.createdAt)}</span>
                  {
                    <ReadReceipt
                      message={message}
                      isCurrentUser={isCurrentUser}
                      conversationType={conversationType}
                      teamMembers={teamMembers}
                      currentUserId={currentUserId}
                      getReadByTooltip={getReadByTooltip}
                    />
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {!parsedMessage.personalMessage && (
          <div className="text-xs text-base-content/50">
            {formatLocalTime(message.createdAt)}
          </div>
        )}
      </div>
    );
  };

  // =============================================================================
  // renderInvitationCancelledMessage - Neutral grey theme
  // =============================================================================
  const renderInvitationCancelledMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You cancelled your invitation for{" "}
        {parsedMessage.inviteeId ? (
          <MentionById
            userId={parsedMessage.inviteeId}
            name={parsedMessage.inviteeName}
          />
        ) : (
          <Mention name={parsedMessage.inviteeName} />
        )}{" "}
        to join{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />
        . Want to tell them why in this chat?
      </>
    ) : (
      <>
        {parsedMessage.cancellerId ? (
          <MentionById
            userId={parsedMessage.cancellerId}
            name={parsedMessage.cancellerName}
          />
        ) : (
          <Mention name={parsedMessage.cancellerName} />
        )}{" "}
        cancelled your invitation to join{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />
        {". "}Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <CircleX size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderInvitationDeclinedMessage - Neutral grey theme
  // =============================================================================
  const renderInvitationDeclinedMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      parsedMessage.hasPersonalMessage ? (
        <>
          You declined{" "}
          <MentionById
            userId={parsedMessage.inviterId}
            name={parsedMessage.inviterName}
          />
          {"'s"} invitation for{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />{" "}
          and added this message:
        </>
      ) : (
        <>
          You declined{" "}
          <MentionById
            userId={parsedMessage.inviterId}
            name={parsedMessage.inviterName}
          />
          {"'s"} invitation for{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />
          . Consider adding a personal message to explain your decision.
        </>
      )
    ) : parsedMessage.hasPersonalMessage ? (
      <>
        Your invitation for{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        was declined by{" "}
        <MentionById
          userId={parsedMessage.inviteeId}
          name={parsedMessage.inviteeName}
        />
        , who added this message:
      </>
    ) : (
      <>
        Your invitation for{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        was declined by{" "}
        <MentionById
          userId={parsedMessage.inviteeId}
          name={parsedMessage.inviteeName}
        />
        . Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <CircleX size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderApplicationResponseMessage - Neutral grey theme
  // =============================================================================
  const renderApplicationResponseMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser,
    senderId,
  ) => {
    const bannerContent = isCurrentUser ? (
      <>
        Your decline response to <Mention name={parsedMessage.applicantName} />
        {"'s"} application for{" "}
        <span className="font-medium">{renderHighlightedSearchText(parsedMessage.teamName, searchQuery)}</span>
      </>
    ) : (
      <>
        Response to your application for{" "}
        <span className="font-medium">{renderHighlightedSearchText(parsedMessage.teamName, searchQuery)}</span>
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <FileText size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(bannerContent)}
          </span>
        </div>

        {parsedMessage.personalMessage && (
          <div
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } w-full`}
          >
            {!isCurrentUser && renderAvatar(senderInfo, true, senderId)}

            <div className="flex flex-col max-w-[70%]">
              <div
                className={`
                  rounded-lg p-3
                  ${
                    isCurrentUser
                      ? "bg-green-100 text-base-content rounded-br-none ml-auto"
                      : "bg-base-200 rounded-bl-none"
                  }
                `}
              >
                <p>{renderHighlightedSearchText(parsedMessage.personalMessage, searchQuery)}</p>
                <div
                  className={`
                    flex justify-end items-center text-xs mt-1
                    ${
                      isCurrentUser
                        ? "text-base-content/60"
                        : "text-base-content/50"
                    }
                  `}
                >
                  <span>{formatLocalTime(message.createdAt)}</span>
                  {
                    <ReadReceipt
                      message={message}
                      isCurrentUser={isCurrentUser}
                      conversationType={conversationType}
                      teamMembers={teamMembers}
                      currentUserId={currentUserId}
                      getReadByTooltip={getReadByTooltip}
                    />
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =============================================================================
  // renderApplicationDeclinedMessage - Neutral grey theme
  // =============================================================================
  const renderApplicationDeclinedMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      parsedMessage.hasPersonalMessage ? (
        <>
          You declined{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />{" "}
          and added this message:
        </>
      ) : (
        <>
          You declined{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />
          . Consider adding a personal message to explain your decision.
        </>
      )
    ) : parsedMessage.hasPersonalMessage ? (
      <>
        Your application to{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        was declined by{" "}
        <MentionById
          userId={parsedMessage.approverId}
          name={parsedMessage.approverName}
        />
        {", "}who added this message:
      </>
    ) : (
      <>
        Your application to{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        was declined by{" "}
        <MentionById
          userId={parsedMessage.approverId}
          name={parsedMessage.approverName}
        />
        {". "}Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <CircleX size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderInvitationResponseMessage - Info blue theme
  // =============================================================================
  const renderInvitationResponseMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser,
    senderId,
  ) => {
    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <FileText size={16} className="event-inline-icon mr-1" />
            Response to invitation for{" "}
            <span className="font-medium">{renderHighlightedSearchText(parsedMessage.teamName, searchQuery)}</span>
          </span>
        </div>

        {parsedMessage.personalMessage && (
          <div
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } w-full`}
          >
            {!isCurrentUser &&
              conversationType === "direct" &&
              renderAvatar(senderInfo, true, senderId)}

            <div className="flex flex-col max-w-[70%]">
              <div
                className={`
                  rounded-lg p-3
                  ${
                    isCurrentUser
                      ? "bg-green-100 text-base-content rounded-br-none ml-auto"
                      : "bg-base-200 rounded-bl-none"
                  }
                `}
              >
                <p>{renderHighlightedSearchText(parsedMessage.personalMessage, searchQuery)}</p>
                <div
                  className={`
                    flex justify-end items-center text-xs mt-1
                    ${
                      isCurrentUser
                        ? "text-base-content/60"
                        : "text-base-content/50"
                    }
                  `}
                >
                  <span>{formatLocalTime(message.createdAt)}</span>
                  {
                    <ReadReceipt
                      message={message}
                      isCurrentUser={isCurrentUser}
                      conversationType={conversationType}
                      teamMembers={teamMembers}
                      currentUserId={currentUserId}
                      getReadByTooltip={getReadByTooltip}
                    />
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =============================================================================
  // renderApplicationCancelledMessage - Neutral grey theme
  // =============================================================================
  const renderApplicationCancelledMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You cancelled your application for{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />
        . Want to tell them why in this chat?
      </>
    ) : (
      <>
        <MentionById
          userId={parsedMessage.applicantId}
          name={parsedMessage.applicantName}
        />{" "}
        cancelled their application for{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />
        . Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <CircleX size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderRoleChangedMessage - Dynamic theme based on new role
  // =============================================================================
  const renderRoleChangedMessage = (message, parsedMessage) => {
    const isPromotion = parsedMessage.newRole === "admin";
    const newRole = parsedMessage.newRole;

    const getRoleBannerClass = (role) => {
      switch (role) {
        case "owner":
          return "event-banner--owner";
        case "admin":
          return "event-banner--admin";
        case "member":
        default:
          return "event-banner--member";
      }
    };

    const getRoleIcon = (role) => {
      switch (role) {
        case "owner":
          return Crown;
        case "admin":
          return Shield;
        case "member":
        default:
          return User;
      }
    };

    const bannerClass = getRoleBannerClass(newRole);
    const RoleIcon = getRoleIcon(newRole);
    const isChangerCurrentUser = isCurrentViewer(parsedMessage.changerId);
    const isMemberCurrentUser = isCurrentViewer(parsedMessage.memberId);

    const messageText = isChangerCurrentUser ? (
      isPromotion ? (
        <>
          You promoted{" "}
          <MentionById
            userId={parsedMessage.memberId}
            name={parsedMessage.memberName}
          />{" "}
          to Admin in{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />
          .
        </>
      ) : (
        <>
          You changed{" "}
          <MentionById
            userId={parsedMessage.memberId}
            name={parsedMessage.memberName}
          />
          {"'s"} role to Member in{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />
          .
        </>
      )
    ) : isMemberCurrentUser ? (
      isPromotion ? (
      <>
        You were promoted to Admin in{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        by{" "}
        <MentionById
          userId={parsedMessage.changerId}
          name={parsedMessage.changerName}
        />
        .
      </>
      ) : (
        <>
          Your role in{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />{" "}
          was changed to Member by{" "}
          {userMentionOrYou(parsedMessage.changerId, parsedMessage.changerName)}
          .
        </>
      )
    ) : (
      <>
        {possessiveUserMentionOrYour(
          parsedMessage.memberId,
          parsedMessage.memberName,
        )}{" "}
        role in{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        was {isPromotion ? "changed to Admin" : "changed to Member"} by{" "}
        {userMentionOrYou(parsedMessage.changerId, parsedMessage.changerName)}
        .
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className={`event-banner ${bannerClass} mb-3`}>
          <span className="text-sm font-medium event-message-text">
            <RoleIcon size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
            {isPromotion && isMemberCurrentUser && (
              <PartyPopper size={16} className="event-inline-icon ml-1" />
            )}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderOwnershipTeamMessage - Pink owner theme (team chat)
  // =============================================================================
  const renderOwnershipTeamMessage = (message, parsedMessage) => {
    const isPreviousOwnerCurrentUser = isCurrentViewer(parsedMessage.prevOwnerId);
    const isNewOwnerCurrentUser = isCurrentViewer(parsedMessage.newOwnerId);
    const messageText = isPreviousOwnerCurrentUser ? (
      <>
        You transferred ownership to{" "}
        {userMentionOrYou(parsedMessage.newOwnerId, parsedMessage.newOwnerName)}
      </>
    ) : isNewOwnerCurrentUser ? (
      <>
        {userMentionOrYou(parsedMessage.prevOwnerId, parsedMessage.prevOwnerName, {
          capitalized: true,
        })}{" "}
        transferred ownership to you
      </>
    ) : (
      <>
        {userMentionOrYou(parsedMessage.prevOwnerId, parsedMessage.prevOwnerName, {
          capitalized: true,
        })}{" "}
        transferred ownership to{" "}
        {userMentionOrYou(parsedMessage.newOwnerId, parsedMessage.newOwnerName)}
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--owner mb-3">
          <span className="text-sm font-medium event-message-text">
            <Crown size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderOwnershipTransferredMessage - Pink owner theme (DM)
  // =============================================================================
  const renderOwnershipTransferredMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You transferred team ownership of{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        to <Mention name={parsedMessage.newOwnerName} />.
      </>
    ) : (
      <>
        <MentionById
          userId={parsedMessage.prevOwnerId}
          name={parsedMessage.prevOwnerName}
        />{" "}
        transferred ownership of{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        to you. Congratulations!
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--owner mb-3">
          <span className="text-sm font-medium event-message-text">
            <Crown size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
            <PartyPopper size={16} className="event-inline-icon ml-1" />
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  /**
   * Render a member removed message with special formatting
   */
  const renderMemberRemovedMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You removed{" "}
        <MentionById
          userId={parsedMessage.memberId}
          name={parsedMessage.memberName}
        />{" "}
        from{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />
        .
      </>
    ) : (
      <>
        You were removed from{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        by{" "}
        <MentionById
          userId={parsedMessage.removerId}
          name={parsedMessage.removerName}
        />
        . Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            <UserMinus size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // --------------------------------------------
  // NO MESSAGES STATE
  // --------------------------------------------
  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <>
        <div className="space-y-6">
          {nameResolveError && (
            <div className="mb-2 text-sm text-warning">{nameResolveError}</div>
          )}

          {resolvedConversationPartner && conversationType === "direct" && (
            <div
              ref={setConversationHeaderRef}
              className="text-center pb-4 mb-4 border-b border-base-200"
            >
              {renderConversationPartnerAvatar()}
              <Tooltip
                content={`View ${resolvedConversationPartner.firstName || resolvedConversationPartner.username} details`}
                wrapperClassName="block"
              >
                <h3
                  className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleUserClick(resolvedConversationPartner.id)}
                >
                  {resolvedConversationPartner.firstName &&
                  resolvedConversationPartner.lastName
                    ? `${resolvedConversationPartner.firstName} ${resolvedConversationPartner.lastName}`
                    : resolvedConversationPartner.username}
                </h3>
              </Tooltip>
            </div>
          )}

          {resolvedTeamData && conversationType === "team" && (
            <div
              ref={setConversationHeaderRef}
              className="text-center pb-4 mb-4 border-b border-base-200"
            >
              {renderTeamConversationAvatar()}
              <Tooltip
                content={`View ${resolvedTeamData.name} details`}
                wrapperClassName="block"
              >
                <h3
                  className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
                  onClick={handleTeamClick}
                >
                  {resolvedTeamData.name}
                </h3>
              </Tooltip>
            </div>
          )}

          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-base-content/70">No messages yet</p>
            <p className="text-sm text-base-content/50 mt-2">
              Send a message to start the conversation
            </p>
          </div>
        </div>

        <TeamDetailsModal
          isOpen={isTeamModalOpen}
          teamId={conversationType === "team" ? teamData?.id : selectedTeamId}
          initialTeamData={conversationType === "team" ? teamData : null}
          membersRefreshKey={teamMembersRefreshKey}
          hideMatchData
          onClose={handleTeamModalClose}
        />

        <UserDetailsModal
          isOpen={isUserModalOpen}
          userId={selectedUserId}
          onClose={handleUserModalClose}
        />
      </>
    );
  }

  // Helper function to group consecutive messages by sender (max 3 per group)
  const groupMessages = (messagesForDate) => {
    if (!messagesForDate.length) return [];

    const groups = [];
    let currentGroup = {
      senderId: messagesForDate[0].senderId,
      messages: [messagesForDate[0]],
      showSenderInfo: true,
    };

    for (let i = 1; i < messagesForDate.length; i++) {
      const message = messagesForDate[i];

      const parsedMessage = parseSystemMessage(message.content);
      const prevParsedMessage = parseSystemMessage(
        messagesForDate[i - 1].content,
      );

      const shouldStartNewGroup =
        message.senderId !== currentGroup.senderId ||
        currentGroup.messages.length >= 3 ||
        parsedMessage !== null ||
        prevParsedMessage !== null;

      if (shouldStartNewGroup) {
        groups.push(currentGroup);
        currentGroup = {
          senderId: message.senderId,
          messages: [message],
          showSenderInfo: true,
        };
      } else {
        currentGroup.messages.push(message);
      }
    }

    groups.push(currentGroup);
    return groups;
  };

  return (
    <>
      <div className="space-y-6">
        {nameResolveError && (
          <div className="mb-2 text-sm text-warning">{nameResolveError}</div>
        )}

        {/* Show conversation partner header for direct messages - CLICKABLE */}
        {resolvedConversationPartner && conversationType === "direct" && (
          <div
            ref={setConversationHeaderRef}
            className="text-center pb-4 mb-4 border-b border-base-200"
          >
            {renderConversationPartnerAvatar()}
            <Tooltip
              content={`View ${resolvedConversationPartner.firstName || resolvedConversationPartner.username} details`}
              wrapperClassName="block"
            >
              <h3
                className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleUserClick(resolvedConversationPartner.id)}
              >
                {resolvedConversationPartner.firstName &&
                resolvedConversationPartner.lastName
                  ? `${resolvedConversationPartner.firstName} ${resolvedConversationPartner.lastName}`
                  : resolvedConversationPartner.username}
              </h3>
            </Tooltip>
          </div>
        )}

        {/* Show team header for team conversations - CLICKABLE */}
        {resolvedTeamData && conversationType === "team" && (
          <div
            ref={setConversationHeaderRef}
            className="text-center pb-4 mb-4 border-b border-base-200"
          >
            {renderTeamConversationAvatar()}
            <Tooltip
              content={`View ${resolvedTeamData.name} details`}
              wrapperClassName="block"
            >
              <h3
                className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
                onClick={handleTeamClick}
              >
                {resolvedTeamData.name}
              </h3>
            </Tooltip>
          </div>
        )}

        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <button
              className="btn btn-ghost btn-sm text-base-content/60"
              onClick={onLoadEarlierMessages}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "Load earlier messages"
              )}
            </button>
          </div>
        )}

        {/* Group messages by date */}
        {Object.entries(messagesByDate).map(([dateString, messagesForDate]) => (
          <div key={dateString} className="space-y-4">
            <div className="text-center">
              <div className="badge badge-sm bg-base-300 text-base-content border-none">
                {formatDateHeading(dateString)}
              </div>
            </div>

            {/* Group consecutive messages by sender */}
            {groupMessages(messagesForDate).map((messageGroup, groupIndex) => {
              const isCurrentUser = messageGroup.senderId === currentUserId;
              const senderInfo = getSenderInfo(
                messageGroup.senderId,
                messageGroup.messages[0],
              );

              // System message rendering
              if (messageGroup.messages.length === 1) {
                const message = messageGroup.messages[0];
                const parsedMessage = parseSystemMessage(message.content);

                if (parsedMessage) {
                  const isHighlighted = highlightMessageIds.some(
                    (id) => String(id) === String(message.id),
                  );
                  const isFirstHighlighted =
                    isHighlighted &&
                    String(message.id) === String(highlightMessageIds[0]);

                  const wrapperClass = isHighlighted
                    ? "message-highlight rounded-xl p-2"
                    : "";
                  const canReactMessage =
                    !(
                      message.deletedAt ||
                      message.deleted_at
                    ) && typeof onReply === "function";
                  const renderReactButton = () =>
                    canReactMessage ? (
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 z-10">
                        <Tooltip
                          content="React"
                          position="top"
                          wrapperClassName="inline-flex"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onReply({
                                id: message.id,
                                  content: message.content,
                                  createdAt:
                                    message.createdAt || message.created_at,
                                  imageUrl:
                                    message.imageUrl || message.image_url,
                                  fileUrl: message.fileUrl || message.file_url,
                                  fileName:
                                    message.fileName || message.file_name,
                                  fileSize:
                                    message.fileSize || message.file_size,
                                  fileExpiresAt:
                                    message.fileExpiresAt ||
                                    message.file_expires_at,
                                  fileDeletedAt:
                                    message.fileDeletedAt ||
                                    message.file_deleted_at,
                                  senderId:
                                    message.senderId || message.sender_id,
                                senderUsername:
                                  senderInfo?.username ||
                                  message.senderUsername ||
                                  message.sender_username,
                                senderFirstName:
                                  senderInfo?.firstName ||
                                  senderInfo?.first_name ||
                                  message.senderFirstName ||
                                  message.sender_first_name,
                              })
                            }
                            className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
                            aria-label="React to message"
                          >
                            <Reply
                              size={14}
                              className="text-base-content/50 hover:text-primary"
                            />
                          </button>
                        </Tooltip>
                      </div>
                    ) : null;
                  const renderSystemContentWithReactButton = (content) => {
                    if (!React.isValidElement(content)) return content;

                    const children = React.Children.toArray(
                      content.props.children,
                    );
                    let attachedReactButton = false;
                    const nextChildren = children.map((child, i) => {
                      if (
                        attachedReactButton ||
                        !React.isValidElement(child) ||
                        !String(child.props.className || "").includes(
                          "event-banner",
                        )
                      ) {
                        return child;
                      }

                      attachedReactButton = true;
                      return (
                        <div key={child.key ?? i} className="relative inline-flex max-w-full">
                          {child}
                          {renderReactButton()}
                        </div>
                      );
                    });

                    return React.cloneElement(content, undefined, nextChildren);
                  };
                  const renderSystemMessage = (content) => (
                    <div
                      key={`${dateString}-group-${groupIndex}`}
                      data-message-id={message.id}
                      ref={isFirstHighlighted ? highlightedMessageRef : null}
                      className={`${wrapperClass} relative group event-message-reaction-group`}
                    >
                      {renderSystemContentWithReactButton(content)}
                    </div>
                  );

                  if (parsedMessage.type === "team_join") {
                    return renderSystemMessage(
                      renderJoinMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId,
                        ),
                    );
                  } else if (parsedMessage.type === "invitation_response") {
                    return renderSystemMessage(
                      renderInvitationResponseMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId,
                        ),
                    );
                  } else if (parsedMessage.type === "application_approved") {
                    return renderSystemMessage(
                      renderApplicationApprovedMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId,
                        ),
                    );
                  } else if (
                    parsedMessage.type === "role_application_approved"
                  ) {
                    // Suppress when a combined role_application_filled message exists for
                    // the same role + applicant — avoids showing two separate messages.
                    // Search all loaded messages (not just same-date) to handle timing
                    // and cross-midnight edge cases. Backend message has no IDs, so fall
                    // back to name comparison when IDs are null.
                    const allLoadedMessages = Array.from(messagesById?.values() ?? []);
                    const hasCombinedMessage = allLoadedMessages.some((m) => {
                      const p = parseSystemMessage(m.content);
                      if (
                        p?.type !== "role_application_filled" &&
                        p?.type !== "role_application_deferred_invite"
                      )
                        return false;
                      const roleMatch =
                        parsedMessage.roleId != null && p.roleId != null
                          ? String(p.roleId) === String(parsedMessage.roleId)
                          : p.roleName?.trim().toLowerCase() ===
                            parsedMessage.roleName?.trim().toLowerCase();
                      const applicantMatch =
                        parsedMessage.applicantId != null && p.applicantId != null
                          ? String(p.applicantId) === String(parsedMessage.applicantId)
                          : p.applicantName?.trim().toLowerCase() ===
                            parsedMessage.applicantName?.trim().toLowerCase();
                      return roleMatch && applicantMatch;
                    });
                    if (hasCombinedMessage) return null;
                    return renderSystemMessage(
                      renderRoleApplicationApprovedMessage(
                          message,
                          parsedMessage,
                        ),
                    );
                  } else if (parsedMessage.type === "role_application_filled") {
                    return renderSystemMessage(
                      renderRoleApplicationFilledMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_application_deferred_invite") {
                    return renderSystemMessage(
                      renderRoleApplicationDeferredInviteMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_invitation_filled") {
                    return renderSystemMessage(
                      renderRoleInvitationFilledMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_invitation_accepted") {
                    return renderSystemMessage(
                      renderRoleInvitationAcceptedMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_invitation_assigned_legacy") {
                    // Suppress if a richer frontend message exists for the same invitee + role
                    const allLoadedMessages = Array.from(messagesById?.values() ?? []);
                    const hasFrontendMessage = allLoadedMessages.some((m) => {
                      const p = parseSystemMessage(m.content);
                      if (
                        p?.type !== "role_invitation_accepted" &&
                        p?.type !== "role_invitation_filled"
                      )
                        return false;
                      const roleMatch =
                        p.roleName?.trim().toLowerCase() ===
                        parsedMessage.roleName?.trim().toLowerCase();
                      const inviteeMatch =
                        p.inviteeName?.trim().toLowerCase() ===
                        parsedMessage.inviteeName?.trim().toLowerCase();
                      return roleMatch && inviteeMatch;
                    });
                    if (hasFrontendMessage) return null;
                    return renderSystemMessage(
                      renderRoleInvitationAssignedLegacyMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_reopened") {
                    return renderSystemMessage(
                      renderRoleReopenedMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_reopened_admin") {
                    return renderSystemMessage(
                      renderRoleReopenedAdminMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_filled") {
                    return renderSystemMessage(
                      renderRoleFilledMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "role_created") {
                    return renderSystemMessage(
                      renderRoleCreatedMessage(message, parsedMessage, senderInfo, messageGroup.senderId),
                    );
                  } else if (parsedMessage.type === "role_closed") {
                    return renderSystemMessage(
                      renderRoleClosedMessage(message, parsedMessage, senderInfo, messageGroup.senderId),
                    );
                  } else if (parsedMessage.type === "role_updated") {
                    return renderSystemMessage(
                      renderRoleUpdatedMessage(message, parsedMessage, senderInfo, messageGroup.senderId),
                    );
                  } else if (parsedMessage.type === "role_deleted") {
                    return renderSystemMessage(
                      renderRoleDeletedMessage(message, parsedMessage, senderInfo, messageGroup.senderId),
                    );
                  } else if (parsedMessage.type === "application_response") {
                    return renderSystemMessage(
                      renderApplicationResponseMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId,
                        ),
                    );
                  } else if (parsedMessage.type === "team_leave") {
                    return renderSystemMessage(
                      renderLeaveMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "user_left_lomir") {
                    return renderSystemMessage(
                      renderUserLeftLomirMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "member_removed_public") {
                    return renderSystemMessage(
                      renderMemberRemovedPublicMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "application_declined") {
                    return renderSystemMessage(
                      renderApplicationDeclinedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "application_approved_dm") {
                    return renderSystemMessage(
                      renderApplicationApprovedDmMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "invitation_declined") {
                    return renderSystemMessage(
                      renderInvitationDeclinedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "invitation_cancelled") {
                    return renderSystemMessage(
                      renderInvitationCancelledMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "application_cancelled") {
                    return renderSystemMessage(
                      renderApplicationCancelledMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "member_removed") {
                    return renderSystemMessage(
                      renderMemberRemovedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "role_changed") {
                    return renderSystemMessage(
                      renderRoleChangedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "ownership_transferred") {
                    return renderSystemMessage(
                      renderOwnershipTransferredMessage(
                          message,
                          parsedMessage,
                          isCurrentUser,
                        ),
                    );
                  } else if (parsedMessage.type === "ownership_team") {
                    return renderSystemMessage(
                      renderOwnershipTeamMessage(message, parsedMessage),
                    );
                  } else if (parsedMessage.type === "team_deleted") {
                    // not rendered here (fixed banner elsewhere)
                    return null;
                  }
                }
              }

              // Regular messages
              return (
                <div
                  key={`${dateString}-group-${groupIndex}`}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  {conversationType === "team" &&
                    !isCurrentUser &&
                    messageGroup.showSenderInfo &&
                    renderAvatar(senderInfo, true, messageGroup.senderId)}

                  <div className="flex flex-col max-w-[70%]">
                    {conversationType === "team" &&
                      !isCurrentUser &&
                      messageGroup.showSenderInfo && (
                        renderSenderName(
                          senderInfo,
                          messageGroup.senderId,
                          `text-xs font-medium mb-1 ml-3 ${
                            senderInfo?.isCurrentMember === false &&
                            senderInfo?.isDeletedUser !== true
                              ? "opacity-70"
                              : ""
                          }`,
                        )
                      )}

                    <div className="space-y-1">
                      {messageGroup.messages.map((message, messageIndex) => {
                        const isHighlighted = highlightMessageIds.some(
                          (id) => String(id) === String(message.id),
                        );
                        const isFirstHighlighted =
                          isHighlighted &&
                          String(message.id) === String(highlightMessageIds[0]);

                        const isDeleted = !!(
                          message.deletedAt || message.deleted_at
                        );
                        const messageEdited = isMessageEdited(message);
                        const isEditing =
                          String(editingMessageId) === String(message.id);
                        const canEditMessage =
                          isCurrentUser &&
                          !isDeleted &&
                          !String(message.id).startsWith("temp-") &&
                          Boolean(message.content) &&
                          typeof onEditMessage === "function";
                        const canReplyMessage =
                          !isDeleted && typeof onReply === "function";
                        const canDeleteMessage =
                          isCurrentUser &&
                          !isDeleted &&
                          !String(message.id).startsWith("temp-") &&
                          typeof onDeleteMessage === "function";
                        const isSavingEdit =
                          String(savingEditMessageId) === String(message.id);
                        const showMessageMeta =
                          messageIndex ===
                            messageGroup.messages.length - 1 || messageEdited;
                        const replySourceMessage = message.replyTo?.id
                          ? messagesById.get(String(message.replyTo.id))
                          : null;
                        const replyPreview = message.replyTo
                          ? {
                              ...replySourceMessage,
                              ...message.replyTo,
                              content:
                                message.replyTo.content ??
                                replySourceMessage?.content,
                              createdAt:
                                message.replyTo.createdAt ||
                                message.replyTo.created_at ||
                                replySourceMessage?.createdAt ||
                                replySourceMessage?.created_at,
                              imageUrl:
                                message.replyTo.imageUrl ||
                                message.replyTo.image_url ||
                                replySourceMessage?.imageUrl ||
                                replySourceMessage?.image_url,
                              fileUrl:
                                message.replyTo.fileUrl ||
                                message.replyTo.file_url ||
                                replySourceMessage?.fileUrl ||
                                replySourceMessage?.file_url,
                              fileName:
                                message.replyTo.fileName ||
                                message.replyTo.file_name ||
                                replySourceMessage?.fileName ||
                                replySourceMessage?.file_name,
                              fileSize:
                                message.replyTo.fileSize ||
                                message.replyTo.file_size ||
                                replySourceMessage?.fileSize ||
                                replySourceMessage?.file_size,
                              fileExpiresAt:
                                message.replyTo.fileExpiresAt ||
                                message.replyTo.file_expires_at ||
                                replySourceMessage?.fileExpiresAt ||
                                replySourceMessage?.file_expires_at,
                              fileDeletedAt:
                                message.replyTo.fileDeletedAt ||
                                message.replyTo.file_deleted_at ||
                                replySourceMessage?.fileDeletedAt ||
                                replySourceMessage?.file_deleted_at,
                            }
                          : null;
                        const replyImageUrl =
                          replyPreview?.imageUrl || replyPreview?.image_url;
                        const replyFileUrl =
                          replyPreview?.fileUrl || replyPreview?.file_url;
                        const replyFileName =
                          replyPreview?.fileName || replyPreview?.file_name;
                        const replyFileDeletedAt =
                          replyPreview?.fileDeletedAt ||
                          replyPreview?.file_deleted_at;
                        const replyExpirationStatus = replyPreview
                          ? getFileExpirationStatus(replyPreview)
                          : { status: "active" };
                        const replyMediaExpired =
                          replyExpirationStatus.status === "expired" ||
                          Boolean(replyFileDeletedAt);
                        const replyHasMedia = Boolean(
                          replyImageUrl || replyFileUrl || replyFileName,
                        );
                        const ReplyFileIcon = getFileIcon(replyFileName);
                        const replyEventPreview = replyPreview?.content
                          ? getEventReactionPreview(replyPreview.content)
                          : null;

                        return (
                          <div
                            key={`${message.id}-${dateString}-${groupIndex}-${messageIndex}`}
                            data-message-id={message.id}
                            ref={
                              isFirstHighlighted ? highlightedMessageRef : null
                            }
                            className={`
                      relative group rounded-lg p-3 transition-all duration-300 hover:shadow-md
                      ${
                        isCurrentUser
                          ? "bg-green-100 text-base-content rounded-br-none ml-auto"
                          : "bg-base-200 rounded-bl-none"
                      }
                      ${
                        messageIndex === 0
                          ? ""
                          : isCurrentUser
                            ? "rounded-tr-lg"
                            : "rounded-tl-lg"
                      }
                      ${isHighlighted ? "message-highlight" : ""}
                    `}
                          >
                            {(canReplyMessage ||
                              canEditMessage ||
                              canDeleteMessage) &&
                              !isEditing && (
                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                                  {canReplyMessage && (
                                    <Tooltip
                                      content="React"
                                      position="top"
                                      wrapperClassName="inline-flex"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onReply({
                                            id: message.id,
                                            content: message.content,
                                            createdAt:
                                              message.createdAt ||
                                              message.created_at,
                                            imageUrl:
                                              message.imageUrl ||
                                              message.image_url,
                                            fileUrl:
                                              message.fileUrl ||
                                              message.file_url,
                                            fileName:
                                              message.fileName ||
                                              message.file_name,
                                            fileSize:
                                              message.fileSize ||
                                              message.file_size,
                                            fileExpiresAt:
                                              message.fileExpiresAt ||
                                              message.file_expires_at,
                                            fileDeletedAt:
                                              message.fileDeletedAt ||
                                              message.file_deleted_at,
                                            senderId:
                                              message.senderId ||
                                              message.sender_id,
                                            senderUsername:
                                              senderInfo?.username ||
                                              message.senderUsername ||
                                              message.sender_username,
                                            senderFirstName:
                                              senderInfo?.firstName ||
                                              senderInfo?.first_name ||
                                              message.senderFirstName ||
                                              message.sender_first_name,
                                          })
                                        }
                                        className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
                                        aria-label="React to message"
                                      >
                                        <Reply
                                          size={14}
                                          className="text-base-content/50 hover:text-primary"
                                        />
                                      </button>
                                    </Tooltip>
                                  )}

                                  {canEditMessage && (
                                    <Tooltip
                                      content="Edit message"
                                      position="top"
                                      wrapperClassName="inline-flex"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          startEditingMessage(message)
                                        }
                                        className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
                                        aria-label="Edit message"
                                      >
                                        <Pencil
                                          size={14}
                                          className="text-base-content/50 hover:text-primary"
                                        />
                                      </button>
                                    </Tooltip>
                                  )}

                                  {canDeleteMessage && (
                                    <Tooltip
                                      content="Delete message"
                                      position="top"
                                      wrapperClassName="inline-flex"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onDeleteMessage(message.id)
                                        }
                                        className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow"
                                        aria-label="Delete message"
                                      >
                                        <Trash2
                                          size={14}
                                          className="text-base-content/50 hover:text-error"
                                        />
                                      </button>
                                    </Tooltip>
                                  )}
                                </div>
                              )}

                            {/* Only render media/text when NOT deleted */}
                            {!isDeleted && (
                              <>
                                {replyPreview && (
                                  <div
                                    onClick={() => {
                                      const targetEl =
                                        document.querySelector(
                                          `[data-message-id="${replyPreview.id}"]`,
                                        );
                                      if (targetEl) {
                                        targetEl.scrollIntoView({
                                          behavior: "smooth",
                                          block: "center",
                                        });
                                        targetEl.classList.add("bg-primary/10");
                                        setTimeout(
                                          () =>
                                            targetEl.classList.remove(
                                              "bg-primary/10",
                                            ),
                                          2000,
                                        );
                                      }
                                    }}
                                    className="mb-1.5 px-2.5 py-1.5 rounded-lg bg-white cursor-pointer hover:bg-white transition-colors max-w-full"
                                  >
                                    <p className="text-xs font-semibold text-primary truncate">
                                      {replyPreview.senderFirstName ||
                                        replyPreview.senderUsername ||
                                        "Former Lomir User"}
                                    </p>
                                    <Tooltip
                                      content={
                                        replyHasMedia && !replyPreview.content
                                          ? replyMediaExpired
                                            ? "Image or file no longer available"
                                            : replyExpirationStatus.status !==
                                                "none"
                                              ? replyExpirationStatus.message
                                              : replyImageUrl
                                                ? "Image"
                                                : replyFileName || "File"
                                          : formatReplyTooltipText(
                                              replyPreview.content,
                                              replyEventPreview,
                                            )
                                      }
                                      position="top"
                                      wrapperClassName="block min-w-0 max-w-full"
                                    >
                                      {replyHasMedia && replyMediaExpired ? (
                                        <div className="mt-1 flex min-w-0 items-center gap-2 text-warning">
                                          <AlertTriangle
                                            size={16}
                                            className="shrink-0"
                                          />
                                          <p className="text-xs font-medium truncate">
                                            Image or file no longer available
                                          </p>
                                        </div>
                                      ) : replyImageUrl ? (
                                        <div className="mt-1 min-w-0">
                                          <img
                                            src={replyImageUrl}
                                            alt="Replied image"
                                            className="rounded-lg max-w-full max-h-64 object-contain"
                                            loading="lazy"
                                          />
                                          <div className="mt-1 min-w-0">
                                            {replyPreview.content && (
                                              <p className="text-xs text-base-content/60 truncate">
                                                {renderReplyContent(replyPreview.content)}
                                              </p>
                                            )}
                                            {replyExpirationStatus.status !==
                                              "none" &&
                                              replyExpirationStatus.daysLeft !==
                                                null && (
                                                <div
                                                  className={`flex items-center gap-1 min-w-0 ${
                                                    replyExpirationStatus.status ===
                                                    "expiring-soon"
                                                      ? "text-warning"
                                                      : "text-base-content/40"
                                                  }`}
                                                >
                                                  <Clock
                                                    size={11}
                                                    className="shrink-0"
                                                  />
                                                  <p className="text-[11px] truncate">
                                                    {replyExpirationStatus.message}
                                                  </p>
                                                </div>
                                              )}
                                            {replyExpirationStatus.status ===
                                              "none" &&
                                              !replyPreview.content && (
                                                <p className="text-xs text-base-content/60 truncate">
                                                  Image
                                                </p>
                                              )}
                                          </div>
                                        </div>
                                      ) : replyFileUrl ? (
                                        <div className="mt-1 flex min-w-0 items-start gap-2">
                                          <ReplyFileIcon
                                            size={18}
                                            className="text-primary shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs text-base-content/60 truncate">
                                              {replyFileName || "File"}
                                            </p>
                                            {replyExpirationStatus.status !==
                                              "none" &&
                                              replyExpirationStatus.daysLeft !==
                                                null && (
                                                <div
                                                  className={`flex items-center gap-1 min-w-0 ${
                                                    replyExpirationStatus.status ===
                                                    "expiring-soon"
                                                      ? "text-warning"
                                                      : "text-base-content/40"
                                                  }`}
                                                >
                                                  <Clock
                                                    size={11}
                                                    className="shrink-0"
                                                  />
                                                  <p className="text-[11px] truncate">
                                                    {replyExpirationStatus.message}
                                                  </p>
                                                </div>
                                              )}
                                          </div>
                                        </div>
                                      ) : replyEventPreview ? (
                                        <p
                                          className="flex min-w-0 items-center gap-1 text-xs font-medium truncate"
                                          style={{ color: replyEventPreview.color }}
                                        >
                                          <replyEventPreview.Icon
                                            size={13}
                                            className="shrink-0"
                                          />
                                          <span className="truncate">
                                            {replyEventPreview.text}
                                          </span>
                                          {replyEventPreview.trailingIcon && (
                                            <replyEventPreview.trailingIcon
                                              size={13}
                                              className="shrink-0"
                                            />
                                          )}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-base-content/60 truncate">
                                          {replyPreview.content
                                            ? renderReplyContent(replyPreview.content)
                                            : "Original message was deleted"}
                                        </p>
                                      )}
                                    </Tooltip>
                                  </div>
                                )}

                                {/* Image if present - handle both camelCase and snake_case */}
                                {(() => {
                                  const imageUrl =
                                    message.imageUrl || message.image_url;
                                  const imageDeletedAt =
                                    message.fileDeletedAt ||
                                    message.file_deleted_at;
                                  const imageExpirationStatus =
                                    getFileExpirationStatus(message);
                                  const imageName =
                                    message.fileName || message.file_name;

                                  // If image was deleted/expired, show placeholder
                                  if (
                                    imageUrl &&
                                    (imageExpirationStatus.status ===
                                      "expired" ||
                                      imageDeletedAt)
                                  ) {
                                    return (
                                      <div
                                        className={
                                          message.content ? "mb-2" : ""
                                        }
                                      >
                                        <div className="flex items-center gap-3 p-3 bg-base-200/50 rounded-lg border border-base-300 max-w-xs">
                                          <AlertTriangle
                                            size={24}
                                            className="text-warning flex-shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-base-content/60">
                                              Image or file no longer available
                                            </p>
                                            <p className="text-xs text-base-content/40">
                                              This data has expired.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  // Show image with expiration warning if expiring soon
                                  if (imageUrl) {
                                    return (
                                      <div
                                        className={
                                          message.content ? "mb-2" : ""
                                        }
                                      >
                                        {imageExpirationStatus.status ===
                                          "expiring-soon" && (
                                          <div className="flex items-center gap-2 p-2 mb-2 bg-warning/10 border border-warning/30 rounded-lg max-w-xs">
                                            <Clock
                                              size={16}
                                              className="text-warning flex-shrink-0"
                                            />
                                            <p className="text-xs text-warning">
                                              {imageExpirationStatus.message}
                                            </p>
                                          </div>
                                        )}
                                        <Tooltip
                                          content="Click to open and download image in new tab"
                                          position="top"
                                          wrapperClassName="block"
                                        >
                                          <div
                                            className="relative inline-block group/img cursor-pointer"
                                            onClick={() => window.open(imageUrl, "_blank")}
                                          >
                                            <img
                                              src={imageUrl}
                                              alt="Shared image"
                                              className="rounded-lg max-w-full max-h-64 object-contain transition-opacity group-hover/img:opacity-80"
                                              loading="lazy"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                              <Download size={64} className="text-white drop-shadow-lg" />
                                            </div>
                                          </div>
                                        </Tooltip>
                                        {imageName && (
                                          <p className="text-xs text-base-content/60 mt-1 ml-1 truncate">
                                            {imageName}
                                          </p>
                                        )}
                                        {/* Grey expiration info for images NOT expiring soon (>7 days) */}
                                        {imageExpirationStatus.status ===
                                          "active" &&
                                          imageExpirationStatus.daysLeft !==
                                            null && (
                                            <div className="flex items-center gap-2 mt-1 ml-1">
                                              <Clock
                                                size={12}
                                                className="text-base-content/40 flex-shrink-0"
                                              />
                                              <p className="text-xs text-base-content/40">
                                                {imageExpirationStatus.message}
                                              </p>
                                            </div>
                                          )}
                                      </div>
                                    );
                                  }

                                  return null;
                                })()}

                                {/* File attachment if present */}
                                <FileAttachment message={message} />

                                {/* Text content */}
                                {message.content && !isEditing && (
                                  <p>
                                    <MessageText
                                      content={message.content}
                                      searchQuery={searchQuery}
                                      onUserClick={handleUserClick}
                                    />
                                  </p>
                                )}

                                {isEditing && (
                                  <div className="space-y-2 min-w-[16rem] max-w-full">
                                    <textarea
                                      value={editingContent}
                                      onChange={(event) =>
                                        setEditingContent(event.target.value)
                                      }
                                      className="textarea textarea-bordered textarea-sm w-full min-h-20 resize-none bg-base-100 text-base-content"
                                      maxLength={500}
                                      disabled={isSavingEdit}
                                      autoFocus
                                      onKeyDown={(event) => {
                                        if (
                                          event.key === "Escape" &&
                                          !isSavingEdit
                                        ) {
                                          cancelEditingMessage();
                                        }

                                        if (
                                          event.key === "Enter" &&
                                          (event.metaKey || event.ctrlKey)
                                        ) {
                                          event.preventDefault();
                                          saveEditingMessage(message.id);
                                        }
                                      }}
                                    />
                                    {editingError && (
                                      <p className="text-xs text-error">
                                        {editingError}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        className="btn btn-ghost btn-xs"
                                        onClick={cancelEditingMessage}
                                        disabled={isSavingEdit}
                                      >
                                        <X size={14} />
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-xs"
                                        onClick={() =>
                                          saveEditingMessage(message.id)
                                        }
                                        disabled={
                                          isSavingEdit ||
                                          !editingContent.trim() ||
                                          editingContent.trim() ===
                                            (message.content || "").trim()
                                        }
                                      >
                                        {isSavingEdit ? (
                                          <span className="loading loading-spinner loading-xs" />
                                        ) : (
                                          <Check size={14} />
                                        )}
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Deleted placeholder (ONLY when deleted) */}
                            {isDeleted && (
                              <p className="text-sm text-base-content/50 italic">
                                This message was deleted.
                              </p>
                            )}

                            {showMessageMeta && (
                              <div
                                className={`
                          flex justify-between items-center text-xs mt-1
                          ${isCurrentUser ? "text-base-content/60" : "text-base-content/50"}
                        `}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {formatLocalTime(
                                    getMessageDisplayTime(message),
                                  )}
                                  {messageEdited && (
                                    <Tooltip
                                      content="Message edited"
                                      position="top"
                                      wrapperClassName="inline-flex shrink-0"
                                    >
                                      <Pencil
                                        size={12}
                                        strokeWidth={2.25}
                                        aria-label="Message edited"
                                      />
                                    </Tooltip>
                                  )}
                                </span>
                                <span className="inline-flex items-center">
                                  {
                    <ReadReceipt
                      message={message}
                      isCurrentUser={isCurrentUser}
                      conversationType={conversationType}
                      teamMembers={teamMembers}
                      currentUserId={currentUserId}
                      getReadByTooltip={getReadByTooltip}
                    />
                  }
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing animation */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-lg p-3 rounded-bl-none">
              <div className="flex items-center">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="text-sm ml-2">
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <TeamDetailsModal
        isOpen={isTeamModalOpen}
        teamId={conversationType === "team" ? teamData?.id : selectedTeamId}
        initialTeamData={conversationType === "team" ? teamData : null}
        membersRefreshKey={teamMembersRefreshKey}
        hideMatchData
        onClose={handleTeamModalClose}
      />

      <VacantRoleDetailsModal
        isOpen={isRoleModalOpen}
        onClose={handleRoleModalClose}
        team={resolvedTeamData ?? teamData ?? null}
        role={selectedRoleData}
        isTeamMember={isCurrentUserTeamMember()}
        viewAsUserId={
          selectedRoleData?.filledByUserId ??
          selectedRoleData?.filled_by_user_id ??
          null
        }
        viewAsUser={
          selectedRoleData?.filledByUser ??
          selectedRoleData?.filled_by_user ??
          null
        }
        hideActions={
          String(selectedRoleData?.status ?? "").toLowerCase() !== "open"
        }
      />

      <UserDetailsModal
        isOpen={isUserModalOpen}
        userId={selectedUserId}
        onClose={handleUserModalClose}
      />
    </>
  );
};

export default MessageDisplay;
