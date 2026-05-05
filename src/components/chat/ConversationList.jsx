import React, { useState, useEffect, useRef } from "react";
import { Users, User, ChevronRight } from "lucide-react";
import Tooltip from "../common/Tooltip";
import { CountBadge } from "../common/NotificationBadge";
import { getTeamInitials, isSyntheticTeam } from "../../utils/userHelpers";
import { formatDistanceToNow } from "date-fns";
import { normalizeTimestampToDate } from "../../utils/dateHelpers";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import UserAvatar from "../users/UserAvatar";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
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

const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  teamMembersRefreshSignal = null,
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
    const userIdsToFetch = [];
    const teamIdsToFetch = [];

    conversations.forEach((conversation) => {
      if (conversation.type === "team") {
        const team = conversation.team;
        const teamId = team?.id ?? conversation.id;

        if (
          teamId != null &&
          (!getTeamAvatarUrl(team) ||
            (team?.is_synthetic == null && team?.isSynthetic == null))
        ) {
          teamIdsToFetch.push(teamId);
        }

        return;
      }

      const partner = conversation.partner || conversation.partnerUser;
      const userId = partner?.id;

      if (
        userId != null &&
        (!(partner?.avatar_url || partner?.avatarUrl) ||
          (partner?.is_synthetic == null && partner?.isSynthetic == null))
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
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-base-content/70 mb-2">No conversations yet</p>
        <p className="text-sm text-base-content/50">
          Start chatting with team members by visiting their profile and
          clicking "Send Message"
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-base-200 w-full min-w-0">
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

          const isActive =
            String(activeConversationId) === String(conversation.id);

          return (
            <div
              key={`${conversation.type}-${conversation.id}`}
              ref={isActive ? activeConversationRef : null}
              className={`
                p-4 cursor-pointer transition-colors duration-200 group
                ${
                  isActive
                    ? "bg-green-100"
                    : "hover:bg-base-200/50"
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
                    <div className="w-14 h-14 rounded-full relative overflow-hidden">
                      {getTeamAvatarUrl(conversationData) ? (
                        <img
                          src={getTeamAvatarUrl(conversationData)}
                          alt={displayName}
                          className="object-cover w-full h-full rounded-full"
                          onError={(e) => {
                            e.target.style.display = "none";
                            const fallback =
                              e.target.parentElement.querySelector(
                                ".avatar-fallback",
                              );
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                        style={{
                          display: getTeamAvatarUrl(conversationData)
                            ? "none"
                            : "flex",
                        }}
                      >
                        <span className="text-xl font-medium">
                          {getTeamInitials(conversationData)}
                        </span>
                      </div>
                      {isSyntheticTeam(conversationData) && (
                        <DemoAvatarOverlay textClassName="text-[8px]" />
                      )}
                    </div>
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
                        {displayName || "Unknown"}
                      </h3>
                    </Tooltip>
                  </div>
                  <Tooltip
                    content={
                      (conversation.lastMessage?.length ?? 0) > 60
                        ? conversation.lastMessage
                        : undefined
                    }
                    position="bottom"
                    wrapperClassName="block min-w-0 overflow-hidden"
                  >
                    <p className="text-sm text-base-content/70 truncate">
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                  </Tooltip>
                  <div className="flex items-center min-w-0 gap-2">
                    <p
                      className="text-xs truncate flex-1 min-w-0 flex items-center gap-1"
                      style={{ color: "#036b0c" }}
                    >
                      {isTeam ? (
                        <>
                          <Users size={12} className="flex-shrink-0" />
                          <span>Team chat</span>
                        </>
                      ) : (
                        <>
                          <User size={12} className="flex-shrink-0" />
                          <span>DM Chat</span>
                        </>
                      )}
                    </p>
                    <span className="flex-shrink-0 ml-2 text-xs whitespace-nowrap" style={{ color: "#036b0c" }}>
                      {conversation.updatedAt
                        ? formatDistanceToNow(
                            normalizeTimestampToDate(conversation.updatedAt) || new Date(),
                            {
                              addSuffix: true,
                            },
                          ).replace("about ", "")
                        : ""}
                    </span>
                  </div>
                </div>

                {/* Chevron button - visible on mobile, hover on desktop */}
                <Tooltip content="Open conversation" position="top" wrapperClassName="inline-flex items-center flex-shrink-0 ml-1 -mr-4">
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className="flex items-center justify-center p-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={16} className="text-base-content/70" />
                  </button>
                </Tooltip>
              </div>
            </div>
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
