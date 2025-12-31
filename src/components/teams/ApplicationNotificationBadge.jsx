import React from "react";
import { Mail } from "lucide-react";

const ApplicationNotificationBadge = ({ count, onClick }) => {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center justify-center w-8 h-8"
      title={`${count} pending application${count > 1 ? "s" : ""}`}
    >
      {/* Background circle with hover effect */}
      <span
        className="absolute inset-0 rounded-full group-hover:opacity-80 transition-opacity"
        style={{
          backgroundColor:
            "#fce8ec" /* Light pink - same as --color-role-owner-text */,
        }}
      />
      {/* Icon with hover effect */}
      <Mail
        size={16}
        className="relative text-error group-hover:opacity-80 transition-opacity"
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

export default ApplicationNotificationBadge;
