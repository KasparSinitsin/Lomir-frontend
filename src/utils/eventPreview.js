import { describeEvent, personOf } from "./describeEvent";
import { getEventSentenceText } from "./eventSentences";

// Short, one-line rendering of a chat event: the conversation list, the reply
// bar in MessageInput and the notification toast. The long form lives in
// messageEventRenderers.jsx (transcript) and messageDisplayHelpers.js (quoted
// reply); all three now start from the same descriptor, so "who is this" and
// "do we know who acted" are decided once.
//
// ⚠️ `getActorLabel` used to return the STRING "You" and twelve places in this
// file compared against it. It is gone: perspective is `person.isViewer`.
//
// ⚠️ `t` is required for the families that are translated (see
// eventSentences.js). Pass the caller's own `t` from useTranslation, so a
// language switch re-renders the preview.

export const EVENT_PREVIEW_TEXT_COLORS = {
  "event-banner--admin": "#9a8ef0",
  "event-banner--member": "#33a742",
  "event-banner--owner": "#e86a86",
  "event-banner--success": "#16a34a",
  "event-banner--neutral": "#6b7280",
  role: "#f59e0b",
};

const teamText = (team) => (team?.name ? ` for "${team.name}"` : "");
const inTeamText = (team) => (team?.name ? ` in "${team.name}"` : "");

/** Subject position: "You" / "Anna" / the caller's fallback noun. */
const subject = (person, fallback) =>
  person.isViewer ? "You" : person.name || fallback;

/** Object position: "you" / "Anna" / the caller's fallback noun. */
export const objectLabel = (person, fallback) =>
  person.isViewer ? "you" : person.name || fallback;

/** Possessive: "Your" / "Anna's" / "Applicant's". */
const possessive = (person, fallback) =>
  person.isViewer ? "Your" : `${person.name || fallback}'s`;

/**
 * The byline the conversation list and the toast print as "by …".
 * ⚠️ Capitalised on purpose — it is rendered as its own fragment after the
 * sentence, not inside one.
 */
const byline = (person) => (person.isViewer ? "You" : person.name || null);

export const getEventPreview = (lastMessage, currentUser = null, t = null) => {
  const event = describeEvent(lastMessage, currentUser);

  if (!event) return null;

  const { team, role } = event;

  switch (event.type) {
    case "role_changed": {
      const member = personOf(event, "member");

      if (event.newRole === "admin") {
        return {
          text: `${subject(member, "Member")} ${
            member.isViewer ? "were" : "was"
          } promoted to Admin${inTeamText(team)}`,
          icon: "Shield",
          bannerClass: "event-banner--admin",
          color: EVENT_PREVIEW_TEXT_COLORS["event-banner--admin"],
        };
      }

      if (event.newRole === "member") {
        return {
          text: `${possessive(member, "Member")} role changed to Member${inTeamText(team)}`,
          icon: "User",
          bannerClass: "event-banner--member",
          color: EVENT_PREVIEW_TEXT_COLORS["event-banner--member"],
        };
      }

      return null;
    }

    case "ownership_transferred": {
      const newOwner = personOf(event, "newOwner");

      return {
        text: `${subject(newOwner, "New owner")} received ownership${teamText(team)}`,
        icon: "Crown",
        bannerClass: "event-banner--owner",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--owner"],
      };
    }

    case "ownership_team": {
      const newOwner = personOf(event, "newOwner");

      return {
        text: `${subject(newOwner, "New owner")} received ownership`,
        icon: "Crown",
        bannerClass: "event-banner--owner",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--owner"],
      };
    }

    case "team_join": {
      const user = personOf(event, "user");

      return {
        text: role.name
          ? `${subject(user, "Someone")} joined the team as ${role.name}`
          : `${subject(user, "Someone")} joined the team`,
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
      };
    }

    case "team_leave": {
      const user = personOf(event, "user");

      return {
        text: `${subject(user, "Member")} left the team`,
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "user_left_lomir":
      // ⚠️ Was "Former Lomir Member" here and in two other files, while the
      // constant both repos write is "Former Lomir User". One name now.
      return {
        text: "Former Lomir User left Lomir",
        icon: "LogOut",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "invitation_declined": {
      const invitee = personOf(event, "invitee");

      return {
        text: `${subject(invitee, "Invitee")} declined invitation${teamText(team)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "application_declined": {
      const applicant = personOf(event, "applicant");

      return {
        text: `${possessive(applicant, "Applicant")} application was declined${teamText(team)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "application_response":
      return {
        text: `Response to application${teamText(team)}`,
        icon: "FileText",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "invitation_cancelled": {
      const invitee = personOf(event, "invitee");

      return {
        text: invitee.isViewer
          ? `Your invitation was cancelled${teamText(team)}`
          : `Invitation cancelled for ${invitee.name || "invitee"}${teamText(team)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "application_approved":
    case "application_approved_dm": {
      const applicant = personOf(event, "applicant");
      const approver = personOf(event, "approver");

      return {
        text: `${possessive(applicant, "Applicant")} application was approved${teamText(team)}`,
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
        senderName: byline(approver),
        senderPrefix: "by ",
      };
    }

    // The roles family — sentences from eventSentences.js, in the active
    // language. Only the styling stays here.
    case "role_application_approved":
    case "role_application_filled":
    case "role_invitation_filled":
    case "role_invitation_accepted":
    case "role_invitation_assigned_legacy":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        ...(event.type === "role_application_filled" && {
          senderName: byline(personOf(event, "approver")),
          senderPrefix: "by ",
        }),
      };

    case "role_application_deferred_invite":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderName: byline(personOf(event, "approver")),
        senderPrefix: "by ",
      };

    case "role_closed":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
        senderPrefix: "by ",
      };

    case "role_updated":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "Pencil",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: "by ",
      };

    case "role_deleted":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
        senderPrefix: "by ",
      };

    case "role_created":
    case "role_reopened_admin":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: "by ",
      };

    case "role_reopened":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: personOf(event, "user").isKnown ? null : "by ",
      };

    case "role_filled":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderName: byline(personOf(event, "filledBy")),
        senderPrefix: "by ",
      };

    case "application_cancelled": {
      const applicant = personOf(event, "applicant");

      return {
        text: applicant.isViewer
          ? `You cancelled your application${teamText(team)}`
          : `${applicant.name || "Applicant"} cancelled application${teamText(team)}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "member_removed":
    case "member_removed_public": {
      const member = personOf(event, "member").isKnown
        ? personOf(event, "member")
        : personOf(event, "user");

      return {
        text: member.isViewer
          ? team.name
            ? `You were removed from "${team.name}"`
            : "You were removed from the team"
          : team.name
            ? `${member.name || "Member"} was removed from "${team.name}"`
            : `${member.name || "Member"} was removed from the team`,
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "team_deleted": {
      const owner = personOf(event, "owner");

      return {
        text: `${subject(owner, "Owner")} archived this team (scheduled for deletion)`,
        icon: "Archive",
        bannerClass: null,
        color: "#dc2626",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
      };
    }

    case "invitation_response":
      return {
        text: `Response to invitation${teamText(team)}`,
        icon: "FileText",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    default:
      return null;
  }
};
