import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Archive,
  ChevronRight,
  CircleX,
  File,
  Crown,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  LogOut,
  Pencil,
  Search,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import Tooltip from "../common/Tooltip";
import { CountBadge } from "../common/NotificationBadge";
import { isSyntheticTeam } from "../../utils/userHelpers";
import { formatRelativeChatTimestamp, formatShortRelativeChatTimestamp } from "../../utils/dateHelpers";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import UserAvatar from "../users/UserAvatar";
import TeamAvatar from "../teams/TeamAvatar";
import {
  DELETED_USER_DISPLAY_NAME,
  getDisplayName as getDeletedUserDisplayName,
} from "../../utils/deletedUser";
import {
  getCachedChatTeamProfile,
  getCachedChatUserProfile,
  mergeResolvedTeamData,
  mergeResolvedUserData,
} from "../../utils/chatEntityResolvers";
import { getEventPreview } from "../../utils/eventPreview";

const EVENT_PREVIEW_ICONS = {
  AlertTriangle,
  Archive,
  CircleX,
  Crown,
  FileText,
  LogOut,
  Pencil,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderHighlightedText = (value, query) => {
  const text = String(value ?? "");
  const terms = String(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (!text || terms.length === 0) return text;

  const matcher = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    if (!part) return null;

    const isMatch = terms.some((term) =>
      new RegExp(`^${term}$`, "i").test(part),
    );

    if (!isMatch) return part;

    return (
      <mark
        key={`${part}-${index}`}
        className="rounded-full bg-yellow-100 px-1.5 py-0.5"
        // Highlight only adds the yellow background — keep the surrounding text's
        // colour and weight (override the browser's default <mark> styling).
        style={{ color: "inherit", fontWeight: "inherit" }}
      >
        {part}
      </mark>
    );
  });
};

const MENTION_TOKEN_RE = /@\[([^\]]+)\]\([^)]+\)/g;

const stripMentionTokens = (text) =>
  text ? text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1") : text;

const MESSAGE_PAYLOAD_KEYS = [
  "lastMessage",
  "last_message",
  "latestMessage",
  "latest_message",
  "recentMessage",
  "recent_message",
  "message",
];

const FILE_NAME_KEYS = [
  "fileName",
  "file_name",
  "filename",
  "file",
  "lastMessageFileName",
  "last_message_file_name",
  "lastMessageFilename",
  "last_message_filename",
  "lastFileName",
  "last_file_name",
  "latestMessageFileName",
  "latest_message_file_name",
];

const FILE_URL_KEYS = [
  "fileUrl",
  "file_url",
  "lastMessageFileUrl",
  "last_message_file_url",
  "lastFileUrl",
  "last_file_url",
  "latestMessageFileUrl",
  "latest_message_file_url",
];

const IMAGE_URL_KEYS = [
  "imageUrl",
  "image_url",
  "lastMessageImageUrl",
  "last_message_image_url",
  "lastImageUrl",
  "last_image_url",
  "latestMessageImageUrl",
  "latest_message_image_url",
];

const CONTENT_KEYS = ["content", "message", "text", "body"];

const pickFirst = (source, keys) => {
  if (!source || typeof source !== "object") return undefined;

  for (const key of keys) {
    const value = source[key];
    if (value != null && value !== "") return value;
  }

  return undefined;
};

const SPREADSHEET_EXTENSIONS = ["xls", "xlsx", "csv"];

const getFileTypeLabel = (fileName) => {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (SPREADSHEET_EXTENSIONS.includes(ext)) return "Spreadsheet";
  return "File";
};

const normalizeFileName = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.fileName || value.file_name || value.name || "";
  }
  return String(value);
};

const getAttachmentPreviewIcon = (attachmentPreview) => {
  if (attachmentPreview?.type === "image") return ImageIcon;

  const extension = attachmentPreview?.fileName?.split(".").pop()?.toLowerCase();

  if (["pdf", "doc", "docx", "txt"].includes(extension)) return FileText;
  if (["xls", "xlsx", "csv"].includes(extension)) return FileSpreadsheet;

  return File;
};

const getFormattedAttachmentPreview = (text) => {
  const value = String(text || "");
  const fileMatch = value.match(/^(?:File|Spreadsheet)\s+"(.+)"\s+sent$/);

  if (fileMatch) {
    return {
      text: value,
      type: "file",
      fileName: fileMatch[1],
    };
  }

  if (value === "Image sent") {
    return {
      text: value,
      type: "image",
    };
  }

  const imageMatch = value.match(/^Image\s+"(.+)"\s+sent$/);

  if (imageMatch) {
    return {
      text: value,
      type: "image",
      fileName: imageMatch[1],
    };
  }

  return null;
};

const getConversationLastMessagePayload = (conversation) => {
  if (!conversation) return {};

  for (const key of MESSAGE_PAYLOAD_KEYS) {
    const value = conversation[key];
    if (value && typeof value === "object") return value;
  }

  return {};
};

const getConversationMessagePayloadCandidates = (conversation) => {
  const candidates = [conversation, getConversationLastMessagePayload(conversation)];

  MESSAGE_PAYLOAD_KEYS.forEach((key) => {
    const value = conversation?.[key];
    if (value && typeof value === "object" && !candidates.includes(value)) {
      candidates.push(value);
    }
  });

  return candidates.filter(Boolean);
};

const getConversationLastMessageText = (conversation) => {
  const lastMessage =
    conversation?.lastMessage ??
    conversation?.last_message ??
    conversation?.latestMessage ??
    conversation?.latest_message;

  if (typeof lastMessage === "string") return lastMessage;

  if (lastMessage && typeof lastMessage === "object") {
    return pickFirst(lastMessage, CONTENT_KEYS) ?? "";
  }

  return pickFirst(conversation, [
    "lastMessageContent",
    "last_message_content",
    "latestMessageContent",
    "latest_message_content",
  ]) ?? "";
};

const getConversationAttachmentPreview = (conversation) => {
  const candidates = getConversationMessagePayloadCandidates(conversation);
  const fileName = normalizeFileName(candidates
    .map((candidate) => pickFirst(candidate, FILE_NAME_KEYS))
    .find(Boolean));
  const fileUrl = candidates
    .map((candidate) => pickFirst(candidate, FILE_URL_KEYS))
    .find(Boolean);
  const imageUrl = candidates
    .map((candidate) => pickFirst(candidate, IMAGE_URL_KEYS))
    .find(Boolean);

  if (imageUrl) {
    return {
      text: fileName ? `Image "${fileName}" sent` : "Image sent",
      type: "image",
      fileName,
    };
  }

  if (fileName || fileUrl) {
    const label = getFileTypeLabel(fileName);
    return {
      text: `${label} "${fileName || "attachment"}" sent`,
      type: "file",
      fileName,
    };
  }

  return null;
};

const renderPreviewWithMentions = (text, query) => {
  if (!text) return null;
  const parts = [];
  let last = 0;
  let m;
  MENTION_TOKEN_RE.lastIndex = 0;
  while ((m = MENTION_TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "mention", name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });

  return parts.map((part, idx) =>
    part.type === "mention" ? (
      <span key={idx} className="text-primary font-medium">@{part.name}</span>
    ) : (
      <React.Fragment key={idx}>{renderHighlightedText(part.value, query)}</React.Fragment>
    ),
  );
};

const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  onActiveConversationVisibilityChange,
  teamMembersRefreshSignal = null,
  emptyState = null,
  searchQuery = "",
  chatVisible = true,
  currentUser = null,
}) => {
  // State for team details modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeamData, setSelectedTeamData] = useState(null);
  const [teamMembersRefreshKey, setTeamMembersRefreshKey] = useState(0);

  // State for user details modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [resolvedConversationUsers, setResolvedConversationUsers] = useState({});
  const [resolvedConversationTeams, setResolvedConversationTeams] = useState({});

  // Ref for the active conversation item
  const activeConversationRef = useRef(null);

  // Scroll active conversation into view when it changes
  useEffect(() => {
    if (activeConversationRef.current) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        activeConversationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!onActiveConversationVisibilityChange) return undefined;

    const activeItem = activeConversationRef.current;
    if (!activeItem) {
      onActiveConversationVisibilityChange(true);
      return undefined;
    }

    const scrollRoot = activeItem.closest(
      "[data-conversation-list-viewport='true']",
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        onActiveConversationVisibilityChange(
          entry.isIntersecting && entry.intersectionRatio > 0,
        );
      },
      {
        root: scrollRoot,
        threshold: [0, 0.01, 1],
      },
    );

    observer.observe(activeItem);
    return () => observer.disconnect();
  }, [
    activeConversationId,
    conversations,
    onActiveConversationVisibilityChange,
  ]);

  useEffect(() => {
    const userIdsToFetch = [];
    const teamIdsToFetch = [];

    // getConversations already embeds everything this list renders — name,
    // avatar and (as of the N+1 fix) the synthetic flag. Avatar and synthetic
    // status come from the same DB columns getTeamById/getUserById would read,
    // so a null avatar is a valid final state, not a reason to re-fetch. Only
    // resolve when the synthetic flag is genuinely absent, which keeps a
    // graceful fallback if an older backend omits it from the payload.
    conversations.forEach((conversation) => {
      if (conversation.type === "team") {
        const team = conversation.team;
        const teamId = team?.id ?? conversation.id;

        if (
          teamId != null &&
          team?.is_synthetic == null &&
          team?.isSynthetic == null
        ) {
          teamIdsToFetch.push(teamId);
        }

        return;
      }

      const partner = conversation.partner || conversation.partnerUser;
      const userId = partner?.id;

      if (
        userId != null &&
        partner?.is_synthetic == null &&
        partner?.isSynthetic == null
      ) {
        userIdsToFetch.push(userId);
      }
    });

    const uniqueUserIds = [...new Set(userIdsToFetch)];
    const uniqueTeamIds = [...new Set(teamIdsToFetch)];

    if (uniqueUserIds.length === 0 && uniqueTeamIds.length === 0) {
      return undefined;
    }

    let cancelled = false;

    if (uniqueUserIds.length > 0) {
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
          setResolvedConversationUsers((prev) => ({
            ...prev,
            ...fetchedProfiles,
          }));
        }
      });
    }

    if (uniqueTeamIds.length > 0) {
      Promise.allSettled(
        uniqueTeamIds.map(async (teamId) => ({
          teamId,
          profile: await getCachedChatTeamProfile(teamId),
        })),
      ).then((results) => {
        if (cancelled) return;

        const fetchedProfiles = {};

        results.forEach((result) => {
          if (result.status !== "fulfilled") return;
          fetchedProfiles[String(result.value.teamId)] = result.value.profile;
        });

        if (Object.keys(fetchedProfiles).length > 0) {
          setResolvedConversationTeams((prev) => ({
            ...prev,
            ...fetchedProfiles,
          }));
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [conversations]);

  useEffect(() => {
    if (
      !teamMembersRefreshSignal?.teamId ||
      !isTeamModalOpen ||
      String(selectedTeamId) !== String(teamMembersRefreshSignal.teamId)
    ) {
      return;
    }

    setTeamMembersRefreshKey((prev) => prev + 1);
  }, [isTeamModalOpen, selectedTeamId, teamMembersRefreshSignal]);

  // Handle team avatar/name click to open TeamDetailsModal
  const handleTeamClick = (e, team) => {
    e.stopPropagation(); // Prevent selecting the conversation
    if (team?.id) {
      setSelectedTeamId(team.id);
      setSelectedTeamData(team);
      setIsTeamModalOpen(true);
    }
  };

  // Handle closing the team details modal
  const handleTeamModalClose = () => {
    setIsTeamModalOpen(false);
    setSelectedTeamId(null);
    setSelectedTeamData(null);
  };

  // Handle user avatar/name click to open UserDetailsModal
  const handleUserClick = (e, user) => {
    e.stopPropagation(); // Prevent selecting the conversation
    if (user?.id) {
      setSelectedUserId(user.id);
      setIsUserModalOpen(true);
    }
  };

  // Handle closing the user details modal
  const handleUserModalClose = () => {
    setIsUserModalOpen(false);
    setSelectedUserId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="loading loading-spinner loading-md text-primary"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    const emptyTitle = emptyState?.title || "No conversations yet";
    const emptyDescription =
      emptyState?.description ||
      `Start chatting with other people or team members by visiting their profile and clicking "Send Message"`;
    const showEmptyActions = emptyState?.showActions !== false;

    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-base-content/70 mb-2">{emptyTitle}</p>
        <p className="text-sm text-base-content/50">{emptyDescription}</p>
        {showEmptyActions && (
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/search?type=users"
              className="btn btn-sm btn-primary gap-2"
            >
              <User size={16} />
              Find People
            </Link>
            <Link
              to="/search?type=teams"
              className="btn btn-sm btn-primary gap-2"
            >
              <Users size={16} />
              Find Teams
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-w-0 space-y-3">
        {conversations.map((conversation) => {
          // Handle both direct messages and team conversations
          const isTeam = conversation.type === "team";
          const rawConversationData = isTeam
            ? conversation.team
            : conversation.partner || conversation.partnerUser;
          const conversationEntityId = isTeam
            ? rawConversationData?.id ?? conversation.id
            : rawConversationData?.id;
          const conversationData = isTeam
            ? mergeResolvedTeamData(
                rawConversationData,
                conversationEntityId != null
                  ? resolvedConversationTeams[String(conversationEntityId)]
                  : null,
              )
            : mergeResolvedUserData(
                rawConversationData,
                conversationEntityId != null
                  ? resolvedConversationUsers[String(conversationEntityId)]
                  : null,
              );
          const directDisplayName = isTeam
            ? ""
            : getDeletedUserDisplayName(conversationData, "");
          const isFormerPartner = !isTeam && !directDisplayName;
          const isUserClickable =
            !isTeam && !isFormerPartner && Boolean(conversationData?.id);
          // Get display name
          const displayName = isTeam
            ? conversationData?.name
            : directDisplayName || DELETED_USER_DISPLAY_NAME;
          const isSearchActive = Boolean(searchQuery.trim());
          const lastMessageText = getConversationLastMessageText(conversation);
          const attachmentPreview =
            getConversationAttachmentPreview(conversation);
          const eventPreview = getEventPreview(
            lastMessageText,
            currentUser,
          );
          // During search the matched message may be an older system/event
          // message (not the conversation's last message). Style it through the
          // same canonical getEventPreview path so it keeps its icon, colour and
          // weight instead of falling back to raw/plain text.
          const hasSearchMessageMatch =
            isSearchActive && Boolean(conversation.searchMatchContent);
          const searchEventPreview = hasSearchMessageMatch
            ? getEventPreview(conversation.searchMatchContent, currentUser)
            : null;
          // When the hit is on the conversation's metadata (e.g. team name) and
          // no message matched, the preview shows the last message — style it the
          // same way the non-search list does instead of leaving it raw.
          const activeEventPreview = isSearchActive
            ? hasSearchMessageMatch
              ? searchEventPreview
              : eventPreview
            : eventPreview;
          const shouldUseEventPreview = Boolean(activeEventPreview);
          const EventPreviewIcon = shouldUseEventPreview
            ? EVENT_PREVIEW_ICONS[activeEventPreview.icon]
            : null;
          const previewText = shouldUseEventPreview
            ? activeEventPreview.text
            : isSearchActive && conversation.searchMatchPreview
              ? conversation.searchMatchPreview
              : attachmentPreview?.text || lastMessageText || "No messages yet";
          const formattedAttachmentPreview =
            !isSearchActive && !attachmentPreview
              ? getFormattedAttachmentPreview(previewText)
              : null;
          const visibleAttachmentPreview =
            attachmentPreview || formattedAttachmentPreview;
          const hasConversationPreview = Boolean(
            shouldUseEventPreview ||
              visibleAttachmentPreview ||
              lastMessageText ||
              (isSearchActive && conversation.searchMatchPreview),
          );
          const timestamp =
            isSearchActive && conversation.searchMatchCreatedAt
              ? conversation.searchMatchCreatedAt
              : conversation.updatedAt;

          const isActive =
            chatVisible && String(activeConversationId) === String(conversation.id);

          // Archived (deleted, scheduled-for-deletion) team conversation —
          // backend getConversations exposes archived_at/status on the team.
          const isArchived =
            isTeam &&
            Boolean(
              conversationData?.archived_at ||
                conversationData?.archivedAt ||
                conversationData?.status === "inactive",
            );

          const conversationCard = (
            <div className={isActive ? "lomir-active-conversation-wrap" : undefined}>
              {isActive && (
                <span
                  className={`lomir-active-conversation-arrow${
                    isArchived ? " lomir-active-conversation-arrow--archived" : ""
                  }`}
                  aria-hidden="true"
                />
              )}
              <div
                ref={isActive ? activeConversationRef : null}
                className={`
                  p-4 mr-4 cursor-pointer rounded-lg border shadow-soft transition-all duration-300 hover:shadow-md group
                  ${
                    isActive
                      ? `lomir-active-conversation-card border-transparent ${
                          isArchived ? "bg-red-500/10" : "bg-green-100"
                        }`
                      : "bg-white/80 border-base-200"
                  }
                `}
                onClick={() => onSelectConversation(conversation.id)}
              >
              <div className="flex items-center">
                {/* Avatar - Clickable for both team and direct conversations */}
                <Tooltip
                  content={
                    isTeam
                      ? `View ${conversationData?.name} details`
                      : isUserClickable
                        ? `View ${displayName} details`
                        : undefined
                  }
                  wrapperClassName="inline-flex items-center mr-3"
                >
                <div
                  className={`avatar indicator relative ${
                    isTeam || isUserClickable
                      ? "cursor-pointer hover:opacity-80 transition-opacity"
                      : ""
                  }`}
                  onClick={
                    isTeam
                      ? (e) => handleTeamClick(e, conversationData)
                      : isUserClickable
                        ? (e) => handleUserClick(e, conversationData)
                        : undefined
                  }
                >
                  {isTeam ? (
                    <TeamAvatar
                      team={conversationData}
                      sizeClass="w-14 h-14"
                      initialsClassName="text-xl font-medium"
                      showDemoOverlay={isSyntheticTeam(conversationData)}
                      demoOverlayTextClassName="text-[8px]"
                    />
                  ) : (
                    <UserAvatar
                      user={isFormerPartner ? null : conversationData}
                      deleted={isFormerPartner}
                      sizeClass="w-14 h-14"
                      iconSize={28}
                      initialsClassName="text-xl font-medium"
                      showDemoOverlay
                      demoOverlayTextClassName="text-[8px]"
                      demoOverlayTextTranslateClassName="-translate-y-[2px]"
                    />
                  )}
                  {(conversation.unreadCount || conversation.unread_count) > 0 && (
                    <CountBadge
                      count={conversation.unreadCount ?? conversation.unread_count}
                      className="absolute -top-1 -left-2 z-10"
                    />
                  )}
                </div>
                </Tooltip>

                <div className="flex-grow min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-center min-w-0">
                    {/* Name - Clickable for both team and direct conversations */}
                    <Tooltip
                      content={
                        isUserClickable
                          ? `Click to view ${displayName}'s details`
                          : isTeam
                            ? `Click to view ${displayName} details`
                            : displayName?.length > 22
                              ? displayName
                              : undefined
                      }
                      wrapperClassName="block min-w-0 flex-1 overflow-hidden"
                    >
                      <h3
                        className={`font-medium truncate text-sm ${
                          isTeam || isUserClickable
                            ? "cursor-pointer hover:text-primary transition-colors"
                            : ""
                        }`}
                        style={{ color: "#036b0c" }}
                        onClick={
                          isTeam
                            ? (e) => handleTeamClick(e, conversationData)
                            : isUserClickable
                              ? (e) => handleUserClick(e, conversationData)
                              : undefined
                        }
                      >
                        {renderHighlightedText(displayName || "Unknown", searchQuery)}
                      </h3>
                    </Tooltip>
                  </div>
                  <Tooltip
                    content={
                      (previewText?.length ?? 0) > 60
                        ? stripMentionTokens(previewText)
                        : undefined
                    }
                    position="bottom"
                    wrapperClassName="block min-w-0 overflow-hidden"
                  >
                    {shouldUseEventPreview && EventPreviewIcon ? (
                      <p
                        className="text-sm font-medium truncate"
                        style={{
                          color: activeEventPreview.color,
                          ...(activeEventPreview.backgroundColor
                            ? {
                                backgroundColor: activeEventPreview.backgroundColor,
                                borderRadius: "0.375rem",
                                maxWidth: "100%",
                                paddingLeft: "3px",
                                paddingRight: "3px",
                                width: "fit-content",
                              }
                            : {}),
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-1">
                          <EventPreviewIcon
                            size={14}
                            className="flex-shrink-0"
                          />
                          <span className="truncate">
                            {renderHighlightedText(previewText, searchQuery)}
                          </span>
                        </span>
                      </p>
                    ) : visibleAttachmentPreview ? (
                      <p className="text-sm text-base-content/70 truncate">
                        <span className="flex min-w-0 items-center gap-1">
                          {React.createElement(
                            getAttachmentPreviewIcon(visibleAttachmentPreview),
                            {
                              size: 14,
                              className: "flex-shrink-0 text-primary",
                            },
                          )}
                          <span className="truncate">
                            {renderPreviewWithMentions(previewText, searchQuery)}
                          </span>
                        </span>
                      </p>
                    ) : hasConversationPreview ? (
                      <p className="text-sm text-base-content/70 truncate">
                        {renderPreviewWithMentions(previewText, searchQuery)}
                      </p>
                    ) : (
                      <p className="text-sm text-base-content/50 truncate italic">
                        This message was deleted.
                      </p>
                    )}
                  </Tooltip>
                  <div className="flex items-center min-w-0 gap-2">
                    <p
                      className="lomir-conversation-kind text-xs flex-1 min-w-0 flex items-center gap-1 overflow-hidden"
                      style={{ color: "#036b0c" }}
                    >
                      {isTeam ? (
                        <>
                          {isArchived && (
                            <Archive
                              size={12}
                              className="flex-shrink-0 text-red-600"
                            />
                          )}
                          <Users size={12} className="flex-shrink-0" />
                          <span className={`lomir-conversation-kind-label whitespace-nowrap ${isSearchActive && chatVisible ? "hidden sm:inline md:hidden" : "inline"}`}>
                            {renderHighlightedText("Team Chat", searchQuery)}
                          </span>
                        </>
                      ) : (
                        <>
                          <User size={12} className="flex-shrink-0" />
                          <span className={`lomir-conversation-kind-label whitespace-nowrap ${isSearchActive && chatVisible ? "hidden sm:inline md:hidden" : "inline"}`}>
                            {renderHighlightedText("Direct Message Chat", searchQuery)}
                          </span>
                        </>
                      )}
                      {isSearchActive && conversation.searchMatchCount > 0 && (() => {
                        const count = conversation.searchMatchCount;
                        const matchWord = count === 1 ? "match" : "matches";
                        const query = searchQuery.trim();
                        return (
                          <>
                            <Search size={12} className="flex-shrink-0 ml-2" />
                            {chatVisible ? (
                              /* Split-view: narrow column */
                              <>
                                <span className="whitespace-nowrap sm:hidden">{count}</span>
                                <span className="truncate whitespace-nowrap hidden sm:inline md:hidden">
                                  {count} search {matchWord} for &ldquo;{query}&rdquo;
                                </span>
                                <span className="whitespace-nowrap hidden md:inline">{count}</span>
                              </>
                            ) : (
                              /* Full-width: show full text at sm+ */
                              <>
                                <span className="whitespace-nowrap sm:hidden">{count}</span>
                                <span className="truncate whitespace-nowrap hidden sm:inline">
                                  {count} search {matchWord} for &ldquo;{query}&rdquo;
                                </span>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </p>
                    <span className="flex-shrink-0 ml-2 text-xs whitespace-nowrap" style={{ color: "#036b0c" }}>
                      {chatVisible ? (
                        <>
                          <span className="md:hidden">{formatRelativeChatTimestamp(timestamp)}</span>
                          <span className="hidden md:inline">{formatShortRelativeChatTimestamp(timestamp)}</span>
                        </>
                      ) : formatRelativeChatTimestamp(timestamp)}
                    </span>
                  </div>
                </div>

                {(!isActive || chatVisible) && (
                  <Tooltip
                    content={isActive ? "Deselect Conversation" : "Open conversation"}
                    position="top"
                    wrapperClassName="inline-flex items-center flex-shrink-0 ml-1 -mr-4"
                  >
                    <button
                      type="button"
                      aria-label={isActive ? "Deselect Conversation" : "Open conversation"}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectConversation(conversation.id);
                      }}
                      className={`flex items-center justify-center p-2 transition-opacity ${
                        isActive
                          ? "opacity-0"
                          : "md:opacity-0 md:group-hover:opacity-100"
                      }`}
                    >
                      <ChevronRight size={16} className="text-base-content/70" />
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
            </div>
          );

          return (
            <Tooltip
              key={`${conversation.type}-${conversation.id}`}
              content={isActive ? "Deselect Conversation" : undefined}
              position="top"
              wrapperClassName="block"
            >
              {conversationCard}
            </Tooltip>
          );
        })}
      </div>

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamModalOpen}
        teamId={selectedTeamId}
        initialTeamData={selectedTeamData}
        membersRefreshKey={teamMembersRefreshKey}
        hideMatchData
        onClose={handleTeamModalClose}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={isUserModalOpen}
        userId={selectedUserId}
        onClose={handleUserModalClose}
      />
    </>
  );
};

export default ConversationList;
