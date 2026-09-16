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
import { describeEvent } from "./describeEvent";
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

/**
 * @param {string} content        the stored message
 * @param {object|null} viewer    the reader — the whole user, not only `{ id }`:
 *                                the id-less formats match the reader by name
 * @param {Function|null} t       i18next `t` — required: every event sentence is translated
 */
export const getEventReactionPreview = (content, viewer = null, t = null) => {
  const event = describeEvent(content, viewer);
  if (!event) return null;

  switch (event.type) {
    case "team_join": {
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    }
    case "application_approved":
    case "application_approved_dm":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
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
        text: getEventSentenceText(t, event, "full"),
        Icon: FileText,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "team_leave": {
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "user_left_lomir":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: LogOut,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "member_removed_public": {
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "application_declined":
    case "invitation_declined":
    case "invitation_cancelled":
    case "application_cancelled":
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "member_removed": {
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    }
    case "role_changed": {
      const isAdmin = event.newRole === "admin";
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: isAdmin ? Shield : User,
        trailingIcon: isAdmin ? PartyPopper : null,
        color: isAdmin
          ? EVENT_REACTION_PREVIEW_COLORS.admin
          : EVENT_REACTION_PREVIEW_COLORS.member,
      };
    }
    case "ownership_transferred": {
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: Crown,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.owner,
      };
    }
    case "ownership_team": {
      return {
        text: getEventSentenceText(t, event, "full"),
        Icon: Crown,
        color: EVENT_REACTION_PREVIEW_COLORS.owner,
      };
    }
    case "team_deleted": {
      return {
        text: getEventSentenceText(t, event, "full"),
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
