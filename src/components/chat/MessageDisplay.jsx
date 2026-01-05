import React, { useRef, useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { getUserInitials, getTeamInitials } from "../../utils/userHelpers";
import { UserPlus, UserMinus, PartyPopper } from "lucide-react";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";

/**
 * Parse system messages (join notifications, invitation responses)
 * Returns structured data if it's a system message, null otherwise
 */
const parseSystemMessage = (content) => {
  if (!content) return null;

  // DEBUG - remove after testing
  if (content.includes("left the team")) {
    console.log("Leave message content:", JSON.stringify(content));
  }

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

  // Pattern 3: Application approved message
  const applicationApprovedMatch = content.match(
    /^🎉\s+(.+?)\s+has applied successfully to your team and has been added as a team member by (.+?)\.\s*Say hello to them!$/
  );
  if (applicationApprovedMatch) {
    return {
      type: "application_approved",
      applicantName: applicationApprovedMatch[1].trim(),
      approverName: applicationApprovedMatch[2].trim(),
    };
  }

  // Pattern 4: Application decline response (direct message to applicant)
  // Format: 📋 Application declined: [Applicant] for "[Team]":\n\n"personal message"
  const applicationDeclineMatch = content.match(
    /^📋\s+Application declined:\s+(.+?)\s+for\s+"(.+?)":\s*\n\n"(.+)"$/s
  );
  if (applicationDeclineMatch) {
    return {
      type: "application_response",
      applicantName: applicationDeclineMatch[1].trim(),
      teamName: applicationDeclineMatch[2].trim(),
      personalMessage: applicationDeclineMatch[3].trim(),
    };
  }

  // Pattern 5: Team leave message
  // Format: 🚪 Name has left the team.
  const leaveMatch = content.match(/^🚪\s+(.+?)\s+has left the team\.$/);
  if (leaveMatch) {
    return {
      type: "team_leave",
      userName: leaveMatch[1].trim(),
    };
  }

  // Pattern 6: Application declined message
  // Format: 🚫 APPLICATION_DECLINED: Team Name | Approver Name | Applicant Name | hasPersonalMessage
  const applicationDeclinedMatch = content.match(
    /^🚫\s+APPLICATION_DECLINED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/
  );
  if (applicationDeclinedMatch) {
    return {
      type: "application_declined",
      teamName: applicationDeclinedMatch[1].trim(),
      approverName: applicationDeclinedMatch[2].trim(),
      applicantName: applicationDeclinedMatch[3].trim(),
      hasPersonalMessage: applicationDeclinedMatch[4] === "true",
    };
  }

  // Pattern 7: Application approved DM message
  // Format: ✅ APPLICATION_APPROVED: Team Name | Approver Name | Applicant Name | hasPersonalMessage
  const applicationApprovedDmMatch = content.match(
    /^✅\s+APPLICATION_APPROVED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/
  );
  if (applicationApprovedDmMatch) {
    return {
      type: "application_approved_dm",
      teamName: applicationApprovedDmMatch[1].trim(),
      approverName: applicationApprovedDmMatch[2].trim(),
      applicantName: applicationApprovedDmMatch[3].trim(),
      hasPersonalMessage: applicationApprovedDmMatch[4] === "true",
    };
  }

  // Pattern 8: Invitation declined message
  // Format: 🚫 INVITATION_DECLINED: Team Name | Inviter Name | Invitee Name | hasPersonalMessage
  const invitationDeclinedMatch = content.match(
    /^🚫\s+INVITATION_DECLINED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/
  );
  if (invitationDeclinedMatch) {
    return {
      type: "invitation_declined",
      teamName: invitationDeclinedMatch[1].trim(),
      inviterName: invitationDeclinedMatch[2].trim(),
      inviteeName: invitationDeclinedMatch[3].trim(),
      hasPersonalMessage: invitationDeclinedMatch[4] === "true",
    };
  }

  // Pattern 9: Invitation cancelled message
  // Format: 🚫 INVITATION_CANCELLED: Team Name | Canceller Name | Invitee Name
  const invitationCancelledMatch = content.match(
    /^🚫\s+INVITATION_CANCELLED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/
  );
  if (invitationCancelledMatch) {
    return {
      type: "invitation_cancelled",
      teamName: invitationCancelledMatch[1].trim(),
      cancellerName: invitationCancelledMatch[2].trim(),
      inviteeName: invitationCancelledMatch[3].trim(),
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
  highlightMessageIds = [],
}) => {
  const messagesEndRef = useRef(null);
  const highlightedMessageRef = useRef(null);

  // State for team details modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // State for user details modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
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

  // Handle team avatar/name click
  const handleTeamClick = () => {
    if (teamData?.id) {
      setIsTeamModalOpen(true);
    }
  };

  // Handle closing the team details modal
  const handleTeamModalClose = () => {
    setIsTeamModalOpen(false);
  };

  // Handle user avatar/name click
  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
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

  // Get sender info from team members or message data
  const getSenderInfo = (senderId, message = null) => {
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
          isCurrentMember: true,
        };
      }
    }

    if (conversationPartner && senderId === conversationPartner.id) {
      return { ...conversationPartner, isCurrentMember: true };
    }

    // Fallback: Use sender info embedded in the message (for former team members)
    if (message && conversationType === "team") {
      const hasMessageSenderInfo =
        message.senderUsername || message.senderFirstName;
      if (hasMessageSenderInfo) {
        return {
          username: message.senderUsername,
          firstName: message.senderFirstName,
          lastName: message.senderLastName,
          avatarUrl: message.senderAvatarUrl,
          isCurrentMember: message.isCurrentMember === true,
        };
      }
    }

    return null;
  };

  // Get display name with former member indicator
  const getDisplayName = (senderInfo, includeFormerLabel = true) => {
    if (!senderInfo) return "Unknown";

    let name;
    if (senderInfo.firstName && senderInfo.lastName) {
      name = `${senderInfo.firstName} ${senderInfo.lastName}`;
    } else if (senderInfo.firstName) {
      name = senderInfo.firstName;
    } else {
      name = senderInfo.username || "Unknown";
    }

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
    const handleClick =
      clickable && userId ? () => handleUserClick(userId) : undefined;

    // Former members: lighter colors and "FM" initials
    const avatarBgClass = isFormerMember ? "bg-base-300" : "bg-primary";
    const avatarTextClass = isFormerMember
      ? "text-base-content/60"
      : "text-primary-content";

    return (
      <div
        className={`avatar mr-2 flex-shrink-0 ${
          clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
        } ${isFormerMember ? "opacity-70" : ""}`}
        onClick={handleClick}
        title={
          clickable
            ? `View ${getDisplayName(senderInfo, false)} details`
            : isFormerMember
            ? "Former team member"
            : undefined
        }
      >
        <div className="w-8 h-8 rounded-full relative">
          {/* For former members, always show "FM" - don't use their avatar */}
          {!isFormerMember && senderInfo.avatarUrl ? (
            <img
              src={senderInfo.avatarUrl}
              alt={senderInfo.username || "User"}
              className="object-cover w-full h-full rounded-full"
              onError={(e) => {
                e.target.style.display = "none";
                const fallback =
                  e.target.parentElement.querySelector(".avatar-fallback");
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          {/* Fallback: "FM" for former members, initials for current members */}
          <div
            className={`avatar-fallback ${avatarBgClass} ${avatarTextClass} flex items-center justify-center w-full h-full rounded-full absolute inset-0`}
            style={{
              display:
                isFormerMember || !senderInfo.avatarUrl ? "flex" : "none",
            }}
          >
            <span className="text-sm font-medium">
              {isFormerMember ? "FM" : getUserInitials(senderInfo)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render an application approved DM message with special formatting (green theme)
   * Shows different text based on whether viewer is the approver or the applicant
   */
  const renderApplicationApprovedDmMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    // isCurrentUser means the current user is the sender (the one who approved)
    let messageText;

    if (isCurrentUser) {
      // Approver's perspective
      if (parsedMessage.hasPersonalMessage) {
        messageText = `You approved ${parsedMessage.applicantName}'s application for "${parsedMessage.teamName}" and added this message:`;
      } else {
        messageText = `You approved ${parsedMessage.applicantName}'s application for "${parsedMessage.teamName}".`;
      }
    } else {
      // Applicant's perspective
      if (parsedMessage.hasPersonalMessage) {
        messageText = `Your application to "${parsedMessage.teamName}" was approved by ${parsedMessage.approverName}, who added this message:`;
      } else {
        messageText = `Your application to "${parsedMessage.teamName}" was approved by ${parsedMessage.approverName}. Welcome to the team! 🎉`;
      }
    }

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner - Green theme */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-3 max-w-md text-center"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            color: "#16a34a",
          }}
        >
          <span className="text-sm font-medium">{messageText}</span>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  /**
   * Render an application approved message with special formatting
   * Shows announcement banner for when someone joins via application approval
   */
  const renderApplicationApprovedMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser,
    senderId
  ) => {
    const welcomeText = isCurrentUser
      ? `Your application was approved by ${parsedMessage.approverName}. Welcome to the team!`
      : `${parsedMessage.applicantName} has applied successfully and was added by ${parsedMessage.approverName}. Say hello to them!`;

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner */}
        <div className="bg-success/10 text-success px-4 py-2 rounded-full mb-3 text-center">
          <span className="text-sm font-medium">
            <UserPlus
              size={16}
              className="inline-block align-text-bottom mr-1"
            />
            {welcomeText}
            <PartyPopper
              size={16}
              className="inline-block align-text-bottom ml-1"
            />
          </span>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  const renderLeaveMessage = (message, parsedMessage, isCurrentUser) => {
    const leaveText = isCurrentUser
      ? "You have left the team."
      : `${parsedMessage.userName} has left the team.`;

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-full mb-3"
          style={{
            backgroundColor: "rgba(107, 114, 128, 0.1)",
            color: "#6b7280",
          }}
        >
          <UserMinus size={16} />
          <span className="text-sm font-medium">{leaveText}</span>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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
    senderId
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
            {/* Avatar for others' messages - clickable */}
            {!isCurrentUser && renderAvatar(senderInfo, true, senderId)}

            <div className="flex flex-col max-w-[70%]">
              {/* Sender name for team chats - clickable */}
              {!isCurrentUser && (
                <div
                  className="text-xs font-medium mb-1 ml-3 cursor-pointer hover:text-primary transition-colors"
                  style={{ color: "#036b0c" }}
                  onClick={() => handleUserClick(senderId)}
                  title={`View ${displayName} details`}
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
                      ? "bg-green-100 text-base-content rounded-br-none ml-auto"
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
                        ? "text-base-content/60"
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
   * Render an invitation cancelled message with special formatting (violet theme)
   * Shows different text based on whether viewer is the canceller or the invitee
   */
  const renderInvitationCancelledMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    // isCurrentUser means the current user is the sender (the one who cancelled)
    let messageText;

    if (isCurrentUser) {
      // Canceller's perspective
      messageText = `You cancelled your invitation for ${parsedMessage.inviteeName} to join "${parsedMessage.teamName}".`;
    } else {
      // Invitee's perspective
      messageText = `${parsedMessage.cancellerName} cancelled your invitation to join "${parsedMessage.teamName}". Want to reach out to them in this chat?`;
    }

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner - Violet theme */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-3 max-w-md text-center"
          style={{
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            color: "#7c3aed",
          }}
        >
          <span className="text-sm font-medium">{messageText}</span>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  /**
   * Render an invitation declined message with special formatting (violet theme)
   * Shows different text based on whether viewer is the inviter or the invitee
   */
  const renderInvitationDeclinedMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    // isCurrentUser means the current user is the sender (the one who declined = invitee)
    let messageText;

    if (isCurrentUser) {
      // Invitee's perspective (the one who declined)
      if (parsedMessage.hasPersonalMessage) {
        messageText = `You declined ${parsedMessage.inviterName}'s invitation for "${parsedMessage.teamName}" and added this message:`;
      } else {
        messageText = `You declined ${parsedMessage.inviterName}'s invitation for "${parsedMessage.teamName}". Consider adding a personal message to explain your decision.`;
      }
    } else {
      // Inviter's perspective (the one who sent the invite)
      if (parsedMessage.hasPersonalMessage) {
        messageText = `Your invitation for "${parsedMessage.teamName}" was declined by ${parsedMessage.inviteeName}, who added this message:`;
      } else {
        messageText = `Your invitation for "${parsedMessage.teamName}" was declined by ${parsedMessage.inviteeName}. Want to reach out to them in this chat?`;
      }
    }

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner - Violet theme */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-3 max-w-md text-center"
          style={{
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            color: "#7c3aed",
          }}
        >
          <span className="text-sm font-medium">{messageText}</span>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  /**
   * Render an application decline response message (DM to applicant)
   */
  const renderApplicationResponseMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser,
    senderId
  ) => {
    // Different banner text based on who is viewing
    const bannerContent = isCurrentUser ? (
      <>
        Your decline response to {parsedMessage.applicantName}'s application for{" "}
        <span className="font-medium">{parsedMessage.teamName}</span>
      </>
    ) : (
      <>
        Response to your application for{" "}
        <span className="font-medium">{parsedMessage.teamName}</span>
      </>
    );

    return (
      <div className="flex flex-col w-full my-4">
        {/* Info banner */}
        <div className="flex items-center justify-center gap-2 bg-info/10 text-info px-4 py-2 rounded-full mb-3 mx-auto">
          <span className="text-sm">{bannerContent}</span>
        </div>

        {/* Personal message bubble */}
        {parsedMessage.personalMessage && (
          <div
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } w-full`}
          >
            {/* Avatar for others' messages */}
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
                <p>{parsedMessage.personalMessage}</p>
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
   * Render an application declined message with special formatting (violet theme)
   * Shows different text based on whether viewer is the approver or the applicant
   */
  const renderApplicationDeclinedMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    // isCurrentUser means the current user is the sender (the one who declined)
    let messageText;

    if (isCurrentUser) {
      // Approver's perspective (Bob viewing)
      if (parsedMessage.hasPersonalMessage) {
        messageText = `You declined ${parsedMessage.applicantName}'s application for "${parsedMessage.teamName}" and added this message:`;
      } else {
        messageText = `You declined ${parsedMessage.applicantName}'s application for "${parsedMessage.teamName}". Consider adding a personal message to explain your decision.`;
      }
    } else {
      // Applicant's perspective (Michael viewing)
      if (parsedMessage.hasPersonalMessage) {
        messageText = `Your application to "${parsedMessage.teamName}" was declined by ${parsedMessage.approverName}, who added this message:`;
      } else {
        messageText = `Your application to "${parsedMessage.teamName}" was declined by ${parsedMessage.approverName}. Want to reach out to them in this chat?`;
      }
    }

    return (
      <div className="flex flex-col items-center w-full my-4">
        {/* Announcement Banner - Violet theme */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-3 max-w-md text-center"
          style={{
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            color: "#7c3aed",
          }}
        >
          <span className="text-sm font-medium">{messageText}</span>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
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
    isCurrentUser,
    senderId
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
            {/* Avatar for others' messages - clickable */}
            {!isCurrentUser &&
              conversationType === "direct" &&
              renderAvatar(senderInfo, true, senderId)}

            <div className="flex flex-col max-w-[70%]">
              {/* Message bubble */}
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
                <p>{parsedMessage.personalMessage}</p>
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
      <>
        <div className="space-y-6">
          {/* Show conversation partner header for direct messages - CLICKABLE */}
          {conversationPartner && conversationType === "direct" && (
            <div className="text-center pb-4 mb-4 border-b border-base-200">
              <div
                className="avatar mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleUserClick(conversationPartner.id)}
                title={`View ${
                  conversationPartner.firstName || conversationPartner.username
                } details`}
              >
                <div className="w-16 h-16 rounded-full mx-auto relative">
                  {conversationPartner.avatarUrl ? (
                    <img
                      src={conversationPartner.avatarUrl}
                      alt={conversationPartner.username}
                      className="object-cover w-full h-full rounded-full"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback =
                          e.target.parentElement.querySelector(
                            ".avatar-fallback"
                          );
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  {/* Fallback initials */}
                  <div
                    className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                    style={{
                      display: conversationPartner.avatarUrl ? "none" : "flex",
                    }}
                  >
                    <span className="text-xl font-medium">
                      {getUserInitials(conversationPartner)}
                    </span>
                  </div>
                </div>
              </div>
              <h3
                className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleUserClick(conversationPartner.id)}
                title={`View ${
                  conversationPartner.firstName || conversationPartner.username
                } details`}
              >
                {conversationPartner.firstName && conversationPartner.lastName
                  ? `${conversationPartner.firstName} ${conversationPartner.lastName}`
                  : conversationPartner.username}
              </h3>
            </div>
          )}

          {/* Show team header for team conversations - CLICKABLE */}
          {teamData && conversationType === "team" && (
            <div className="text-center pb-4 mb-4 border-b border-base-200">
              <div
                className="avatar mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleTeamClick}
                title={`View ${teamData.name} details`}
              >
                <div className="w-16 h-16 rounded-full mx-auto relative">
                  {teamData.avatarUrl ? (
                    <img
                      src={teamData.avatarUrl}
                      alt={teamData.name}
                      className="object-cover w-full h-full rounded-full"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback =
                          e.target.parentElement.querySelector(
                            ".avatar-fallback"
                          );
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  {/* Fallback initials */}
                  <div
                    className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                    style={{ display: teamData.avatarUrl ? "none" : "flex" }}
                  >
                    <span className="text-xl font-medium">
                      {getTeamInitials(teamData)}
                    </span>
                  </div>
                </div>
              </div>
              <h3
                className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
                onClick={handleTeamClick}
                title={`View ${teamData.name} details`}
              >
                {teamData.name}
              </h3>
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

        {/* Team Details Modal */}
        <TeamDetailsModal
          isOpen={isTeamModalOpen}
          teamId={teamData?.id}
          initialTeamData={teamData}
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

      // Check if this message is a system message (join/response) - don't group these
      const parsedMessage = parseSystemMessage(message.content);
      const prevParsedMessage = parseSystemMessage(
        messagesForDate[i - 1].content
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
        {/* Show conversation partner header for direct messages - CLICKABLE */}
        {conversationPartner && conversationType === "direct" && (
          <div className="text-center pb-4 mb-4 border-b border-base-200">
            <div
              className="avatar mb-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleUserClick(conversationPartner.id)}
              title={`View ${
                conversationPartner.firstName || conversationPartner.username
              } details`}
            >
              <div className="w-16 h-16 rounded-full mx-auto relative">
                {conversationPartner.avatarUrl ? (
                  <img
                    src={conversationPartner.avatarUrl}
                    alt={conversationPartner.username}
                    className="object-cover w-full h-full rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(
                          ".avatar-fallback"
                        );
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Fallback initials */}
                <div
                  className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{
                    display: conversationPartner.avatarUrl ? "none" : "flex",
                  }}
                >
                  <span className="text-xl font-medium">
                    {getUserInitials(conversationPartner)}
                  </span>
                </div>
              </div>
            </div>
            <h3
              className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
              onClick={() => handleUserClick(conversationPartner.id)}
              title={`View ${
                conversationPartner.firstName || conversationPartner.username
              } details`}
            >
              {conversationPartner.firstName && conversationPartner.lastName
                ? `${conversationPartner.firstName} ${conversationPartner.lastName}`
                : conversationPartner.username}
            </h3>
          </div>
        )}

        {/* Show team header for team conversations - CLICKABLE */}
        {teamData && conversationType === "team" && (
          <div className="text-center pb-4 mb-4 border-b border-base-200">
            <div
              className="avatar mb-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleTeamClick}
              title={`View ${teamData.name} details`}
            >
              <div className="w-16 h-16 rounded-full mx-auto relative">
                {teamData.avatarUrl ? (
                  <img
                    src={teamData.avatarUrl}
                    alt={teamData.name}
                    className="object-cover w-full h-full rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(
                          ".avatar-fallback"
                        );
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Fallback initials */}
                <div
                  className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{ display: teamData.avatarUrl ? "none" : "flex" }}
                >
                  <span className="text-xl font-medium">
                    {getTeamInitials(teamData)}
                  </span>
                </div>
              </div>
            </div>
            <h3
              className="text-lg font-medium leading-[120%] mb-[0.2em] cursor-pointer hover:text-primary transition-colors"
              onClick={handleTeamClick}
              title={`View ${teamData.name} details`}
            >
              {teamData.name}
            </h3>
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
                messageGroup.messages[0] // Pass the first message for fallback info
              );
              const displayName = getDisplayName(senderInfo);

              // Check if this is a single system message group
              if (messageGroup.messages.length === 1) {
                const message = messageGroup.messages[0];
                const parsedMessage = parseSystemMessage(message.content);

                if (parsedMessage) {
                  // Check if this system message should be highlighted
                  const isHighlighted = highlightMessageIds.includes(
                    message.id
                  );
                  const isFirstHighlighted =
                    isHighlighted && message.id === highlightMessageIds[0];

                  const wrapperClass = isHighlighted
                    ? "message-highlight rounded-xl p-2"
                    : "";

                  if (parsedMessage.type === "team_join") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderJoinMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "invitation_response") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderInvitationResponseMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "application_approved") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderApplicationApprovedMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "application_response") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderApplicationResponseMessage(
                          message,
                          parsedMessage,
                          senderInfo,
                          isCurrentUser,
                          messageGroup.senderId
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "team_leave") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderLeaveMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "application_declined") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderApplicationDeclinedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "application_approved_dm") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderApplicationApprovedDmMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "invitation_declined") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderInvitationDeclinedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "invitation_cancelled") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderInvitationCancelledMessage(
                          message,
                          parsedMessage,
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
                  {/* Avatar for team chats (left side for others) - clickable */}
                  {conversationType === "team" &&
                    !isCurrentUser &&
                    messageGroup.showSenderInfo &&
                    renderAvatar(senderInfo, true, messageGroup.senderId)}

                  <div className="flex flex-col max-w-[70%]">
                    {/* Show sender name for team chats and non-current users - clickable */}
                    {conversationType === "team" &&
                      !isCurrentUser &&
                      messageGroup.showSenderInfo && (
                        <div
                          className={`text-xs font-medium mb-1 ml-3 cursor-pointer hover:text-primary transition-colors ${
                            senderInfo?.isCurrentMember === false
                              ? "opacity-70"
                              : ""
                          }`}
                          style={{
                            color:
                              senderInfo?.isCurrentMember === false
                                ? "#6b7280"
                                : "#036b0c",
                          }}
                          onClick={() => handleUserClick(messageGroup.senderId)}
                          title={`View ${getDisplayName(
                            senderInfo,
                            false
                          )} details`}
                        >
                          {displayName}
                        </div>
                      )}

                    {/* Messages in this group */}
                    <div className="space-y-1">
                      {messageGroup.messages.map((message, messageIndex) => {
                        const isHighlighted = highlightMessageIds.includes(
                          message.id
                        );
                        const isFirstHighlighted =
                          isHighlighted &&
                          message.id === highlightMessageIds[0];

                        return (
                          <div
                            key={`${message.id}-${dateString}-${groupIndex}-${messageIndex}`}
                            ref={
                              isFirstHighlighted ? highlightedMessageRef : null
                            }
                            className={`
                              rounded-lg p-3 
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
                            <p>{message.content}</p>
                            {/* Only show timestamp on the last message of the group */}
                            {messageIndex ===
                              messageGroup.messages.length - 1 && (
                              <div
                                className={`
                                  flex justify-between items-center text-xs mt-1 
                                  ${
                                    isCurrentUser
                                      ? "text-base-content/60"
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

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isTeamModalOpen}
        teamId={teamData?.id}
        initialTeamData={teamData}
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

export default MessageDisplay;
