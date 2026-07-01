import React from "react";
import {
  Archive,
  CircleX,
  Crown,
  FileText,
  LogOut,
  PartyPopper,
  Pencil,
  Shield,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
} from "lucide-react";
import { formatLocalTime } from "../../utils/dateHelpers";
import { renderHighlightedSearchText } from "../../utils/messageDisplayRenderers";
import ReadReceipt from "./ReadReceipt";

// Event/system message renderers extracted from MessageDisplay.jsx (Stage 4b).
// createEventRenderers receives a `ctx` bag of the parent-owned mention
// components and helpers, destructures them once, and returns the render*
// functions with their bodies kept verbatim.
export const createEventRenderers = (ctx) => {
  const {
    Mention,
    MentionById,
    TeamMentionById,
    RoleMentionById,
    userMentionOrYou,
    possessiveUserMentionOrYour,
    isCurrentViewer,
    renderAvatar,
    renderSenderName,
    highlightEventContent,
    getReadByTooltip,
    currentUserId,
    conversationType,
    teamMembers,
    searchQuery,
  } = ctx;

  /**
   * Render an application approved DM message with special formatting (green theme)
   * Shows different text based on whether viewer is the approver or the applicant
   */
  const renderApplicationApprovedDmMessage = (
    message,
    parsedMessage,
    isCurrentUser,
  ) => {
    const messageText = isCurrentUser ? (
      parsedMessage.hasPersonalMessage ? (
        <>
          You approved{" "}
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
          You approved{" "}
          <MentionById
            userId={parsedMessage.applicantId}
            name={parsedMessage.applicantName}
          />
          {"'s"} application for{" "}
          <TeamMentionById
            teamId={parsedMessage.teamId}
            name={parsedMessage.teamName}
          />
        </>
      )
    ) : parsedMessage.hasPersonalMessage ? (
      <>
        Your application to{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
        was approved by{" "}
        <MentionById
          userId={parsedMessage.approverId}
          name={parsedMessage.approverName}
        />
        , who added this message:
      </>
    ) : (
      <>
        Your application to{" "}
        <TeamMentionById
          teamId={parsedMessage.teamId}
          name={parsedMessage.teamName}
        />{" "}
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
        <div className="event-banner event-banner--success mb-3">
          <span className="text-sm font-medium event-message-text">
            <UserPlus size={16} className="event-inline-icon mr-1" />
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

  // =============================================================================
  // renderApplicationApprovedMessage - Green success theme
  // =============================================================================
  const renderApplicationApprovedMessage = (
    message,
    parsedMessage,
  ) => {
    const isApplicantCurrentUser = isCurrentViewer(parsedMessage.applicantId);
    const isApproverCurrentUser = isCurrentViewer(parsedMessage.approverId);

    const welcomeText = isApplicantCurrentUser ? (
      <>
        Your application was approved by{" "}
        {userMentionOrYou(parsedMessage.approverId, parsedMessage.approverName)}
        . Welcome to the team!
      </>
    ) : isApproverCurrentUser ? (
      <>
        You approved{" "}
        {userMentionOrYou(parsedMessage.applicantId, parsedMessage.applicantName)}
        {"'s"} application. Say hello to them!
      </>
    ) : (
      <>
        {userMentionOrYou(parsedMessage.applicantId, parsedMessage.applicantName, {
          capitalized: true,
        })}{" "}
        has applied successfully and was added by{" "}
        {userMentionOrYou(parsedMessage.approverId, parsedMessage.approverName)}
        . Say hello to them!
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

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  // =============================================================================
  // renderRoleApplicationApprovedMessage - Orange role theme
  // =============================================================================
  const renderRoleApplicationApprovedMessage = (message, parsedMessage) => {
    const messageText = (
      <>
        {possessiveUserMentionOrYour(
          parsedMessage.applicantId,
          parsedMessage.applicantName,
        )}{" "}
        application for{" "}
        <RoleMentionById
          roleId={parsedMessage.roleId}
          name={parsedMessage.roleName}
          filledUserId={parsedMessage.applicantId}
          filledUserName={parsedMessage.applicantName}
          filledAt={message.createdAt}
        />{" "}
        was approved.
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserCheck size={16} className="event-inline-icon mr-1" />
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
  // renderRoleApplicationFilledMessage - Orange role theme (combined approval + fill)
  // =============================================================================
  const renderRoleApplicationFilledMessage = (message, parsedMessage) => {
    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
        filledUserId={parsedMessage.applicantId}
        filledUserName={parsedMessage.applicantName}
        filledAt={message.createdAt}
      />
    );

    const hasKnownApplicant =
      parsedMessage.applicantName &&
      parsedMessage.applicantName.trim().toLowerCase() !== "someone";
    const hasKnownApprover =
      parsedMessage.approverName &&
      parsedMessage.approverName.trim().toLowerCase() !== "someone";
    const applicantMention = hasKnownApplicant
      ? userMentionOrYou(parsedMessage.applicantId, parsedMessage.applicantName)
      : "someone";
    const approverMention = hasKnownApprover
      ? userMentionOrYou(parsedMessage.approverId, parsedMessage.approverName)
      : null;

    const messageText = (
      <>
        The role {roleMention} has been filled by {applicantMention}
        {approverMention ? (
          <span>, approved by {approverMention}.</span>
        ) : (
          "."
        )}
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserCheck size={16} className="event-inline-icon mr-1" />
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
  // renderRoleApplicationDeferredInviteMessage - Orange role theme (approval offer)
  // =============================================================================
  const renderRoleApplicationDeferredInviteMessage = (message, parsedMessage) => {
    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
      />
    );
    const currentRoleMention = (
      <RoleMentionById
        roleId={parsedMessage.currentRoleId}
        name={parsedMessage.currentRoleName}
        filledUserId={parsedMessage.applicantId}
        filledUserName={parsedMessage.applicantName}
      />
    );
    const applicantMention = userMentionOrYou(
      parsedMessage.applicantId,
      parsedMessage.applicantName,
      { capitalized: true },
    );
    const approverMention = userMentionOrYou(
      parsedMessage.approverId,
      parsedMessage.approverName,
    );
    const isApplicantCurrentUser = isCurrentViewer(parsedMessage.applicantId);

    const messageText = (
      <>
        {isApplicantCurrentUser ? "Your application" : <>{applicantMention}{"'s application"}</>}
        {" for "}{roleMention}{" was approved by "}
        {approverMention}
        {". "}
        {isApplicantCurrentUser ? "You already fill " : "They already fill "}
        {currentRoleMention}
        {", so this is now a role offer "}
        {isApplicantCurrentUser
          ? "you can accept once you leave your current role."
          : "they can accept once they leave their current role."}
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserSearch size={16} className="event-inline-icon mr-1" />
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
  // renderRoleInvitationFilledMessage - Orange role theme (invitation accepted + fill)
  // =============================================================================
  const renderRoleInvitationFilledMessage = (message, parsedMessage) => {
    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
        filledUserId={parsedMessage.inviteeId}
        filledUserName={parsedMessage.inviteeName}
        filledAt={message.createdAt}
      />
    );

    const isInviteeCurrentUser = isCurrentViewer(parsedMessage.inviteeId);
    const messageText = isInviteeCurrentUser ? (
      <>
        You accepted an invitation to fill the role {roleMention} in this team
        and are now filling that role.
      </>
    ) : parsedMessage.inviteeName &&
      parsedMessage.inviteeName.trim().toLowerCase() !== "someone" ? (
      <>
        <MentionById
          userId={parsedMessage.inviteeId}
          name={parsedMessage.inviteeName}
        />{" "}
        has accepted an invitation to fill the role {roleMention} in this team
        and is now filling that role.
      </>
    ) : (
      <>
        An invitation to fill the role {roleMention} was accepted and the role
        is now filled.
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserCheck size={16} className="event-inline-icon mr-1" />
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
  // renderRoleInvitationAcceptedMessage - Orange role theme (invitation accepted, with inviter)
  // =============================================================================
  const renderRoleInvitationAcceptedMessage = (message, parsedMessage) => {
    const hasInvitee =
      parsedMessage.inviteeName &&
      parsedMessage.inviteeName.trim().toLowerCase() !== "someone";
    const hasInviter =
      parsedMessage.inviterName &&
      parsedMessage.inviterName.trim().toLowerCase() !== "someone";
    const isInviteeCurrentUser = isCurrentViewer(parsedMessage.inviteeId);

    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
        filledUserId={parsedMessage.fillRole ? parsedMessage.inviteeId : null}
        filledUserName={parsedMessage.fillRole && hasInvitee ? parsedMessage.inviteeName : null}
        filledAt={parsedMessage.fillRole ? message.createdAt : null}
      />
    );

    const messageText = parsedMessage.fillRole ? (
      <>
        {hasInviter && (
          <>
            {userMentionOrYou(parsedMessage.inviterId, parsedMessage.inviterName, {
              capitalized: true,
            })}
            {" invited "}
          </>
        )}
        {hasInvitee ? (
          userMentionOrYou(parsedMessage.inviteeId, parsedMessage.inviteeName)
        ) : (
          "Someone"
        )}
        {" for the role "}{roleMention}
        {isInviteeCurrentUser
          ? ". You accepted and are now filling that role."
          : ". They accepted and are now filling that role."}
      </>
    ) : (
      <>
        {hasInviter && (
          <>
            {userMentionOrYou(parsedMessage.inviterId, parsedMessage.inviterName, {
              capitalized: true,
            })}
            {" invited "}
          </>
        )}
        {hasInvitee ? (
          userMentionOrYou(parsedMessage.inviteeId, parsedMessage.inviteeName)
        ) : (
          "Someone"
        )}
        {" for the role "}{roleMention}
        {isInviteeCurrentUser
          ? ". You accepted the invitation."
          : ". They accepted the invitation."}
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserCheck size={16} className="event-inline-icon mr-1" />
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
  // renderRoleInvitationAssignedLegacyMessage - Orange role theme (backend 🎯 format)
  // =============================================================================
  const renderRoleInvitationAssignedLegacyMessage = (message, parsedMessage) => {
    const roleMention = (
      <RoleMentionById
        roleId={null}
        name={parsedMessage.roleName}
      />
    );

    const messageText = (
      <>
        <MentionById userId={null} name={parsedMessage.inviteeName} />
        {" accepted an invitation to fill the role "}{roleMention}{" in this team."}
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserCheck size={16} className="event-inline-icon mr-1" />
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
  // renderRoleReopenedMessage - Orange role theme
  // =============================================================================
  const renderRoleReopenedMessage = (message, parsedMessage) => {
    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
      />
    );
    const messageText = parsedMessage.userName ? (
      <>
        {isCurrentViewer(parsedMessage.userId) ? (
          <>You have left the role {roleMention}. The role is open again to be filled.</>
        ) : (
          <>
            <MentionById
              userId={parsedMessage.userId}
              name={parsedMessage.userName}
            />{" "}
            has left the role {roleMention}. The role is open again to be filled.
          </>
        )}
      </>
    ) : (
      <>The role {roleMention} is open again to be filled.</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserSearch size={16} className="event-inline-icon mr-1" />
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
  // renderRoleReopenedAdminMessage - Orange role theme (closed → open by admin)
  // =============================================================================
  const renderRoleReopenedAdminMessage = (message, parsedMessage) => {
    const roleMention = (
      <RoleMentionById roleId={parsedMessage.roleId} name={parsedMessage.roleName} />
    );
    const messageText = parsedMessage.userName ? (
      <>
        {isCurrentViewer(parsedMessage.userId) ? (
          <>You have reopened the role {roleMention}. It is open again to be filled.</>
        ) : (
          <>
            <MentionById userId={parsedMessage.userId} name={parsedMessage.userName} />{" "}
            has reopened the role {roleMention}. It is open again to be filled.
          </>
        )}
      </>
    ) : (
      <>The role {roleMention} has been reopened and is open to be filled.</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserSearch size={16} className="event-inline-icon mr-1" />
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
  // renderRoleFilledMessage - Orange role theme
  // =============================================================================
  const renderRoleFilledMessage = (message, parsedMessage) => {
    const hasKnownFilledUser =
      parsedMessage.userName &&
      parsedMessage.userName.trim().toLowerCase() !== "someone";
    const hasKnownFilledBy =
      parsedMessage.filledByName &&
      parsedMessage.filledByName.trim().toLowerCase() !== "someone";

    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
        filledUserId={parsedMessage.userId}
        filledUserName={hasKnownFilledUser ? parsedMessage.userName : null}
        filledAt={message.createdAt}
      />
    );
    const filledByMention = hasKnownFilledBy ? (
      userMentionOrYou(parsedMessage.filledById, parsedMessage.filledByName)
    ) : null;
    const messageText = hasKnownFilledUser ? (
      <>
        The role {roleMention} has been filled by{" "}
        {userMentionOrYou(parsedMessage.userId, parsedMessage.userName)}
        {filledByMention ? (
          <span>, approved by {filledByMention}.</span>
        ) : (
          "."
        )}
      </>
    ) : (
      <>The role {roleMention} was marked as filled.</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserCheck size={16} className="event-inline-icon mr-1" />
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
  // renderRoleCreatedMessage - Orange role theme
  // =============================================================================
  const renderRoleCreatedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const roleMention = (
      <RoleMentionById
        roleId={parsedMessage.roleId}
        name={parsedMessage.roleName}
      />
    );

    const creatorId = parsedMessage.creatorId ?? senderId ?? null;
    const creatorName =
      parsedMessage.creatorName ||
      (senderInfo
        ? [
            senderInfo.firstName || senderInfo.first_name,
            senderInfo.lastName || senderInfo.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          senderInfo.username ||
          senderInfo.userName ||
          null
        : null);

    const messageText = creatorName ? (
      <>
        The new role {roleMention} has been created by{" "}
        {userMentionOrYou(creatorId, creatorName)} in this team. It
        is open to be filled.
      </>
    ) : (
      <>The new role {roleMention} is open to be filled.</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <UserSearch size={16} className="event-inline-icon mr-1" />
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
  // renderRoleClosedMessage - Neutral grey theme
  // =============================================================================
  const renderRoleClosedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const closedById = parsedMessage.closedById ?? senderId ?? null;
    const closedByName =
      parsedMessage.closedByName ||
      (senderInfo
        ? [senderInfo.firstName || senderInfo.first_name, senderInfo.lastName || senderInfo.last_name]
            .filter(Boolean)
            .join(" ") ||
          senderInfo.username ||
          senderInfo.userName ||
          null
        : null);

    const roleMention = (
      <RoleMentionById roleId={parsedMessage.roleId} name={parsedMessage.roleName} />
    );
    const messageText = closedByName ? (
      <>
        The role {roleMention} has been closed by{" "}
        {userMentionOrYou(closedById, closedByName)}.
      </>
    ) : (
      <>The role {roleMention} has been closed.</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div className="event-banner mb-3 event-banner--neutral">
          <span className="text-sm font-medium event-message-text">
            <CircleX size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>
        <div className="text-xs text-base-content/50">{formatLocalTime(message.createdAt)}</div>
      </div>
    );
  };

  // =============================================================================
  // renderRoleUpdatedMessage - Orange role theme
  // =============================================================================
  const renderRoleUpdatedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const updatedById = parsedMessage.updatedById ?? senderId ?? null;
    const updatedByName =
      parsedMessage.updatedByName ||
      (senderInfo
        ? [senderInfo.firstName || senderInfo.first_name, senderInfo.lastName || senderInfo.last_name]
            .filter(Boolean)
            .join(" ") ||
          senderInfo.username ||
          senderInfo.userName ||
          null
        : null);

    const roleMention = (
      <RoleMentionById roleId={parsedMessage.roleId} name={parsedMessage.roleName} />
    );
    const messageText = updatedByName ? (
      <>
        The role {roleMention} has been updated by{" "}
        {userMentionOrYou(updatedById, updatedByName)}.
      </>
    ) : (
      <>The role {roleMention} has been updated.</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            color: "#f59e0b",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <Pencil size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>
        <div className="text-xs text-base-content/50">{formatLocalTime(message.createdAt)}</div>
      </div>
    );
  };

  // =============================================================================
  // renderRoleDeletedMessage - Neutral grey theme
  // =============================================================================
  const renderRoleDeletedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const deletorId = parsedMessage.deletorId ?? senderId ?? null;
    const deletorName =
      parsedMessage.deletorName ||
      (senderInfo
        ? [
            senderInfo.firstName || senderInfo.first_name,
            senderInfo.lastName || senderInfo.last_name,
          ]
            .filter(Boolean)
            .join(" ") ||
          senderInfo.username ||
          senderInfo.userName ||
          null
        : null);

    const messageText = deletorName ? (
      <>
        The role <span className="font-medium">{parsedMessage.roleName}</span>{" "}
        has been deleted by{" "}
        {userMentionOrYou(deletorId, deletorName)} from this team.
      </>
    ) : (
      <>
        The role <span className="font-medium">{parsedMessage.roleName}</span>{" "}
        has been deleted from this team.
      </>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3 event-banner--neutral"
        >
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

  // =============================================================================
  // renderTeamDeletedMessage - Red danger theme (matches the archived-chat footer)
  // Posted at deletion time so the moment + who deleted stay visible in history.
  // =============================================================================
  const renderTeamDeletedMessage = (message, parsedMessage) => {
    const messageText = parsedMessage.ownerName ? (
      <>
        This team has just been archived (scheduled for deletion) by{" "}
        {userMentionOrYou(parsedMessage.ownerId, parsedMessage.ownerName)}.
      </>
    ) : (
      <>This team has just been archived (scheduled for deletion).</>
    );

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className="event-banner mb-3"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#dc2626",
          }}
        >
          <span className="text-sm font-medium event-message-text">
            <Archive size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(messageText)}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  return {
    renderTeamDeletedMessage,
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
    renderLeaveMessage,
    renderUserLeftLomirMessage,
    renderMemberRemovedPublicMessage,
    renderJoinMessage,
    renderInvitationCancelledMessage,
    renderInvitationDeclinedMessage,
    renderApplicationResponseMessage,
    renderApplicationDeclinedMessage,
    renderInvitationResponseMessage,
    renderApplicationCancelledMessage,
    renderRoleChangedMessage,
    renderOwnershipTeamMessage,
    renderOwnershipTransferredMessage,
    renderMemberRemovedMessage,
  };
};
