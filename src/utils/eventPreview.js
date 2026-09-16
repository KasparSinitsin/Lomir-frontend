import { describeEvent, personOf } from "./describeEvent";

// Short, one-line rendering of a chat event: the conversation list, the reply
// bar in MessageInput and the notification toast. The long form lives in
// messageEventRenderers.jsx (transcript) and messageDisplayHelpers.js (quoted
// reply); all three now start from the same descriptor, so "who is this" and
// "do we know who acted" are decided once.
//
// ⚠️ `getActorLabel` used to return the STRING "You" and twelve places in this
// file compared against it. It is gone: perspective is `person.isViewer`.

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

export const getEventPreview = (lastMessage, currentUser = null) => {
  const event = describeEvent(lastMessage, currentUser);

  if (!event) return null;

  const { team, role } = event;
  const roleName = role.name || "Vacant Role";

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

    case "role_application_approved": {
      const applicant = personOf(event, "applicant");

      return {
        text: `${possessive(applicant, "Applicant")} application for ${roleName} was approved`,
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
      };
    }

    case "role_application_filled": {
      const applicant = personOf(event, "applicant");
      const approver = personOf(event, "approver");

      return {
        text: getRoleFilledSentence(roleName, applicant, approver),
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderName: byline(approver),
        senderPrefix: "by ",
      };
    }

    case "role_application_deferred_invite": {
      const applicant = personOf(event, "applicant");
      const approver = personOf(event, "approver");

      return {
        text: `${possessive(applicant, "Applicant")} application for ${roleName} was approved as a role offer`,
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderName: byline(approver),
        senderPrefix: "by ",
      };
    }

    case "role_invitation_filled": {
      const invitee = personOf(event, "invitee");

      return {
        text: invitee.isKnown
          ? invitee.isViewer
            ? `You accepted an invitation to fill ${roleName} and are now filling that role`
            : `${invitee.name} accepted an invitation to fill ${roleName} and is now filling that role`
          : `An invitation to fill ${roleName} was accepted and the role is now filled`,
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
      };
    }

    case "role_invitation_accepted": {
      const invitee = personOf(event, "invitee");
      const inviter = personOf(event, "inviter");
      const invitation = inviter.isKnown
        ? `${inviter.isViewer ? "your" : `${inviter.name}'s`} invitation`
        : "an invitation";

      // ⚠️ The nameless invitee used to render the literal word "Someone" in
      // the subject. The clause is dropped instead — the same rule the
      // transcript and the quoted reply now follow.
      if (!invitee.isKnown) {
        return {
          text: event.fillRole
            ? `An invitation to fill ${roleName} was accepted and the role is now filled`
            : `An invitation for ${roleName} was accepted`,
          icon: "UserCheck",
          bannerClass: null,
          color: EVENT_PREVIEW_TEXT_COLORS.role,
        };
      }

      return {
        text: event.fillRole
          ? invitee.isViewer
            ? `You accepted ${invitation} to fill ${roleName} and are now filling that role`
            : `${invitee.name} accepted ${invitation} to fill ${roleName}`
          : invitee.isViewer
            ? `You accepted ${invitation} for ${roleName}`
            : `${invitee.name} accepted ${invitation} for ${roleName}`,
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
      };
    }

    case "role_invitation_assigned_legacy": {
      const invitee = personOf(event, "invitee");

      return {
        text: `${subject(invitee, "Someone")} accepted an invitation for ${role.name || "a role"}`,
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
      };
    }

    case "role_closed":
      return {
        text: `Role closed: ${roleName}`,
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
        senderPrefix: "by ",
      };

    case "role_updated":
      return {
        text: `Role edited: ${roleName}`,
        icon: "Pencil",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: "by ",
      };

    case "role_deleted":
      return {
        text: `Role deleted: ${roleName}`,
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
        senderPrefix: "by ",
      };

    case "role_created":
      return {
        text: `New role ${roleName} created.`,
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: "by ",
      };

    case "role_reopened_admin":
      return {
        text: `Role reopened: ${roleName}`,
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: "by ",
      };

    case "role_reopened": {
      const user = personOf(event, "user");

      return {
        text: user.isKnown
          ? `${subject(user, "Member")} left the role ${roleName}. It is open again.`
          : `Role reopened: ${roleName}`,
        icon: "UserSearch",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderPrefix: user.isKnown ? null : "by ",
      };
    }

    case "role_filled": {
      const filler = personOf(event, "user");
      const filledBy = personOf(event, "filledBy");

      return {
        text: getRoleFilledSentence(roleName, filler, filledBy),
        icon: "UserCheck",
        bannerClass: null,
        color: EVENT_PREVIEW_TEXT_COLORS.role,
        senderName: byline(filledBy),
        senderPrefix: "by ",
      };
    }

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

/**
 * The one sentence this project has proved it cannot afford to write twice:
 * `grep "has been filled by"` used to return fourteen sites in five files.
 * ROLE_FILLED and ROLE_APPLICATION_FILLED say the same thing, so they share it.
 *
 * ⚠️ With no filler, the clause is dropped rather than filled with a noun —
 * the conversation list used to claim "has been filled by Someone" while the
 * transcript said "was marked as filled" for the very same message.
 */
export const getRoleFilledSentence = (roleName, filler, approver) => {
  if (!filler.isKnown) {
    return approver.isKnown
      ? `The role ${roleName} was marked as filled by ${objectLabel(approver, "an admin")}.`
      : `The role ${roleName} was marked as filled.`;
  }

  return approver.isKnown
    ? `The role ${roleName} has been filled by ${objectLabel(filler, "Someone")}, approved by ${objectLabel(approver, "an admin")}.`
    : `The role ${roleName} has been filled by ${objectLabel(filler, "Someone")}.`;
};
