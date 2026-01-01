import React from "react";
import { Mail, SendHorizontal, MessageCircle, Bell } from "lucide-react";

/**
 * NotificationBadge Component
 *
 * A flexible notification badge component that can be used in two ways:
 * 1. Standalone: Renders its own icon with background based on variant
 * 2. Wrapper: Wraps children and overlays a count badge
 *
 * @param {string} variant - Predefined style: "application", "invitation", "message", "alert"
 * @param {number} count - Number to display in badge
 * @param {Function} onClick - Click handler
 * @param {React.ReactNode} children - Optional children to wrap (overrides variant icon)
 * @param {string} className - Additional classes for the container
 * @param {string} title - Tooltip text (auto-generated if not provided)
 * @param {boolean} showZero - Whether to show badge when count is 0 (default: false)
 */

const VARIANTS = {
  application: {
    backgroundColor: "#fce8ec", // Light pink
    Icon: Mail,
    iconColorClass: "text-error",
    getTitle: (count) =>
      `${count} pending application${count !== 1 ? "s" : ""}`,
  },
  invitation: {
    backgroundColor: "#ede9fe", // Light violet
    Icon: SendHorizontal,
    iconColorClass: "text-info",
    getTitle: (count) =>
      `${count} pending invitation${count !== 1 ? "s" : ""} sent`,
  },
  message: {
    backgroundColor: "#dcfce7", // Light green
    Icon: MessageCircle,
    iconColorClass: "text-primary",
    getTitle: (count) => `${count} unread message${count !== 1 ? "s" : ""}`,
  },
  alert: {
    backgroundColor: "#fef3c7", // Light yellow
    Icon: Bell,
    iconColorClass: "text-warning",
    getTitle: (count) => `${count} notification${count !== 1 ? "s" : ""}`,
  },
};

/**
 * CountBadge - The actual count pill component
 * Extracted for reuse and consistency
 */
const CountBadge = ({ count, className = "" }) => (
  <span
    className={`bg-warning text-white text-xs font-medium rounded-full min-w-5 h-5 flex items-center justify-center ${className}`}
    style={{
      boxShadow: "0 1px 3px 0 rgba(223, 56, 91, 0.5)",
    }}
  >
    {count > 9 ? "9+" : count}
  </span>
);

const NotificationBadge = ({
  variant = "application",
  count,
  onClick,
  children,
  className = "",
  title,
  showZero = false,
}) => {
  const config = VARIANTS[variant];
  const shouldShowBadge = count > 0 || showZero;

  // Wrapper mode: If children are provided, wrap them with the count badge
  if (children) {
    return (
      <div
        className={`relative inline-flex ${className}`}
        onClick={onClick}
        title={title || (shouldShowBadge ? config?.getTitle(count) : undefined)}
      >
        {children}
        {shouldShowBadge && (
          <CountBadge count={count} className="absolute -top-2 -right-2" />
        )}
      </div>
    );
  }

  // Standalone mode: Don't render if count is 0 (unless showZero is true)
  if (!shouldShowBadge) return null;

  // Standalone mode: Render icon with background based on variant
  if (!config) {
    console.warn(`NotificationBadge: Unknown variant "${variant}"`);
    return null;
  }

  const { backgroundColor, Icon, iconColorClass, getTitle } = config;

  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center w-8 h-8 ${className}`}
      title={title || getTitle(count)}
    >
      {/* Background circle with hover effect */}
      <span
        className="absolute inset-0 rounded-full group-hover:opacity-80 transition-opacity"
        style={{ backgroundColor }}
      />
      {/* Icon with hover effect */}
      <Icon
        size={16}
        className={`relative ${iconColorClass} group-hover:opacity-80 transition-opacity`}
      />
      {/* Count badge - no hover effect */}
      <CountBadge count={count} className="absolute -top-1 -right-1" />
    </button>
  );
};

// Export CountBadge separately for cases where only the badge is needed
export { CountBadge };
export default NotificationBadge;
