import React, { useRef, useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { getUserInitials, getTeamInitials } from "../../utils/userHelpers";
import {
  UserPlus,
  UserMinus,
  LogOut,
  PartyPopper,
  Crown,
  Shield,
  User,
} from "lucide-react";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import UserDetailsModal from "../users/UserDetailsModal";
import { userService } from "../../services/userService";

const parseIdNameToken = (token) => {
  const t = (token || "").trim();
  const m = t.match(/^(\d+)\s*:(.+)$/);
  if (!m) return { id: null, name: t };
  return { id: Number(m[1]), name: m[2].trim() };
};

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

  // Pattern 3: Application approved message
  // Supports legacy messages with or without 🎉
  const applicationApprovedMatch = content.match(
    /^(?:🎉\s*)?(.+?)\s+has applied successfully to your team and has been added as a team member by (.+?)\.\s*Say hello to them!$/
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

  // Pattern 5A (NEW): Team leave message with userId
  // Format: 🚪 MEMBER_LEFT:<userId>:<displayName>
  const leaveIdMatch = content.match(/^🚪\s*MEMBER_LEFT:(\d+):(.+)$/);
  if (leaveIdMatch) {
    return {
      type: "team_leave",
      userId: Number(leaveIdMatch[1]),
      userName: leaveIdMatch[2].trim(),
    };
  }

  // Pattern 5B (LEGACY): Team leave message
  // Format: 🚪 Name has left the team.
  const leaveMatch = content.match(/^🚪\s+(.+?)\s+has left the team\.$/);
  if (leaveMatch) {
    return {
      type: "team_leave",
      userId: null,
      userName: leaveMatch[1].trim(),
    };
  }

  // Pattern 6: Application declined message
  // Format: 🚫 APPLICATION_DECLINED: Team Name | Approver Name | Applicant Name | hasPersonalMessage
  const applicationDeclinedMatch = content.match(
    /^🚫\s+APPLICATION_DECLINED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/
  );

  if (applicationDeclinedMatch) {
    const teamName = applicationDeclinedMatch[1].trim();
    const approverToken = applicationDeclinedMatch[2].trim();
    const applicantToken = applicationDeclinedMatch[3].trim();

    const approver = parseIdNameToken(approverToken);
    const applicant = parseIdNameToken(applicantToken);

    return {
      type: "application_declined",
      teamName,
      approverId: approver.id,
      approverName: approver.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
      hasPersonalMessage: applicationDeclinedMatch[4] === "true",
    };
  }

  // Pattern 7: Application approved DM message
  // Format: ✅ APPLICATION_APPROVED: Team Name | Approver Name | Applicant Name | hasPersonalMessage
  const applicationApprovedDmMatch = content.match(
    /^✅\s+APPLICATION_APPROVED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(true|false)$/
  );
  if (applicationApprovedDmMatch) {
    const teamName = applicationApprovedDmMatch[1].trim();

    const approverToken = applicationApprovedDmMatch[2].trim(); // "id:name" or "name"
    const applicantToken = applicationApprovedDmMatch[3].trim(); // "id:name" or "name"

    const approver = parseIdNameToken(approverToken);
    const applicant = parseIdNameToken(applicantToken);

    return {
      type: "application_approved_dm",
      teamName,
      approverId: approver.id,
      approverName: approver.name,
      applicantId: applicant.id,
      applicantName: applicant.name,
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

  // Pattern 10: Application cancelled message
  // Format: 🚫 APPLICATION_CANCELLED: Team Name | Applicant Name | Admin Name
  const applicationCancelledMatch = content.match(
    /^🚫\s+APPLICATION_CANCELLED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/
  );
  if (applicationCancelledMatch) {
    return {
      type: "application_cancelled",
      teamName: applicationCancelledMatch[1].trim(),
      applicantName: applicationCancelledMatch[2].trim(),
      adminName: applicationCancelledMatch[3].trim(),
    };
  }

  // Pattern 11: Member removed message
  // Format: 🚫 MEMBER_REMOVED: Team Name | Remover Name | Member Name
  const memberRemovedMatch = content.match(
    /^🚫\s+MEMBER_REMOVED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/
  );
  if (memberRemovedMatch) {
    const teamName = memberRemovedMatch[1].trim();
    const removerToken = memberRemovedMatch[2].trim(); // "id:name" or "name"
    const memberToken = memberRemovedMatch[3].trim(); // "id:name" or "name"

    const remover = parseIdNameToken(removerToken);
    const member = parseIdNameToken(memberToken);

    return {
      type: "member_removed",
      teamName,
      removerId: remover.id,
      removerName: remover.name,
      memberId: member.id,
      memberName: member.name,
    };
  }

  // Pattern 12: Role changed message
  // Format: 🔄 ROLE_CHANGED: Team Name | Changer Name | Member Name | Old Role | New Role
  const roleChangedMatch = content.match(
    /^🔄\s+ROLE_CHANGED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/
  );
  if (roleChangedMatch) {
    const teamName = roleChangedMatch[1].trim();
    const changerToken = roleChangedMatch[2].trim(); // "id:name" or "name"
    const memberToken = roleChangedMatch[3].trim(); // "id:name" or "name"

    const changer = parseIdNameToken(changerToken);
    const member = parseIdNameToken(memberToken);

    return {
      type: "role_changed",
      teamName,
      changerId: changer.id,
      changerName: changer.name,
      memberId: member.id,
      memberName: member.name,
      oldRole: roleChangedMatch[4].trim(),
      newRole: roleChangedMatch[5].trim(),
    };
  }

  // Pattern 13: Ownership transferred message (DM)
  const ownershipTransferredMatch = content.match(
    /^(?:👑\s*)?OWNERSHIP_TRANSFERRED:\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$/
  );
  if (ownershipTransferredMatch) {
    const teamName = ownershipTransferredMatch[1].trim();
    const prevToken = ownershipTransferredMatch[2].trim(); // "id:name" or "name"
    const newToken = ownershipTransferredMatch[3].trim(); // "id:name" or "name"

    const prev = parseIdNameToken(prevToken);
    const next = parseIdNameToken(newToken);

    return {
      type: "ownership_transferred",
      teamName,
      prevOwnerId: prev.id,
      prevOwnerName: prev.name,
      newOwnerId: next.id,
      newOwnerName: next.name,
    };
  }

  // Pattern 14: Ownership transferred team chat message
  const ownershipTeamMatch = content.match(
    /^(?:👑\s*)?OWNERSHIP_TEAM:\s+(.+?)\s+\|\s+(.+)$/
  );
  if (ownershipTeamMatch) {
    return {
      type: "ownership_team",
      prevOwnerName: ownershipTeamMatch[1].trim(),
      newOwnerName: ownershipTeamMatch[2].trim(),
    };
  }

  // Pattern 15: Team deleted message
  const teamDeletedMatch = content.match(
    /^🗑️\s+TEAM_DELETED:\s+(.+?)\s+\|\s+(.+)$/
  );
  if (teamDeletedMatch) {
    return {
      type: "team_deleted",
      teamName: teamDeletedMatch[1].trim(),
      ownerName: teamDeletedMatch[2].trim(),
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
  onDeleteConversation,
  onLeaveTeam,
}) => {
  const messagesEndRef = useRef(null);
  const highlightedMessageRef = useRef(null);

  // State for team details modal
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // State for user details modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Mention lookup (frontend-only)
  const [resolvingName, setResolvingName] = useState(false);
  const [nameResolveError, setNameResolveError] = useState(null);

  const [nameToIdCache, setNameToIdCache] = useState({});

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
    if (conversationType !== "team") return;
    if (!teamData?.id) return;
    setIsTeamModalOpen(true);
  };

  // Handle closing the team details modal
  const handleTeamModalClose = () => {
    setIsTeamModalOpen(false);
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

    // 2) fallback: backend search (your endpoint currently returns placeholder [])
    const res = await userService.searchUsers(name);
    const users = res?.data?.data || [];

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

    return (
      <button
        type="button"
        className="font-medium underline underline-offset-2 hover:no-underline hover:text-primary transition-colors"
        onClick={() => handleMentionClick(safe)}
        disabled={resolvingName}
        title={`Open ${safe}`}
      >
        {safe}
      </button>
    );
  };

  const MentionById = ({ userId, name }) => {
    const safeName = (name || "").trim() || "User";
    if (!userId) return <Mention name={safeName} />;

    return (
      <button
        type="button"
        className="font-medium underline underline-offset-2 hover:no-underline hover:text-primary transition-colors"
        onClick={() => handleUserClick(userId, safeName)}
        title={`Open ${safeName}`}
      >
        {safeName}
      </button>
    );
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
            <span className="text-sm font-medium event-message-text">
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
    const approver = parsedMessage.approverName;
    const applicant = parsedMessage.applicantName;
    const teamName = parsedMessage.teamName;

    const messageText = isCurrentUser ? (
      parsedMessage.hasPersonalMessage ? (
        <>
          You approved{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for{" "}
          <span className="font-medium">"{teamName}"</span> and added this
          message:
        </>
      ) : (
        <>
          You approved{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for{" "}
          <span className="font-medium">"{teamName}"</span>
        </>
      )
    ) : parsedMessage.hasPersonalMessage ? (
      <>
        Your application to <span className="font-medium">"{teamName}"</span>{" "}
        was approved by{" "}
        <MentionById
          userId={parsedMessage.approverId}
          name={parsedMessage.approverName}
        />
        , who added this message:
      </>
    ) : (
      <>
        Your application to <span className="font-medium">"{teamName}"</span>{" "}
        was approved by{" "}
        <MentionById
          userId={parsedMessage.approverId}
          name={parsedMessage.approverName}
        />
        . Welcome to the team!
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-3 max-w-md text-center"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            color: "#16a34a",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            {messageText}
            <PartyPopper size={16} className="event-inline-icon ml-1" />
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderApplicationApprovedMessage - Green success theme
  // =============================================================================
  const renderApplicationApprovedMessage = (
    message,
    parsedMessage,
    senderInfo,
    isCurrentUser,
    senderId
  ) => {
    const applicant = parsedMessage.applicantName;
    const approver = parsedMessage.approverName;

    const welcomeText = isCurrentUser ? (
      <>
        Your application was approved by <Mention name={approver} />. Welcome to
        the team!
      </>
    ) : (
      <>
        <Mention name={applicant} /> has applied successfully and was added by{" "}
        <Mention name={approver} />. Say hello to them!
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--success mb-3">
          <span className="text-sm font-medium event-message-text">
            <UserPlus size={16} className="event-inline-icon mr-1" />
            {welcomeText}
            <PartyPopper size={16} className="event-inline-icon ml-1" />
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

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
            {leaveText}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderInvitationAcceptedMessage - Green success theme
  // =============================================================================
  const renderInvitationAcceptedMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You accepted <Mention name={parsedMessage.inviterName} />
        {"'s"} invitation for{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span>. Welcome
        to the team!
      </>
    ) : (
      <>
        <Mention name={parsedMessage.inviteeName} /> accepted your invitation
        for <span className="font-medium">"{parsedMessage.teamName}"</span>.
        Welcome to the team!
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--success mb-3">
          <span className="text-sm font-medium event-message-text">
            {messageText}
            <PartyPopper size={16} className="event-inline-icon ml-1" />
          </span>
        </div>

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

    const pronoun = isCurrentUser ? "you" : "them";
    const welcomeText = isCurrentUser ? (
      <>You joined the team. Welcome aboard!</>
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
            {welcomeText}
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
                <div
                  className="text-xs font-medium mb-1 ml-3 cursor-pointer hover:text-primary transition-colors"
                  style={{ color: "#036b0c" }}
                  onClick={() => handleUserClick(senderId, displayName)}
                  title={`View ${displayName} details`}
                >
                  {displayName}
                </div>
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

        {!parsedMessage.personalMessage && (
          <div className="text-xs text-base-content/50">
            {format(new Date(message.createdAt), "p")}
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
    isCurrentUser
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You cancelled your invitation for{" "}
        <Mention name={parsedMessage.inviteeName} /> to join{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span>. Want to
        tell them why in this chat?
      </>
    ) : (
      <>
        <Mention name={parsedMessage.cancellerName} /> cancelled your invitation
        to join <span className="font-medium">"{parsedMessage.teamName}"</span>
        {". "}Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            {messageText}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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
    isCurrentUser
  ) => {
    const team = parsedMessage.teamName;

    const messageText = isCurrentUser ? (
      parsedMessage.hasPersonalMessage ? (
        <>
          You declined <Mention name={parsedMessage.inviterName} />
          {"'s"} invitation for <span className="font-medium">"{team}"</span>{" "}
          and added this message:
        </>
      ) : (
        <>
          You declined <Mention name={parsedMessage.inviterName} />
          {"'s"} invitation for <span className="font-medium">"{team}"</span>.
          Consider adding a personal message to explain your decision.
        </>
      )
    ) : parsedMessage.hasPersonalMessage ? (
      <>
        Your invitation for <span className="font-medium">"{team}"</span> was
        declined by <Mention name={parsedMessage.inviteeName} />, who added this
        message:
      </>
    ) : (
      <>
        Your invitation for <span className="font-medium">"{team}"</span> was
        declined by <Mention name={parsedMessage.inviteeName} />. Want to reach
        out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            {messageText}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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
    senderId
  ) => {
    const bannerContent = isCurrentUser ? (
      <>
        Your decline response to <Mention name={parsedMessage.applicantName} />
        {"'s"} application for{" "}
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
        <div className="event-banner event-banner--neutral mb-3 mx-auto">
          <span className="text-sm event-message-text">{bannerContent}</span>
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

  // =============================================================================
  // renderApplicationDeclinedMessage - Neutral grey theme
  // =============================================================================
  const renderApplicationDeclinedMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    const team = parsedMessage.teamName;

    const messageText = isCurrentUser ? (
      parsedMessage.hasPersonalMessage ? (
        <>
          You declined{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for <span className="font-medium">"{team}"</span>{" "}
          and added this message:
        </>
      ) : (
        <>
          You declined{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for <span className="font-medium">"{team}"</span>.
          Consider adding a personal message to explain your decision.
        </>
      )
    ) : parsedMessage.hasPersonalMessage ? (
      <>
        Your application to <span className="font-medium">"{team}"</span> was
        declined by{" "}
        <MentionById
          userId={parsedMessage.approverId}
          name={parsedMessage.approverName}
        />
        {", "}who added this message:
      </>
    ) : (
      <>
        Your application to <span className="font-medium">"{team}"</span> was
        declined by{" "}
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
            {messageText}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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
    senderId
  ) => {
    return (
      <div className="flex flex-col w-full my-4">
        <div className="event-banner event-banner--info mb-3 mx-auto">
          <span className="text-sm event-message-text">
            Response to invitation for{" "}
            <span className="font-medium">{parsedMessage.teamName}</span>
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

  // =============================================================================
  // renderApplicationCancelledMessage - Neutral grey theme
  // =============================================================================
  const renderApplicationCancelledMessage = (
    message,
    parsedMessage,
    isCurrentUser
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You cancelled <Mention name={parsedMessage.applicantName} />
        {"'s"} application for{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span>. Want to
        tell them why in this chat?
      </>
    ) : (
      <>
        <Mention name={parsedMessage.adminName} /> cancelled your application to{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span>. Want to
        reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            {messageText}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderRoleChangedMessage - Dynamic theme based on new role
  // =============================================================================
  const renderRoleChangedMessage = (message, parsedMessage, isCurrentUser) => {
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

    const messageText = isCurrentUser ? (
      isPromotion ? (
        <>
          You promoted{" "}
          <MentionById
            userId={parsedMessage.memberId}
            name={parsedMessage.memberName}
          />{" "}
          to Admin in{" "}
          <span className="font-medium">"{parsedMessage.teamName}"</span>.
        </>
      ) : (
        <>
          You changed{" "}
          <MentionById
            userId={parsedMessage.memberId}
            name={parsedMessage.memberName}
          />
          {"'s"} role to Member in{" "}
          <span className="font-medium">"{parsedMessage.teamName}"</span>.
        </>
      )
    ) : isPromotion ? (
      <>
        You were promoted to Admin in{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span> by{" "}
        <MentionById
          userId={parsedMessage.changerId}
          name={parsedMessage.changerName}
        />
        .
      </>
    ) : (
      <>
        Your role in{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span> was
        changed to Member by{" "}
        <MentionById
          userId={parsedMessage.changerId}
          name={parsedMessage.changerName}
        />
        .
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className={`event-banner ${bannerClass} mb-3`}>
          <span className="text-sm font-medium event-message-text">
            <RoleIcon size={16} className="event-inline-icon mr-1" />
            {messageText}
            {isPromotion && !isCurrentUser && (
              <PartyPopper size={16} className="event-inline-icon ml-1" />
            )}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderOwnershipTeamMessage - Pink owner theme (team chat)
  // =============================================================================
  const renderOwnershipTeamMessage = (message, parsedMessage) => {
    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--owner mb-3">
          <span className="text-sm font-medium event-message-text">
            <Crown size={16} className="event-inline-icon mr-1" />
            <Mention name={parsedMessage.prevOwnerName} /> transferred ownership
            to{" "}
            <MentionById
              userId={parsedMessage.newOwnerId}
              name={parsedMessage.newOwnerName}
            />
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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
    isCurrentUser
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You transferred team ownership of{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span> to{" "}
        <Mention name={parsedMessage.newOwnerName} />.
      </>
    ) : (
      <>
        <MentionById
          userId={parsedMessage.prevOwnerId}
          name={parsedMessage.prevOwnerName}
        />
        transferred ownership of{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span> to you.
        Congratulations!
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--owner mb-3">
          <span className="text-sm font-medium event-message-text">
            <Crown size={16} className="event-inline-icon mr-1" />
            {messageText}
            <PartyPopper size={16} className="event-inline-icon ml-1" />
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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
    isCurrentUser
  ) => {
    const messageText = isCurrentUser ? (
      <>
        You removed{" "}
        <MentionById
          userId={parsedMessage.memberId}
          name={parsedMessage.memberName}
        />{" "}
        from <span className="font-medium">"{parsedMessage.teamName}"</span>.
      </>
    ) : (
      <>
        You were removed from{" "}
        <span className="font-medium">"{parsedMessage.teamName}"</span> by{" "}
        <MentionById
          userId={parsedMessage.removerId}
          name={parsedMessage.removerName}
        />
        {". "}Want to reach out to them in this chat?
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner event-banner--neutral mb-3">
          <span className="text-sm font-medium event-message-text">
            {messageText}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
        </div>
      </div>
    );
  };

  /**
   * Render a team deleted message with special formatting (red/error theme)
   * Shows in team chat with option to leave team
   */
  const renderTeamDeletedMessage = (message, parsedMessage, isCurrentUser) => {
    let messageText;

    if (isCurrentUser) {
      messageText = `You deleted the team "${parsedMessage.teamName}". Remaining members are able to text in this chat until the last member leaves.`;
    } else {
      messageText = `${parsedMessage.ownerName} has deleted the team "${parsedMessage.teamName}". Remaining members are able to text in this chat until the last member leaves.`;
    }

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="flex flex-col items-center gap-3 px-5 py-4 rounded-2xl mb-3 max-w-md text-center"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#dc2626",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            {messageText}
          </span>

          {onLeaveTeam && (
            <button
              onClick={() => onLeaveTeam()}
              className="flex items-center gap-1 text-xs underline hover:no-underline opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <LogOut size={14} />
              Leave team and remove from chat list
            </button>
          )}
        </div>

        <div className="text-xs text-base-content/50">
          {format(new Date(message.createdAt), "p")}
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

          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-base-content/70">No messages yet</p>
            <p className="text-sm text-base-content/50 mt-2">
              Send a message to start the conversation
            </p>
          </div>
        </div>

        {conversationType === "team" && teamData?.id ? (
          <TeamDetailsModal
            isOpen={isTeamModalOpen}
            teamId={teamData.id}
            initialTeamData={teamData}
            onClose={handleTeamModalClose}
          />
        ) : null}

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
        {nameResolveError && (
          <div className="mb-2 text-sm text-warning">{nameResolveError}</div>
        )}

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
                messageGroup.messages[0]
              );
              const displayName = getDisplayName(senderInfo);

              // System message rendering
              if (messageGroup.messages.length === 1) {
                const message = messageGroup.messages[0];
                const parsedMessage = parseSystemMessage(message.content);

                if (parsedMessage) {
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
                  } else if (parsedMessage.type === "application_cancelled") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderApplicationCancelledMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "member_removed") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderMemberRemovedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "role_changed") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderRoleChangedMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "ownership_transferred") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderOwnershipTransferredMessage(
                          message,
                          parsedMessage,
                          isCurrentUser
                        )}
                      </div>
                    );
                  } else if (parsedMessage.type === "ownership_team") {
                    return (
                      <div
                        key={`${dateString}-group-${groupIndex}`}
                        ref={isFirstHighlighted ? highlightedMessageRef : null}
                        className={wrapperClass}
                      >
                        {renderOwnershipTeamMessage(message, parsedMessage)}
                      </div>
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
                  className={`flex ${
                    isCurrentUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {conversationType === "team" &&
                    !isCurrentUser &&
                    messageGroup.showSenderInfo &&
                    renderAvatar(senderInfo, true, messageGroup.senderId)}

                  <div className="flex flex-col max-w-[70%]">
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
                          onClick={() =>
                            handleUserClick(messageGroup.senderId, displayName)
                          }
                          title={`View ${getDisplayName(
                            senderInfo,
                            false
                          )} details`}
                        >
                          {displayName}
                        </div>
                      )}

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

        <div ref={messagesEndRef} />
      </div>

      {conversationType === "team" && teamData?.id ? (
        <TeamDetailsModal
          isOpen={isTeamModalOpen}
          teamId={teamData.id}
          initialTeamData={teamData}
          onClose={handleTeamModalClose}
        />
      ) : null}

      <UserDetailsModal
        isOpen={isUserModalOpen}
        userId={selectedUserId}
        onClose={handleUserModalClose}
      />
    </>
  );
};

export default MessageDisplay;
