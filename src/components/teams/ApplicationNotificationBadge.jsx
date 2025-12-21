import React from "react";
import { Mail } from "lucide-react";

const ApplicationNotificationBadge = ({ count, onClick }) => {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center w-8 h-8 rounded-full hover:opacity-80 transition-all"
      style={{
        backgroundColor:
          "#fce8ec" /* Light pink - same as --color-role-owner-text */,
      }}
      title={`${count} pending application${count > 1 ? "s" : ""}`}
    >
      <Mail size={16} className="text-error" />
      <span className="absolute -top-1 -right-1 bg-warning text-warning-content text-xs rounded-full min-w-5 h-5 flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
    </button>
  );
};

export default ApplicationNotificationBadge;
