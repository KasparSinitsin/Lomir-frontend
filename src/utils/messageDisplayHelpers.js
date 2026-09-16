// Pure (non-JSX) helpers extracted from MessageDisplay.jsx. getEventReactionPreview
// maps a parsed system/event message to a reaction preview ({ text, Icon,
// trailingIcon, color }) — the Icon/trailingIcon values are lucide component
// references, not JSX. formatReplyTooltipText renders a reply's plain-text
// tooltip. EVENT_REACTION_PREVIEW_COLORS is the shared color palette.
//
// This is the QUOTE path of the four that render an event (see
// `lomir-docs-internal/PROPOSAL-event-sentences.md`): the quoted reply above a
// message and its tooltip. It now starts from the same descriptor as the
// transcript and the short preview, so it knows who the reader is — the quote
// used to say "Anna has left the team." to Anna herself.

import {
  AlertTriangle,
  CircleX,
  Crown,
  File,
  FileSpreadsheet,
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
import { describeEvent, personOf } from "./describeEvent";
import { objectLabel } from "./eventPreview";
import { getEventSentenceText } from "./eventSentences";

// Maps a file name to its lucide icon component reference (not JSX). Shared by
// FileAttachment and the reply-preview block in MessageDisplay.
export const getFileIcon = (fileName) => {
  if (!fileName) return File;
  const ext = fileName.split(".").pop().toLowerCase();

  if (["pdf", "doc", "docx", "txt"].includes(ext)) return FileText;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  return File;
};

const EVENT_REACTION_PREVIEW_COLORS = {
  admin: "#9a8ef0",
  member: "#33a742",
  neutral: "#6b7280",
  owner: "#e86a86",
  role: "#f59e0b",
  success: "#16a34a",
  error: "#dc2626",
};

/** Subject position: "You" / "Anna" / a fallback noun. */
const subject = (person, fallback) =>
  person.isViewer ? "You" : person.name || fallback;

/** Possessive: "Your" / "Anna's" / "Applicant's". */
const possessive = (person, fallback) =>
  person.isViewer ? "Your" : `${person.name || fallback}'s`;

/**
 * @param {string} content        the stored message
 * @param {object|null} viewer    the reader — the whole user, not only `{ id }`:
 *                                the id-less formats match the reader by name
 * @param {Function|null} t       i18next `t` — required for the translated families
 */
export const getEventReactionPreview = (content, viewer = null, t = null) => {
  const event = describeEvent(content, viewer);
  if (!event) return null;

  const { team, role } = event;

  switch (event.type) {
    case "team_join": {
      const user = personOf(event, "user");
      // ⚠️ Every viewer branch below exists for verb agreement, not politeness:
      // "You has applied" is what a bare name substitution produces.
      return {
        text: user.isViewer
          ? role.name
            ? `You joined the team as ${role.name}. Welcome aboard!`
            : "You joined the team. Welcome aboard!"
          : role.name
            ? `${user.name} joined the team as ${role.name}. Say hello to them!`
            : `${user.name} joined the team. Say hello to them!`,
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    }
    case "application_approved": {
      const applicant = personOf(event, "applicant");
      const approver = personOf(event, "approver");
      return {
        text: applicant.isViewer
          ? `Your application was approved by ${objectLabel(approver, "an admin")}. Welcome to the team!`
          : approver.isViewer
            ? `You approved ${applicant.name ? `${applicant.name}'s ` : "the "}application. Say hello to them!`
            : `${applicant.name || "Someone"} has applied successfully and was added by ${objectLabel(approver, "an admin")}. Say hello to them!`,
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    }
    case "application_approved_dm": {
      const applicant = personOf(event, "applicant");
      return {
        text: `${possessive(applicant, "Applicant")} application for ${team.name || "the team"} was approved.`,
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    }
    // The roles family — the same sentence as the transcript above it (D1),
    // with the reader's perspective (D2), from eventSentences.js.
    case "role_application_approved":
    case "role_application_filled":
    case "role_invitation_filled":
    case "role_invitation_accepted":
    case "role_invitation_assigned_legacy":
    case "role_filled":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_application_deferred_invite":
    case "role_created":
    case "role_reopened":
    case "role_reopened_admin":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserSearch,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_updated":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: Pencil,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_closed":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "role_deleted":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "application_response":
    case "invitation_response":
      return {
        text: `Response for ${team.name || "the team"}.`,
        Icon: FileText,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "team_leave": {
      const user = personOf(event, "user");
      return {
        text: `${subject(user, "Member")} ${user.isViewer ? "have" : "has"} left the team.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "user_left_lomir":
      return {
        text: "Former Lomir User has left Lomir.",
        Icon: LogOut,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "member_removed_public": {
      const user = personOf(event, "user");
      return {
        text: user.isViewer
          ? "You were removed from the team."
          : `${user.name || "Member"} has been removed from the team.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "application_declined": {
      const applicant = personOf(event, "applicant");
      return {
        text: `${possessive(applicant, "Applicant")} application for ${team.name || "the team"} was declined.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "invitation_declined": {
      const invitee = personOf(event, "invitee");
      return {
        text: `${subject(invitee, "Invitee")} declined the invitation for ${team.name || "the team"}.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "invitation_cancelled": {
      const invitee = personOf(event, "invitee");
      return {
        text: `Invitation for ${objectLabel(invitee, "an invitee")} to join ${team.name || "the team"} was cancelled.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "application_cancelled": {
      const applicant = personOf(event, "applicant");
      return {
        text: applicant.isViewer
          ? `You cancelled your application for ${team.name || "the team"}.`
          : `${applicant.name || "Applicant"} cancelled their application for ${team.name || "the team"}.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "member_removed": {
      const member = personOf(event, "member");
      return {
        text: member.isViewer
          ? `You were removed from ${team.name || "the team"}.`
          : `${member.name || "Member"} was removed from ${team.name || "the team"}.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "role_changed": {
      const member = personOf(event, "member");
      const isAdmin = event.newRole === "admin";
      // ⚠️ Used to interpolate the raw enum: "role was changed to admin".
      const newRoleLabel = isAdmin ? "Admin" : "Member";
      return {
        text: `${possessive(member, "Member")} role was changed to ${newRoleLabel} in ${team.name || "the team"}.`,
        Icon: isAdmin ? Shield : User,
        trailingIcon: isAdmin ? PartyPopper : null,
        color: isAdmin
          ? EVENT_REACTION_PREVIEW_COLORS.admin
          : EVENT_REACTION_PREVIEW_COLORS.member,
      };
    }
    case "ownership_transferred": {
      const prevOwner = personOf(event, "prevOwner");
      const newOwner = personOf(event, "newOwner");
      return {
        text: `${subject(prevOwner, "The previous owner")} transferred ownership of ${team.name || "the team"} to ${objectLabel(newOwner, "a new owner")}.`,
        Icon: Crown,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.owner,
      };
    }
    case "ownership_team": {
      const prevOwner = personOf(event, "prevOwner");
      const newOwner = personOf(event, "newOwner");
      return {
        text: prevOwner.isKnown
          ? `${subject(prevOwner, "The previous owner")} transferred ownership to ${objectLabel(newOwner, "a new owner")}.`
          : `Ownership was transferred to ${objectLabel(newOwner, "a new owner")}.`,
        Icon: Crown,
        color: EVENT_REACTION_PREVIEW_COLORS.owner,
      };
    }
    case "team_deleted": {
      const owner = personOf(event, "owner");
      return {
        text: owner.isKnown
          ? `${subject(owner, "The owner")} archived ${team.name || "this team"}.`
          : `${team.name || "This team"} was archived.`,
        Icon: AlertTriangle,
        color: EVENT_REACTION_PREVIEW_COLORS.error,
      };
    }
    default:
      return null;
  }
};

export const formatReplyTooltipText = (content, eventPreview = null) => {
  if (eventPreview?.text) return eventPreview.text;

  return String(content ?? "").replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
};
