import React, { useRef, useEffect } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { getUserInitials } from "../../utils/userHelpers";
import { UserPlus, PartyPopper } from "lucide-react";

/**
 * Parse system messages (join notifications, invitation responses)
 * Returns structured data if it's a system message, null otherwise
 */
const parseSystemMessage = (content) => {
  if (!content) return null;

  // Pattern 1: Team join message
  // Format: 👋 Name joined the team!\n\n"personal message"
  const joinMatch = content.match(
    /^👋\s+(.+?)\s+joined the team!\s*\n\n"(.+)"$/s
  );
  if (joinMatch) {
    return {
      type: "team_join",
      userName: joinMatch[1].trim(),
      personalMessage: joinMatch[2].trim(),
    };
  }

  // Pattern 2: Invitation decline response (direct message to inviter)
  // Format: 📋 Response to your invitation for "Team Name":\n\n"personal message"
  const declineMatch = content.match(
    /^📋\s+Response to your invitation for "(.+?)":\s*\n\n"(.+)"$/s
  );
  if (declineMatch) {
    return {
      type: "invitation_response",
      teamName: declineMatch[1].trim(),
      personalMessage: declineMatch[2].trim(),
    };
  }

  return null;
};

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

  // Group messages by date
  const messagesByDate = messages.reduce((groups, message) => {
    const date = format(new Date(message.createdAt), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Format date heading
  const formatDateHeading = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Get sender info from team members
  const getSenderInfo = (senderId) => {
    if (conversationType === "team" && teamMembers.length > 0) {
      const member = teamMembers.find(
        (m) =>
          m.user_id === senderId ||
          m.userId === senderId ||
          String(m.user_id) === String(senderId) ||
          String(m.userId) === String(senderId)
      );

      if (member) {
        return {
          username: member.username,
          firstName: member.first_name || member.firstName,
          lastName: member.last_name || member.lastName,
          avatarUrl: member.avatar_url || member.avatarUrl,
        };
      }
    }

    if (conversationPartner && senderId === conversationPartner.id) {
      return conversationPartner;
    }

    return null;
  };

  // Get display name
  const getDisplayName = (senderInfo) => {
    if (!senderInfo) return "Unknown";

    if (senderInfo.firstName && senderInfo.lastName) {
      return `${senderInfo.firstName} ${senderInfo.lastName}`;
    }
    if (senderInfo.firstName) {
      return senderInfo.firstName;
    }
    return senderInfo.username || "Unknown";
  };

  // Render avatar
  const renderAvatar = (senderInfo) => {
    if (!senderInfo) return null;

    return (
      <div className="avatar mr-2 flex-shrink-0">
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
                {getUserInitials(senderInfo)}
              </span>
            </div>
          )}
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
    isCurrentUser
  ) => {
    const displayName = getDisplayName(senderInfo);

    // Determine the pronoun based on whether it's the current user
    const pronoun = isCurrentUser ? "you" : "them";
    const welcomeText = isCurrentUser
      ? `You joined the team. Welcome aboard!`
      : `${parsedMessage.userName} has joined your team. Say hello to ${pronoun}!`;

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner */}
        <div className="flex items-center justify-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full mb-3">
          <UserPlus size={16} />
          <span className="text-sm font-medium">{welcomeText}</span>
          <PartyPopper size={16} />
        </div>

        {/* Personal message bubble */}
        {parsedMessage.personalMessage && (
          <div
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } w-full`}
          >
            {/* Avatar for others' messages */}
            {!isCurrentUser && renderAvatar(senderInfo)}

            <div className="flex flex-col max-w-[70%]">
              {/* Sender name for team chats */}
              {!isCurrentUser && (
                <div
                  className="text-xs font-medium mb-1 ml-3"
                  style={{ color: "#036b0c" }}
                >
                  {displayName}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`
                  rounded-lg p-3 
                  ${
                    isCurrentUser
                      ? "bg-primary text-primary-content rounded-br-none ml-auto"
                      : "bg-base-200 rounded-bl-none"
                  }
                `}
              >
                <p>{parsedMessage.personalMessage}</p>
                <div
                  className={`
                    flex justify-end items-center text-xs mt-1 
                    ${
                      isCurrentUser
                        ? "text-primary-content/80"
                        : "text-base-content/50"
                    }
                  `}
                >
                  <span>{format(new Date(message.createdAt), "p")}</span>
                  {isCurrentUser && message.readAt && (
                    <span className="ml-2">✓</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render an invitation response message (for decline messages in DMs)
   */
  const renderInvitationResponseMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser
  ) => {
    const displayName = getDisplayName(senderInfo);

    return (
      <div className="flex flex-col w-full my-4">
        {/* Info banner about the invitation response */}
        <div className="flex items-center justify-center gap-2 bg-info/10 text-info px-4 py-2 rounded-full mb-3 mx-auto">
          <span className="text-sm">
            Response to invitation for{" "}
            <span className="font-medium">{parsedMessage.teamName}</span>
          </span>
        </div>

        {/* Personal message bubble */}
        {parsedMessage.personalMessage && (
          <div
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } w-full`}
          >
            {/* Avatar for others' messages */}
            {!isCurrentUser &&
              conversationType === "direct" &&
              renderAvatar(senderInfo)}

            <div className="flex flex-col max-w-[70%]">
              {/* Message bubble */}
              <div
                className={`
                  rounded-lg p-3 
                  ${
                    isCurrentUser
                      ? "bg-primary text-primary-content rounded-br-none ml-auto"
                      : "bg-base-200 rounded-bl-none"
                  }
                `}
              >
                <p>{parsedMessage.personalMessage}</p>
                <div
                  className={`
                    flex justify-end items-center text-xs mt-1 
                    ${
                      isCurrentUser
                        ? "text-primary-content/80"
                        : "text-base-content/50"
                    }
                  `}
                >
                  <span>{format(new Date(message.createdAt), "p")}</span>
                  {isCurrentUser && message.readAt && (
                    <span className="ml-2">✓</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
            <h3 className="font-medium leading-[120%] mb-[0.2em]">
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
            <h3 className="font-medium leading-[120%] mb-[0.2em]">
              {teamData.name}
            </h3>
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

      // Check if this message is a system message (join/response) - don't group these
      const parsedMessage = parseSystemMessage(message.content);
      const prevParsedMessage = parseSystemMessage(messages[i - 1].content);

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
    <div className="space-y-6">
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
          <h3 className="font-medium leading-[120%] mb-[0.2em]">
            {teamData.name}
          </h3>
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

            // Check if this is a single system message group
            if (messageGroup.messages.length === 1) {
              const message = messageGroup.messages[0];
              const parsedMessage = parseSystemMessage(message.content);

              if (parsedMessage) {
                if (parsedMessage.type === "team_join") {
                  return (
                    <div key={`${dateString}-group-${groupIndex}`}>
                      {renderJoinMessage(
                        message,
                        parsedMessage,
                        senderInfo,
                        isCurrentUser
                      )}
                    </div>
                  );
                } else if (parsedMessage.type === "invitation_response") {
                  return (
                    <div key={`${dateString}-group-${groupIndex}`}>
                      {renderInvitationResponseMessage(
                        message,
                        parsedMessage,
                        senderInfo,
                        isCurrentUser
                      )}
                    </div>
                  );
                }
              }
            }

            // Regular message rendering
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
