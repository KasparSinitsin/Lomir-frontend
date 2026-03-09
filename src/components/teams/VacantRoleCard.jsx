import React, { useState } from "react";
import {
  MapPin,
  Globe,
  Ruler,
  Tag,
  Award,
  ChevronDown,
  ChevronUp,
  UserSearch,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getCategoryIcon } from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  PILL_ROW_HEIGHT,
} from "../../constants/badgeConstants";
import { FOCUS_GREEN, FOCUS_GREEN_DARK } from "../../constants/badgeConstants";
import Tooltip from "../common/Tooltip";

/**
 * VacantRoleCard Component
 *
 * Displays a single vacant team role as an expandable card.
 * Follows the same visual style as TeamMembersSection member cards
 * (green-tinted backgrounds, rounded-xl, badge pills).
 *
 * @param {Object} role - Vacant role data from API
 * @param {boolean} canManage - Whether the current user can edit/delete this role
 * @param {Function} onEdit - Callback to open edit modal
 * @param {Function} onDelete - Callback to delete this role
 * @param {Function} onStatusChange - Callback to change role status
 */
const VacantRoleCard = ({
  role,
  canManage = false,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!role) return null;

  // Handle both camelCase (from API response interceptor) and snake_case
  const role_name = role.roleName ?? role.role_name;
  const bio = role.bio;
  const city = role.city;
  const country = role.country;
  const state = role.state;
  const postal_code = role.postalCode ?? role.postal_code;
  const max_distance_km = role.maxDistanceKm ?? role.max_distance_km;
  const is_remote = role.isRemote ?? role.is_remote;
  const status = role.status;
  const tags = role.tags || [];
  const badges = role.badges || [];

  // Build location string
  const getLocationText = () => {
    if (is_remote) return "Remote";
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const locationText = getLocationText();

  // Group badges by category for display
  const badgesByCategory = badges.reduce((acc, badge) => {
    const cat = badge.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  // Get initials from role name (e.g. "Drummer" → "DR", "Lead Vocalist" → "LV")
  const getRoleInitials = () => {
    const name = role_name || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className={`flex items-start bg-amber-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-amber-100/70 hover:shadow-md ${
        status !== "open" ? "opacity-70" : ""
      }`}
    >
      {/* Avatar with initials (matching TeamMembersSection w-12 h-12) */}
      <div className="avatar placeholder">
        <div className="bg-amber-500 text-white rounded-full w-12 h-12 flex items-center justify-center">
          <span className="text-lg">{getRoleInitials()}</span>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + role badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-base-content">
            {role_name || "Vacant Role"}
          </div>

          {/* Role badge with dropdown (matching Owner/Admin/Member badge style) */}
          <div className="relative flex-shrink-0">
            <span
              onClick={canManage ? () => setShowMenu(!showMenu) : undefined}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500 text-white ${
                canManage
                  ? "cursor-pointer hover:shadow-md transition-all duration-200"
                  : ""
              }`}
            >
              <UserSearch size={12} />
              Vacant
            </span>

            {/* Dropdown menu (for owners/admins) */}
            {canManage && showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-20 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-[140px]">
                  {onEdit && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(role);
                      }}
                    >
                      <Edit size={14} />
                      Edit Role
                    </button>
                  )}
                  {status === "open" && onStatusChange && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={() => {
                        setShowMenu(false);
                        onStatusChange(role.id, "filled");
                      }}
                    >
                      <CheckCircle size={14} className="text-success" />
                      Mark Filled
                    </button>
                  )}
                  {status === "open" && onStatusChange && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={() => {
                        setShowMenu(false);
                        onStatusChange(role.id, "closed");
                      }}
                    >
                      <XCircle size={14} className="text-warning" />
                      Close Role
                    </button>
                  )}
                  {status !== "open" && onStatusChange && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                      onClick={() => {
                        setShowMenu(false);
                        onStatusChange(role.id, "open");
                      }}
                    >
                      <CheckCircle size={14} className="text-primary" />
                      Reopen Role
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left text-error"
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(role.id);
                      }}
                    >
                      <Trash2 size={14} />
                      Delete Role
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location line */}
        {locationText && (
          <div className="flex items-center gap-1 mt-1 text-sm text-base-content/60">
            {is_remote ? (
              <Globe size={14} className="flex-shrink-0" />
            ) : (
              <MapPin size={14} className="flex-shrink-0" />
            )}
            <span>{locationText}</span>
            {!is_remote && max_distance_km && (
              <>
                <span className="mx-1">·</span>
                <Ruler size={14} className="flex-shrink-0" />
                <span>{max_distance_km} km radius</span>
              </>
            )}
          </div>
        )}

      {/* Tags preview (always visible, compact) */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <span
              key={tag.tagId ?? tag.tag_id}
              className="badge badge-outline badge-sm p-2"
              style={{ borderColor: FOCUS_GREEN_DARK, color: FOCUS_GREEN_DARK }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Badges preview (always visible, compact, grouped by category) */}
      {badges.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
          {Object.entries(badgesByCategory).map(([category, catBadges]) => {
            const categoryColor = CATEGORY_COLORS[category] || DEFAULT_COLOR;
            return (
              <div key={category} className="flex items-center gap-1">
                {/* Category icon */}
                <span
                  className="inline-flex items-center justify-center"
                  style={{ color: categoryColor, height: PILL_ROW_HEIGHT }}
                >
                  {getCategoryIcon(category, categoryColor, 13)}
                </span>
                {/* Badge pills */}
                {catBadges.map((badge) => (
                  <Tooltip
                    key={badge.badgeId ?? badge.badge_id}
                    content={`Desired: ${badge.name}`}
                  >
                    <span
                      className="badge badge-outline badge-sm p-2"
                      style={{
                        borderColor: badge.color || categoryColor,
                        color: badge.color || categoryColor,
                      }}
                    >
                      {badge.name}
                    </span>
                  </Tooltip>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Expand/collapse for bio */}
      {bio && (
        <>
          <button
            className="flex items-center gap-1 mt-2 text-xs text-base-content/50 hover:text-base-content/70 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? "Less" : "More details"}
          </button>

          {isExpanded && (
            <div className="mt-2 pt-2 border-t border-base-200/50">
              <p className="text-sm text-base-content/80 leading-relaxed">
                {bio}
              </p>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default VacantRoleCard;
