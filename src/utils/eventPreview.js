import { parseSystemMessage } from "../components/chat/MessageDisplay";
import { getDisplayName } from "./userHelpers";

export const EVENT_PREVIEW_TEXT_COLORS = {
  "event-banner--admin": "#9a8ef0",
  "event-banner--member": "#33a742",
  "event-banner--owner": "#e86a86",
  "event-banner--success": "#16a34a",
  "event-banner--neutral": "#6b7280",
  role: "#f59e0b",
};

const teamText = (teamName) => (teamName ? ` for "${teamName}"` : "");
const inTeamText = (teamName) => (teamName ? ` in "${teamName}"` : "");

const possessive = (name) => (name === "You" ? "Your" : `${name}'s`);

const getActorLabel = (userId, userName, currentUser) => {
  const currentUserName = currentUser ? getDisplayName(currentUser) : null;

  if (
    userId != null &&
    currentUser?.id != null &&
    String(userId) === String(currentUser.id)
  ) {
    return "You";
  }

  if (
    userName &&
    userId == null &&
    currentUserName &&
    userName.trim().toLowerCase() === currentUserName.trim().toLowerCase()
  ) {
    return "You";
  }

  return userName || null;
};

export const getEventPreview = (lastMessage, currentUser = null) => {
  const parsedMessage = parseSystemMessage(lastMessage);

  if (!parsedMessage) return null;

  switch (parsedMessage.type) {
    case "role_changed": {
      const memberName = getActorLabel(
        parsedMessage.memberId,
        parsedMessage.memberName,
        currentUser,
      );

      if (parsedMessage.newRole === "admin") {
        return {
          text:
            memberName === "You"
              ? `You were promoted to Admin${inTeamText(parsedMessage.teamName)}`
              : `${memberName || "Member"} was promoted to Admin${inTeamText(parsedMessage.teamName)}`,
          icon: "Shield",
          bannerClass: "event-banner--admin",
          color: EVENT_PREVIEW_TEXT_COLORS["event-banner--admin"],
        };
      }

      if (parsedMessage.newRole === "member") {
        return {
          text: `${possessive(memberName || "Member")} role changed to Member${inTeamText(parsedMessage.teamName)}`,
          icon: "User",
          bannerClass: "event-banner--member",
          color: EVENT_PREVIEW_TEXT_COLORS["event-banner--member"],
        };
      }

      return null;
    }

    case "ownership_transferred": {
      const newOwnerName = getActorLabel(
        parsedMessage.newOwnerId,
        parsedMessage.newOwnerName,
        currentUser,
      );

      return {
        text:
          newOwnerName === "You"
            ? `You received ownership${teamText(parsedMessage.teamName)}`
            : `${newOwnerName || "New owner"} received ownership${teamText(parsedMessage.teamName)}`,
        icon: "Crown",
        bannerClass: "event-banner--owner",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--owner"],
      };
    }

    case "ownership_team": {
      const newOwnerName = getActorLabel(
        parsedMessage.newOwnerId,
        parsedMessage.newOwnerName,
        currentUser,
      );

      return {
        text:
          newOwnerName === "You"
            ? "You received ownership"
            : `${newOwnerName || "New owner"} received ownership`,
        icon: "Crown",
        bannerClass: "event-banner--owner",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--owner"],
      };
    }

    case "team_join":
      return {
        text: `${getActorLabel(parsedMessage.userId, parsedMessage.userName, currentUser) || "Someone"} joined the team`,
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
      };

    case "team_leave": {
      const userName = getActorLabel(
        parsedMessage.userId,
        parsedMessage.userName,
        currentUser,
      );

      return {
        text:
          userName === "You"
            ? "You left the team"
            : `${userName || "Member"} left the team`,
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "user_left_lomir":
      return {
        text: `${getActorLabel(parsedMessage.userId, parsedMessage.userName, currentUser) || "User"} left Lomir`,
        icon: "LogOut",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "invitation_accepted":
      return {
        text: `${getActorLabel(parsedMessage.inviteeId, parsedMessage.inviteeName, currentUser) || "Invitee"} accepted invitation${teamText(parsedMessage.teamName)}`,
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
      };

    case "invitation_declined":
      return {
        text: `${getActorLabel(parsedMessage.inviteeId, parsedMessage.inviteeName, currentUser) || "Invitee"} declined invitation${teamText(parsedMessage.teamName)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "application_declined": {
      const applicantName = getActorLabel(
        parsedMessage.applicantId,
        parsedMessage.applicantName,
        currentUser,
      );

      return {
        text: `${possessive(applicantName || "Applicant")} application was declined${teamText(parsedMessage.teamName)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "application_response":
      return {
        text: `Response to application${teamText(parsedMessage.teamName)}`,
        icon: "FileText",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "invitation_cancelled": {
      const inviteeName = getActorLabel(
        parsedMessage.inviteeId,
        parsedMessage.inviteeName,
        currentUser,
      );

      return {
        text:
          inviteeName === "You"
            ? `Your invitation was cancelled${teamText(parsedMessage.teamName)}`
            : `Invitation cancelled for ${inviteeName || "invitee"}${teamText(parsedMessage.teamName)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "application_approved":
    case "application_approved_dm": {
      const applicantName = getActorLabel(
        parsedMessage.applicantId,
        parsedMessage.applicantName,
        currentUser,
      );

      return {
        text: `${possessive(applicantName || "Applicant")} application was approved${teamText(parsedMessage.teamName)}`,
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
      };
    }

    case "role_application_approved": {
      const applicantName = getActorLabel(
        parsedMessage.applicantId,
        parsedMessage.applicantName,
        currentUser,
      );

      return {
        text: `${possessive(applicantName || "Applicant")} application for ${parsedMessage.roleName} was approved`,
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
      };
    }

    case "application_cancelled": {
      const applicantName = getActorLabel(
        parsedMessage.applicantId,
        parsedMessage.applicantName,
        currentUser,
      );

      return {
        text:
          applicantName === "You"
            ? `You cancelled your application${teamText(parsedMessage.teamName)}`
            : `${applicantName || "Applicant"} cancelled application${teamText(parsedMessage.teamName)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "member_removed":
    case "member_removed_public": {
      const memberName = getActorLabel(
        parsedMessage.memberId ?? parsedMessage.userId,
        parsedMessage.memberName ?? parsedMessage.userName,
        currentUser,
      );
      const teamName = parsedMessage.teamName;

      return {
        text:
          memberName === "You"
            ? teamName
              ? `You were removed from "${teamName}"`
              : "You were removed from the team"
            : teamName
              ? `${memberName || "Member"} was removed from "${teamName}"`
              : `${memberName || "Member"} was removed from the team`,
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "team_deleted": {
      const ownerName = getActorLabel(
        parsedMessage.ownerId,
        parsedMessage.ownerName,
        currentUser,
      );

      return {
        text:
          ownerName === "You"
            ? "You archived this team"
            : `${ownerName || "Owner"} archived this team`,
        icon: "AlertTriangle",
        bannerClass: null,
        color: "#dc2626",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
      };
    }

    case "invitation_response":
      return {
        text: `Response to invitation${teamText(parsedMessage.teamName)}`,
        icon: "FileText",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    default:
      return null;
  }
};
