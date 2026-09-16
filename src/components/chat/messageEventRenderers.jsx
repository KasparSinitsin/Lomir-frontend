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
import { describeEvent, personOf } from "../../utils/describeEvent";
import { getEventSentence, splitEventSentence } from "../../utils/eventSentences";
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
    isCurrentViewer,
    renderAvatar,
    renderSenderName,
    highlightEventContent,
    getReadByTooltip,
    currentUserId,
    currentUser,
    conversationType,
    teamMembers,
    searchQuery,
    t,
  } = ctx;

  // The transcript is one of four paths that render an event; all of them now
  // start here. `person.isKnown` replaces the
  // `name.trim().toLowerCase() !== "someone"` guards this file used to carry —
  // the placeholder is nulled by parseSystemMessage before it arrives.
  const eventOf = (parsedMessage) =>
    describeEvent(
      parsedMessage,
      currentUser ?? (currentUserId != null ? { id: currentUserId } : null),
    );

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
    // ⚠️ This is the prose format — names only, no ids — so both checks were
    // permanently false and the approver read about herself in the third
    // person ("… was added by Anna Madlen Albers", to Anna Madlen Albers).
    const isApplicantCurrentUser = isCurrentViewer(
      parsedMessage.applicantId,
      parsedMessage.applicantName,
    );
    const isApproverCurrentUser = isCurrentViewer(
      parsedMessage.approverId,
      parsedMessage.approverName,
    );

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
  // The roles family — one sentence per event from eventSentences.js, shared
  // with the short preview, the quoted reply and the search index. This file
  // only decides what each slot looks like: a clickable person, a role link.
  // =============================================================================

  /**
   * The four "by …" renderers fall back to the message's sender when the
   * payload carries no actor name. A deleted account stays nameless (D4).
   */
  const withSenderFallback = (person, senderInfo, senderId) => {
    if (person.isKnown || person.isDeleted || !senderInfo) return person;

    const name =
      [
        senderInfo.firstName || senderInfo.first_name,
        senderInfo.lastName || senderInfo.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      senderInfo.username ||
      senderInfo.userName ||
      null;
    if (!name) return person;

    const id = person.id ?? senderId ?? null;
    return {
      id,
      name,
      isViewer: isCurrentViewer(id, name),
      isDeleted: false,
      isKnown: true,
    };
  };

  const personMention = (person) =>
    person.id ? (
      <MentionById userId={person.id} name={person.name} />
    ) : (
      <Mention name={person.name} />
    );

  /**
   * ⚠️ Names reach the sentence only as components, never as text inside it —
   * see the header of eventSentences.js for why.
   */
  // ⚠️ Team names: the quotation marks are in the message (D6), so the
  // mention must not add its own.
  const defaultSlotElement = (value) => {
    if (value.kind === "person") return personMention(value.person);
    if (value.kind === "team") {
      return (
        <TeamMentionById teamId={value.entity?.id} name={value.entity?.name} quoted={false} />
      );
    }
    return null;
  };

  const renderSentence = (sentence, elements = {}) =>
    splitEventSentence(sentence).map((part, index) => (
      <React.Fragment key={index}>
        {"text" in part
          ? part.text
          : elements[part.slot] ?? defaultSlotElement(part.value)}
      </React.Fragment>
    ));

  /** The message's sender as the reader, for payloads that do not name them. */
  const senderAsViewer = (person, isCurrentUser) =>
    isCurrentUser && !person.isViewer
      ? { ...person, isViewer: true, isKnown: true }
      : person;

  const ROLE_BANNER_STYLE = {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    color: "#f59e0b",
  };

  const renderRoleEventBanner = (message, options) => {
    const { sentence, roleElements, Icon, neutral = false } = options;

    return (
      <div className="flex flex-col items-center w-full my-4">
        <div
          className={`event-banner mb-3${neutral ? " event-banner--neutral" : ""}`}
          style={neutral ? undefined : ROLE_BANNER_STYLE}
        >
          <span className="text-sm font-medium event-message-text">
            <Icon size={16} className="event-inline-icon mr-1" />
            {highlightEventContent(renderSentence(sentence, roleElements))}
          </span>
        </div>

        <div className="text-xs text-base-content/50">
          {formatLocalTime(message.createdAt)}
        </div>
      </div>
    );
  };

  const plainRoleMention = (parsedMessage) => (
    <RoleMentionById roleId={parsedMessage.roleId} name={parsedMessage.roleName} />
  );

  const renderRoleApplicationApprovedMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: {
        role: (
          <RoleMentionById
            roleId={parsedMessage.roleId}
            name={parsedMessage.roleName}
            filledUserId={parsedMessage.applicantId}
            filledUserName={parsedMessage.applicantName}
            filledAt={message.createdAt}
          />
        ),
      },
      Icon: UserCheck,
    });

  const renderRoleApplicationFilledMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: {
        role: (
          <RoleMentionById
            roleId={parsedMessage.roleId}
            name={parsedMessage.roleName}
            filledUserId={parsedMessage.applicantId}
            filledUserName={parsedMessage.applicantName}
            filledAt={message.createdAt}
          />
        ),
      },
      Icon: UserCheck,
    });

  const renderRoleApplicationDeferredInviteMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: {
        role: plainRoleMention(parsedMessage),
        currentRole: (
          <RoleMentionById
            roleId={parsedMessage.currentRoleId}
            name={parsedMessage.currentRoleName}
            filledUserId={parsedMessage.applicantId}
            filledUserName={parsedMessage.applicantName}
          />
        ),
      },
      Icon: UserSearch,
    });

  const renderRoleInvitationFilledMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: {
        role: (
          <RoleMentionById
            roleId={parsedMessage.roleId}
            name={parsedMessage.roleName}
            filledUserId={parsedMessage.inviteeId}
            filledUserName={parsedMessage.inviteeName}
            filledAt={message.createdAt}
          />
        ),
      },
      Icon: UserCheck,
    });

  const renderRoleInvitationAcceptedMessage = (message, parsedMessage) => {
    const event = eventOf(parsedMessage);
    const hasInvitee = personOf(event, "invitee").isKnown;

    return renderRoleEventBanner(message, {
      sentence: getEventSentence(t, event),
      roleElements: {
        role: (
          <RoleMentionById
            roleId={parsedMessage.roleId}
            name={parsedMessage.roleName}
            filledUserId={parsedMessage.fillRole ? parsedMessage.inviteeId : null}
            filledUserName={
              parsedMessage.fillRole && hasInvitee ? parsedMessage.inviteeName : null
            }
            filledAt={parsedMessage.fillRole ? message.createdAt : null}
          />
        ),
      },
      Icon: UserCheck,
    });
  };

  // The backend's 🎯 format carries a name but no ids.
  const renderRoleInvitationAssignedLegacyMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: {
        role: <RoleMentionById roleId={null} name={parsedMessage.roleName} />,
      },
      Icon: UserCheck,
    });

  const renderRoleReopenedMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: { role: plainRoleMention(parsedMessage) },
      Icon: UserSearch,
    });

  const renderRoleReopenedAdminMessage = (message, parsedMessage) =>
    renderRoleEventBanner(message, {
      sentence: getEventSentence(t, eventOf(parsedMessage)),
      roleElements: { role: plainRoleMention(parsedMessage) },
      Icon: UserSearch,
    });

  const renderRoleFilledMessage = (message, parsedMessage) => {
    const event = eventOf(parsedMessage);
    const hasKnownFilledUser = personOf(event, "user").isKnown;

    return renderRoleEventBanner(message, {
      sentence: getEventSentence(t, event),
      roleElements: {
        role: (
          <RoleMentionById
            roleId={parsedMessage.roleId}
            name={parsedMessage.roleName}
            filledUserId={parsedMessage.userId}
            filledUserName={hasKnownFilledUser ? parsedMessage.userName : null}
            filledAt={message.createdAt}
          />
        ),
      },
      Icon: UserCheck,
    });
  };

  const renderRoleCreatedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const event = eventOf(parsedMessage);
    const creator = withSenderFallback(personOf(event, "creator"), senderInfo, senderId);

    return renderRoleEventBanner(message, {
      sentence: getEventSentence(t, event, "full", { creator }),
      roleElements: { role: plainRoleMention(parsedMessage) },
      Icon: UserSearch,
    });
  };

  const renderRoleClosedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const event = eventOf(parsedMessage);
    const closedBy = withSenderFallback(personOf(event, "closedBy"), senderInfo, senderId);

    return renderRoleEventBanner(message, {
      sentence: getEventSentence(t, event, "full", { closedBy }),
      roleElements: { role: plainRoleMention(parsedMessage) },
      Icon: CircleX,
      neutral: true,
    });
  };

  const renderRoleUpdatedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const event = eventOf(parsedMessage);
    const updatedBy = withSenderFallback(personOf(event, "updatedBy"), senderInfo, senderId);

    return renderRoleEventBanner(message, {
      sentence: getEventSentence(t, event, "full", { updatedBy }),
      roleElements: { role: plainRoleMention(parsedMessage) },
      Icon: Pencil,
    });
  };

  // A deleted role has nothing to open, so its name is not a link.
  const renderRoleDeletedMessage = (message, parsedMessage, senderInfo = null, senderId = null) => {
    const event = eventOf(parsedMessage);
    const deletor = withSenderFallback(personOf(event, "deletor"), senderInfo, senderId);

    return renderRoleEventBanner(message, {
      sentence: getEventSentence(t, event, "full", { deletor }),
      roleElements: {
        role: <span className="font-medium">{parsedMessage.roleName}</span>,
      },
      Icon: UserMinus,
      neutral: true,
    });
  };

  // =============================================================================
  // renderLeaveMessage - Neutral grey theme (pill shape)
  // =============================================================================
  const renderLeaveMessage = (message, parsedMessage, isCurrentUser) => {
    // The sender of a leave message is the member who left.
    const event = eventOf(parsedMessage);
    const user = senderAsViewer(personOf(event, "user"), isCurrentUser);
    const leaveText = renderSentence(getEventSentence(t, event, "full", { user }));

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
  const renderUserLeftLomirMessage = (message, parsedMessage) => {
    const leaveText = renderSentence(getEventSentence(t, eventOf(parsedMessage)));

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
    // The payload does not name the remover; the sender is the remover.
    const event = eventOf(parsedMessage);
    const remover = isCurrentUser ? { isViewer: true, isKnown: true } : undefined;
    const text = renderSentence(
      getEventSentence(t, event, "full", remover ? { remover } : {}),
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
    // The sender of a join message is the member who joined.
    const event = eventOf(parsedMessage);
    const user = senderAsViewer(personOf(event, "user"), isCurrentUser);
    const welcomeText = renderSentence(
      getEventSentence(t, event, "full", { user }),
      {
        role: (
          <>
            <UserCheck size={16} className="event-inline-icon mx-1" />
            <Mention name={parsedMessage.roleName} />
          </>
        ),
      },
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
    const event = eventOf(parsedMessage);
    const isMemberCurrentUser = personOf(event, "member").isViewer;
    const messageText = renderSentence(getEventSentence(t, event));

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
    // ⚠️ OWNERSHIP_TEAM carries names only — no ids (messageSystemParser
    // "Pattern 14"), so the reader is recognised by name in describeEvent.
    const messageText = renderSentence(getEventSentence(t, eventOf(parsedMessage)));

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
  const renderOwnershipTransferredMessage = (message, parsedMessage) => {
    // ⚠️ Decided from the ids, not from the sender: a third reader used to be
    // told the ownership had been transferred "to you".
    const messageText = renderSentence(getEventSentence(t, eventOf(parsedMessage)));

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
  const renderMemberRemovedMessage = (message, parsedMessage) => {
    // ⚠️ Decided from the ids, not from the sender: a third reader used to be
    // told "You were removed".
    const messageText = renderSentence(getEventSentence(t, eventOf(parsedMessage)));

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
    const messageText = renderSentence(getEventSentence(t, eventOf(parsedMessage)));

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
