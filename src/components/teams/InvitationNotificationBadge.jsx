import React from "react";
import { SendHorizontal } from "lucide-react";

/**
 * InvitationNotificationBadge Component
 *
 * Displays a badge showing the count of pending outgoing team invitations.
 * Visible for team owners and admins.
 * Uses a blue/info color scheme to differentiate from the red application badge.
 *
 * @param {number} count - Number of pending invitations
 * @param {Function} onClick - Click handler to open invitations modal
 */
const InvitationNotificationBadge = ({ count, onClick }) => {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center w-8 h-8 bg-info text-info-content rounded-full hover:bg-info-focus transition-colors"
      title={`${count} pending invitation${count > 1 ? "s" : ""} sent`}
    >
      <SendHorizontal size={16} />
      <span className="absolute -top-1 -right-1 bg-warning text-warning-content text-xs rounded-full min-w-5 h-5 flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
};

export default InvitationNotificationBadge;
