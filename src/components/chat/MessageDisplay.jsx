import React, { useRef, useEffect } from "react";
import { format, isToday, isYesterday } from "date-fns";

const MessageDisplay = ({
  messages,
  currentUserId,
  conversationPartner,
  teamData, 
  loading,
  typingUsers = [],
  conversationType = "direct",
  teamMembers = [],
}) => {


  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Add debugging
  useEffect(() => {
    if (conversationType === "team") {
      console.log("=== TEAM CHAT DEBUG ===");
      console.log("Team members:", teamMembers);
      console.log("Messages:", messages);
      console.log(
        "Sample message senderId:",
        messages[0]?.senderId,
        typeof messages[0]?.senderId
      );
      if (teamMembers.length > 0) {
        console.log(
          "Sample team member user_id:",
          teamMembers[0]?.user_id,
          typeof teamMembers[0]?.user_id
        );
      }
    }
  }, [teamMembers, messages, conversationType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading loading-spinner loading-md text-primary"></div>
      </div>
    );
  }

if (messages.length === 0 && typingUsers.length === 0) {
  return (
    <div className="space-y-6">
      {/* Show conversation partner header for direct messages */}
      {conversationPartner && conversationType === "direct" && (
        <div className="text-center pb-4 mb-4 border-b border-base-200">
          <div className="avatar mb-2">
            <div className="w-16 h-16 rounded-full mx-auto">
              {conversationPartner.avatarUrl ? (
                <img
                  src={conversationPartner.avatarUrl}
                  alt={conversationPartner.username}
                  className="object-cover"
                />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center">
                  <span className="text-xl">
                    {conversationPartner.firstName?.charAt(0) ||
                      conversationPartner.username?.charAt(0) ||
                      "?"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <h3 className="font-medium">
            {conversationPartner.firstName && conversationPartner.lastName
              ? `${conversationPartner.firstName} ${conversationPartner.lastName}`
              : conversationPartner.username}
          </h3>
        </div>
      )}

      {/* Show team header for team conversations */}
      {teamData && conversationType === "team" && (
        <div className="text-center pb-4 mb-4 border-b border-base-200">
          <div className="avatar mb-2">
            <div className="w-16 h-16 rounded-full mx-auto">
              {teamData.avatarUrl ? (
                <img
                  src={teamData.avatarUrl}
                  alt={teamData.name}
                  className="object-cover"
                />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center">
                  <span className="text-xl">
                    {teamData.name?.charAt(0) || "T"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <h3 className="font-medium">{teamData.name}</h3>
          <p className="text-sm text-base-content/70">Team Chat</p>
        </div>
      )}

      {/* No messages message */}
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-base-content/70">No messages yet</p>
        <p className="text-sm text-base-content/50 mt-2">
          Send a message to start the conversation
        </p>
      </div>
    </div>
  );
}

  // Helper function to group consecutive messages by sender (max 3 per group)
  const groupMessages = (messages) => {
    if (!messages.length) return [];

    const groups = [];
    let currentGroup = {
      senderId: messages[0].senderId,
      messages: [messages[0]],
      showSenderInfo: true,
    };

    for (let i = 1; i < messages.length; i++) {
      const message = messages[i];

      const shouldStartNewGroup =
        message.senderId !== currentGroup.senderId ||
        currentGroup.messages.length >= 3;

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

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt);
    const dateString = format(date, "yyyy-MM-dd");

    if (!groups[dateString]) {
      groups[dateString] = [];
    }

    groups[dateString].push(message);
    return groups;
  }, {});

  const formatDateHeading = (dateString) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return "Today";
    }

    if (isYesterday(date)) {
      return "Yesterday";
    }

    return format(date, "EEEE, MMMM d, yyyy");
  };

  // Helper function to get sender information
const getSenderInfo = (senderId) => {
  if (conversationType === "direct") {
    return conversationPartner;
  }

  // For team chats, find the sender in team members
  console.log(`Looking for sender ID: ${senderId} (type: ${typeof senderId})`);
  console.log("Available team members:", teamMembers.map((m) => ({
    user_id: m.user_id || m.userId, // Handle both property names
    type: typeof (m.user_id || m.userId),
    username: m.username,
    first_name: m.first_name || m.firstName,
    avatar_url: m.avatar_url || m.avatarUrl,
  })));

  // Convert senderId to number if it's a string
  const senderIdNum = parseInt(senderId, 10);

  const member = teamMembers.find((m) => {
    // Handle both userId and user_id property names
    const memberId = parseInt(m.user_id || m.userId || m.id, 10);
    return memberId === senderIdNum;
  });

  console.log(`Found member for sender ${senderId}:`, member);

  if (member) {
    const senderInfo = {
      id: member.user_id || member.userId || member.id,
      username: member.username,
      firstName: member.first_name || member.firstName,
      lastName: member.last_name || member.lastName,
      avatarUrl: member.avatar_url || member.avatarUrl,
    };
    console.log("Returning sender info:", senderInfo);
    return senderInfo;
  }

  // Fallback
  console.log(`No member found for sender ${senderId}, using fallback`);
  return {
    id: senderId,
    username: `User ${senderId}`,
    firstName: null,
    lastName: null,
    avatarUrl: null,
  };
};

  // Helper function to get display name
  const getDisplayName = (senderInfo) => {
    if (senderInfo.firstName && senderInfo.lastName) {
      return `${senderInfo.firstName} ${senderInfo.lastName}`;
    }
    if (senderInfo.firstName) {
      return senderInfo.firstName;
    }
    return senderInfo.username || `User ${senderInfo.id}`;
  };

  // Helper function to render avatar
  const renderAvatar = (senderInfo) => {
    console.log("Rendering avatar for:", senderInfo);

    return (
      <div className="avatar mr-3 self-end">
        <div className="w-8 h-8 rounded-full">
          {senderInfo.avatarUrl ? (
            <img
              src={senderInfo.avatarUrl}
              alt={senderInfo.username || "User"}
              className="object-cover w-full h-full rounded-full"
              onError={(e) => {
                console.log(
                  "Avatar image failed to load:",
                  senderInfo.avatarUrl
                );
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full">
              <span className="text-sm font-medium">
                {senderInfo.firstName?.charAt(0)?.toUpperCase() ||
                  senderInfo.username?.charAt(0)?.toUpperCase() ||
                  "?"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Debug information
      {conversationType === "team" && import.meta.env.DEV && (
        <div className="bg-yellow-100 p-2 rounded text-xs">
          <strong>Debug Info:</strong>
          <br />
          Team Members Count: {teamMembers.length}
          <br />
          Messages Count: {messages.length}
          <br />
          {teamMembers.length > 0 && (
            <>
              Sample Member: {teamMembers[0]?.username} (ID:{" "}
              {teamMembers[0]?.user_id})
              <br />
            </>
          )}
          {messages.length > 0 && (
            <>Sample Message Sender: {messages[0]?.senderId}</>
          )}
        </div>
      )} */}


      {conversationPartner && conversationType === "direct" && (
        <div className="text-center pb-4 mb-4 border-b border-base-200">
          <div className="avatar mb-2">
            <div className="w-16 h-16 rounded-full mx-auto">
              {conversationPartner.avatarUrl ? (
                <img
                  src={conversationPartner.avatarUrl}
                  alt={conversationPartner.username}
                  className="object-cover"
                />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center">
                  <span className="text-xl">
                    {conversationPartner.firstName?.charAt(0) ||
                      conversationPartner.username?.charAt(0) ||
                      "?"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <h3 className="font-medium">
            {conversationPartner.firstName && conversationPartner.lastName
              ? `${conversationPartner.firstName} ${conversationPartner.lastName}`
              : conversationPartner.username}
          </h3>
        </div>
      )}

{teamData && conversationType === "team" && (
  <div className="text-center pb-4 mb-4 border-b border-base-200">
    <div className="avatar mb-2">
      <div className="w-16 h-16 rounded-full mx-auto">
        {teamData.avatarUrl ? (
          <img
            src={teamData.avatarUrl}
            alt={teamData.name}
            className="object-cover"
          />
        ) : (
          <div className="bg-primary text-primary-content flex items-center justify-center">
            <span className="text-xl">
              {teamData.name?.charAt(0) || "T"}
            </span>
          </div>
        )}
      </div>
    </div>
    <h3 className="font-medium">{teamData.name}</h3>
    <p className="text-sm text-base-content/70">Team Chat</p>
  </div>
)}

      

      {/* Group messages by date */}
      {Object.entries(messagesByDate).map(([dateString, messagesForDate]) => (
        <div key={dateString} className="space-y-4">
          <div className="text-center">
            <div className="badge badge-neutral badge-sm">
              {formatDateHeading(dateString)}
            </div>
          </div>

          {/* Group consecutive messages by sender */}
          {groupMessages(messagesForDate).map((messageGroup, groupIndex) => {
            const isCurrentUser = messageGroup.senderId === currentUserId;
            const senderInfo = getSenderInfo(messageGroup.senderId);
            const displayName = getDisplayName(senderInfo);

            return (
              <div
                key={`${dateString}-group-${groupIndex}`}
                className={`flex ${
                  isCurrentUser ? "justify-end" : "justify-start"
                }`}
              >
                {/* Avatar for team chats (left side for others) */}
                {conversationType === "team" &&
                  !isCurrentUser &&
                  messageGroup.showSenderInfo &&
                  renderAvatar(senderInfo)}

                <div className="flex flex-col max-w-[70%]">
                  {/* Show sender name for team chats and non-current users */}
                  {conversationType === "team" &&
                    !isCurrentUser &&
                    messageGroup.showSenderInfo && (
                      <div
                        className="text-xs font-medium mb-1 ml-3"
                        style={{ color: "#036b0c" }}
                      >
                        {displayName}
                      </div>
                    )}

                  {/* Messages in this group */}
                  <div className="space-y-1">
                    {messageGroup.messages.map((message, messageIndex) => (
                      <div
                        key={`${message.id}-${dateString}-${groupIndex}-${messageIndex}`}
                        className={`
                          rounded-lg p-3 
                          ${
                            isCurrentUser
                              ? "bg-primary text-primary-content rounded-br-none ml-auto"
                              : "bg-base-200 rounded-bl-none"
                          }
                          ${
                            messageIndex === 0
                              ? ""
                              : isCurrentUser
                              ? "rounded-tr-lg"
                              : "rounded-tl-lg"
                          }
                        `}
                      >
                        <p>{message.content}</p>
                        {/* Only show timestamp on the last message of the group */}
                        {messageIndex === messageGroup.messages.length - 1 && (
                          <div
                            className={`
                              flex justify-between items-center text-xs mt-1 
                              ${
                                isCurrentUser
                                  ? "text-primary-content/80"
                                  : "text-base-content/50"
                              }
                            `}
                          >
                            <span>
                              {format(new Date(message.createdAt), "p")}
                            </span>
                            {isCurrentUser && message.readAt && (
                              <span className="ml-2">✓</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
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

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageDisplay;
