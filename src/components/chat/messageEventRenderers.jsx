import React from "react";
import {
  CircleX,
  PartyPopper,
  Pencil,
  UserCheck,
  UserMinus,
  UserPlus,
  UserSearch,
} from "lucide-react";
import { formatLocalTime } from "../../utils/dateHelpers";

// Event/system message renderers extracted from MessageDisplay.jsx (Stage 4b).
// createEventRenderers receives a `ctx` bag of the parent-owned mention
// components and helpers, destructures them once, and returns the render*
// functions with their bodies kept verbatim. Built in two stages: role &
// application events first, membership/invitation/ownership events second.
export const createEventRenderers = (ctx) => {
  const {
    MentionById,
    TeamMentionById,
    RoleMentionById,
    userMentionOrYou,
    possessiveUserMentionOrYour,
    isCurrentViewer,
    highlightEventContent,
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

  return {
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
  };
};
