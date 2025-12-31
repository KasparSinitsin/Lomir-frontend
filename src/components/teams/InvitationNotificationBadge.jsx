import React from "react";
import { SendHorizontal } from "lucide-react";

/**
 * InvitationNotificationBadge Component
 *
 * Displays a badge showing the count of pending outgoing team invitations.
 * Visible for team owners and admins.
 * Uses a light violet color scheme to differentiate from the pink application badge.
 *
 * @param {number} count - Number of pending invitations
 * @param {Function} onClick - Click handler to open invitations modal
 */
const InvitationNotificationBadge = ({ count, onClick }) => {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center justify-center w-8 h-8"
      title={`${count} pending invitation${count > 1 ? "s" : ""} sent`}
    >
      {/* Background circle with hover effect */}
      <span
        className="absolute inset-0 rounded-full group-hover:opacity-80 transition-opacity"
        style={{
          backgroundColor:
            "#ede9fe" /* Light violet - same as --color-role-admin-text */,
        }}
      />
      {/* Icon with hover effect */}
      <SendHorizontal
        size={16}
        className="relative text-info group-hover:opacity-80 transition-opacity"
      />
      {/* Count badge - no hover effect */}
      <span
        className="absolute -top-1 -right-1 bg-warning text-white text-xs font-medium rounded-full min-w-5 h-5 flex items-center justify-center"
        style={{
          boxShadow:
            "0 1px 3px 0 rgba(223, 56, 91, 0.5)" /* Pink shadow matching cancel button style */,
        }}
      >
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
};

export default InvitationNotificationBadge;
