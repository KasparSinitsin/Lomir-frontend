import React from "react";
import { formatDistanceToNow } from "date-fns";

const ConversationList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  onlineUsers = [],
}) => {
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

        return (
          <div
            key={conversation.id}
            className={`
              p-4 cursor-pointer hover:bg-base-200/50 transition-colors duration-200
              ${
                activeConversationId === conversation.id ? "bg-base-200/70" : ""
              }
            `}
            onClick={() => onSelectConversation(conversation.id)}
          >
            <div className="flex items-center">
              <div className="avatar indicator mr-3">
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
                  <h3 className="font-medium truncate">
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
  );
};

export default ConversationList;
