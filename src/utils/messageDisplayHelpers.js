// Pure (non-JSX) helpers extracted from MessageDisplay.jsx. getEventReactionPreview
// maps a parsed system/event message to a reaction preview ({ text, Icon,
// trailingIcon, color }) — the Icon/trailingIcon values are lucide component
// references, not JSX. formatReplyTooltipText renders a reply's plain-text
// tooltip. EVENT_REACTION_PREVIEW_COLORS is the shared color palette.

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
import { parseSystemMessage } from "./messageSystemParser";

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

export const getEventReactionPreview = (content) => {
  const parsedMessage = parseSystemMessage(content);
  if (!parsedMessage) return null;

  switch (parsedMessage.type) {
    case "team_join":
      return {
        text: parsedMessage.roleName
          ? `${parsedMessage.userName} joined the team as ${parsedMessage.roleName}. Say hello to them!`
          : `${parsedMessage.userName} has followed your invite and joined your team. Say hello to them!`,
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    case "application_approved":
      return {
        text: `${parsedMessage.applicantName} has applied successfully and was added by ${parsedMessage.approverName}. Say hello to them!`,
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    case "application_approved_dm":
      return {
        text: `${parsedMessage.applicantName}'s application for ${parsedMessage.teamName} was approved.`,
        Icon: UserPlus,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.success,
      };
    case "role_application_approved":
      return {
        text: `${parsedMessage.applicantName}'s application for ${parsedMessage.roleName} was approved.`,
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_application_filled":
      return {
        text: parsedMessage.approverName
          ? `The role "${parsedMessage.roleName}" has been filled by ${parsedMessage.applicantName}, approved by ${parsedMessage.approverName}.`
          : `The role "${parsedMessage.roleName}" has been filled by ${parsedMessage.applicantName}.`,
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_application_deferred_invite":
      return {
        text: `${parsedMessage.applicantName}'s application for "${parsedMessage.roleName}" was approved as a role offer because they already fill "${parsedMessage.currentRoleName}".`,
        Icon: UserSearch,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_invitation_filled":
      return {
        text: `${parsedMessage.inviteeName} has accepted an invitation to fill the role "${parsedMessage.roleName}" in this team and is now filling that role.`,
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_invitation_accepted":
      return {
        text: parsedMessage.fillRole
          ? `${parsedMessage.inviterName} invited ${parsedMessage.inviteeName} to fill "${parsedMessage.roleName}". They accepted and are now filling that role.`
          : `${parsedMessage.inviterName} invited ${parsedMessage.inviteeName} for "${parsedMessage.roleName}". They accepted the invitation.`,
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_invitation_assigned_legacy":
      return {
        text: `${parsedMessage.inviteeName} accepted an invitation and was assigned to the role "${parsedMessage.roleName}".`,
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_created":
      return {
        text: parsedMessage.creatorName
          ? `The new role "${parsedMessage.roleName}" has been created by ${parsedMessage.creatorName}. It is open to be filled.`
          : `The new role "${parsedMessage.roleName}" is open to be filled.`,
        Icon: UserSearch,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_closed":
      return {
        text: parsedMessage.closedByName
          ? `The role "${parsedMessage.roleName}" has been closed by ${parsedMessage.closedByName}.`
          : `The role "${parsedMessage.roleName}" has been closed.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "role_updated":
      return {
        text: parsedMessage.updatedByName
          ? `The role "${parsedMessage.roleName}" has been updated by ${parsedMessage.updatedByName}.`
          : `The role "${parsedMessage.roleName}" has been updated.`,
        Icon: Pencil,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_deleted":
      return {
        text: parsedMessage.deletorName
          ? `The role "${parsedMessage.roleName}" has been deleted by ${parsedMessage.deletorName}.`
          : `The role "${parsedMessage.roleName}" has been deleted.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "role_reopened":
      return {
        text: parsedMessage.userName
          ? `${parsedMessage.userName} has left the role ${parsedMessage.roleName}. The role is open again to be filled.`
          : `The role ${parsedMessage.roleName} is open again to be filled.`,
        Icon: UserSearch,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_reopened_admin":
      return {
        text: parsedMessage.userName
          ? `${parsedMessage.userName} has reopened the role ${parsedMessage.roleName}. It is open again to be filled.`
          : `The role ${parsedMessage.roleName} has been reopened and is open to be filled.`,
        Icon: UserSearch,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "role_filled":
      return {
        text: parsedMessage.userName && parsedMessage.filledByName
          ? `The role ${parsedMessage.roleName} has been filled by ${parsedMessage.userName}, approved by ${parsedMessage.filledByName}.`
          : parsedMessage.userName
          ? `The role ${parsedMessage.roleName} has been filled by ${parsedMessage.userName}.`
          : `The role ${parsedMessage.roleName} has been marked filled.`,
        Icon: UserCheck,
        color: EVENT_REACTION_PREVIEW_COLORS.role,
      };
    case "application_response":
    case "invitation_response":
      return {
        text: `Response for ${parsedMessage.teamName}.`,
        Icon: FileText,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "team_leave":
      return {
        text: `${parsedMessage.userName} has left the team.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "user_left_lomir":
      return {
        text: "Former Lomir Member has left Lomir.",
        Icon: LogOut,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "member_removed_public":
      return {
        text: `${parsedMessage.userName} has been removed from the team.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "application_declined":
      return {
        text: `${parsedMessage.applicantName}'s application for ${parsedMessage.teamName} was declined.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "invitation_declined":
      return {
        text: `${parsedMessage.inviteeName} declined the invitation for ${parsedMessage.teamName}.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "invitation_cancelled":
      return {
        text: `Invitation for ${parsedMessage.inviteeName} to join ${parsedMessage.teamName} was cancelled.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "application_cancelled":
      return {
        text: `${parsedMessage.applicantName} cancelled their application for ${parsedMessage.teamName}.`,
        Icon: CircleX,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "member_removed":
      return {
        text: `${parsedMessage.memberName} was removed from ${parsedMessage.teamName}.`,
        Icon: UserMinus,
        color: EVENT_REACTION_PREVIEW_COLORS.neutral,
      };
    case "role_changed": {
      const isAdmin = parsedMessage.newRole === "admin";
      return {
        text: `${parsedMessage.memberName}'s role was changed to ${parsedMessage.newRole} in ${parsedMessage.teamName}.`,
        Icon: isAdmin ? Shield : User,
        trailingIcon: isAdmin ? PartyPopper : null,
        color: isAdmin
          ? EVENT_REACTION_PREVIEW_COLORS.admin
          : EVENT_REACTION_PREVIEW_COLORS.member,
      };
    }
    case "ownership_transferred":
      return {
        text: `${parsedMessage.prevOwnerName} transferred ownership of ${parsedMessage.teamName} to ${parsedMessage.newOwnerName}.`,
        Icon: Crown,
        trailingIcon: PartyPopper,
        color: EVENT_REACTION_PREVIEW_COLORS.owner,
      };
    case "ownership_team":
      return {
        text: `${parsedMessage.prevOwnerName} transferred ownership to ${parsedMessage.newOwnerName}.`,
        Icon: Crown,
        color: EVENT_REACTION_PREVIEW_COLORS.owner,
      };
    case "team_deleted":
      return {
        text: `${parsedMessage.ownerName} archived ${parsedMessage.teamName}.`,
        Icon: AlertTriangle,
        color: EVENT_REACTION_PREVIEW_COLORS.error,
      };
    default:
      return null;
  }
};

export const formatReplyTooltipText = (content, eventPreview = null) => {
  if (eventPreview?.text) return eventPreview.text;

  return String(content ?? "").replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1");
};
