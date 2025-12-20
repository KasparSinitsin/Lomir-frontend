import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";

const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  onlineUsers = [],
}) => {
  // State for team details modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedTeamData, setSelectedTeamData] = useState(null);

  // State for user details modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

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
      <div className="divide-y divide-base-200">
        {conversations.map((conversation) => {
          // Handle both direct messages and team conversations
          const isTeam = conversation.type === "team";
          const conversationData = isTeam
            ? conversation.team
            : conversation.partner;
          const isOnline = !isTeam && onlineUsers.includes(conversationData?.id);

          // Get display name
          const displayName = isTeam
            ? conversationData?.name
            : conversationData?.firstName && conversationData?.lastName
            ? `${conversationData.firstName} ${conversationData.lastName}`
            : conversationData?.username;

          const isActive =
            String(activeConversationId) === String(conversation.id);

          return (
            <div
              key={conversation.id}
              className={`
                p-4 cursor-pointer transition-colors duration-200
                ${
                  isActive
                    ? "bg-green-100 border-l-4 border-green-500"
                    : "hover:bg-base-200/50"
                }
              `}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-center">
                {/* Avatar - Clickable for both team and direct conversations */}
                <div
                  className="avatar indicator mr-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={isTeam ? (e) => handleTeamClick(e, conversationData) : (e) => handleUserClick(e, conversationData)}
                  title={isTeam ? `View ${conversationData?.name} details` : `View ${displayName} details`}
                >
                  <div className="w-12 h-12 rounded-full">
                    {conversationData?.avatarUrl ? (
                      <img
                        src={conversationData.avatarUrl}
                        alt={displayName}
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-primary text-primary-content flex items-center justify-center">
                        <span className="text-lg">
                          {isTeam
                            ? conversationData?.name?.charAt(0) || "T"
                            : conversationData?.firstName?.charAt(0) ||
                              conversationData?.username?.charAt(0) ||
                              "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  {isOnline && (
                    <span className="indicator-item badge badge-success badge-xs"></span>
                  )}
                  {isTeam && (
                    <span className="indicator-item badge badge-primary badge-xs">
                      T
                    </span>
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-center">
                    {/* Name - Clickable for both team and direct conversations */}
                    <h3
                      className="font-medium truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={isTeam ? (e) => handleTeamClick(e, conversationData) : (e) => handleUserClick(e, conversationData)}
                      title={isTeam ? `View ${conversationData?.name} details` : `View ${displayName} details`}
                    >
                      {displayName || "Unknown"}
                    </h3>
                    <span className="text-xs text-base-content/50 whitespace-nowrap ml-2">
                      {conversation.updatedAt
                        ? formatDistanceToNow(new Date(conversation.updatedAt), {
                            addSuffix: true,
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-sm text-base-content/70 truncate">
                    {conversation.lastMessage || "No messages yet"}
                  </p>
                  <p className="text-xs text-base-content/50">
                    {isTeam ? "Team Chat" : "Direct Message"}
                  </p>
                </div>
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