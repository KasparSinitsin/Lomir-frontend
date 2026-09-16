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

/**
 * The byline the conversation list and the toast print as "by …".
 * ⚠️ Capitalised on purpose — it is rendered as its own fragment after the
 * sentence, not inside one.
 */
const byline = (person) => (person.isViewer ? "You" : person.name || null);

export const getEventPreview = (lastMessage, currentUser = null, t = null) => {
  const event = describeEvent(lastMessage, currentUser);

  if (!event) return null;

  switch (event.type) {
    case "role_changed": {
      if (event.newRole === "admin") {
        return {
          text: getEventSentenceText(t, event, "short"),
          icon: "Shield",
          bannerClass: "event-banner--admin",
          color: EVENT_PREVIEW_TEXT_COLORS["event-banner--admin"],
        };
      }

      if (event.newRole === "member") {
        return {
          text: getEventSentenceText(t, event, "short"),
          icon: "User",
          bannerClass: "event-banner--member",
          color: EVENT_PREVIEW_TEXT_COLORS["event-banner--member"],
        };
      }

      return null;
    }

    case "ownership_transferred": {
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "Crown",
        bannerClass: "event-banner--owner",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--owner"],
      };
    }

    case "ownership_team": {
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "Crown",
        bannerClass: "event-banner--owner",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--owner"],
      };
    }

    case "team_join": {
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
      };
    }

    case "team_leave": {
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "user_left_lomir":
      // ⚠️ Was "Former Lomir Member" here and in two other files, while the
      // constant both repos write is "Former Lomir User". One name now.
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "LogOut",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    // The applications + invitations family — sentences from
    // eventSentences.js, like every other family now.
    case "invitation_declined":
    case "application_declined":
    case "invitation_cancelled":
    case "application_cancelled":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "CircleX",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "application_response":
    case "invitation_response":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "FileText",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };

    case "application_approved":
    case "application_approved_dm":
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserPlus",
        bannerClass: "event-banner--success",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--success"],
        senderName: byline(personOf(event, "approver")),
        senderPrefix: "by ",
      };

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

    case "member_removed":
    case "member_removed_public": {
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "UserMinus",
        bannerClass: "event-banner--neutral",
        color: EVENT_PREVIEW_TEXT_COLORS["event-banner--neutral"],
      };
    }

    case "team_deleted": {
      return {
        text: getEventSentenceText(t, event, "short"),
        icon: "Archive",
        bannerClass: null,
        color: "#dc2626",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
      };
    }

    default:
      return null;
  }
};
