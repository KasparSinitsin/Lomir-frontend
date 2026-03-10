import React, { useState } from "react";
import {
  MapPin,
  Globe,
  Ruler,
  UserSearch,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import VacantRoleDetailsModal from "./VacantRoleDetailsModal";
import RoleBadgePill from "../common/RoleBadgePill";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import Tooltip from "../common/Tooltip";

/**
 * VacantRoleCard Component
 *
 * Compact card matching TeamMembersSection member cards.
 * Shows: avatar initials, role name, location, and "Vacant" badge.
 * Clicking opens VacantRoleDetailsModal with full details.
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
  const [showMenu, setShowMenu] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!role) return null;

  // Handle both camelCase (from API response interceptor) and snake_case
  const role_name = role.roleName ?? role.role_name;
  const city = role.city;
  const country = role.country;
  const state = role.state;
  const max_distance_km = role.maxDistanceKm ?? role.max_distance_km;
  const is_remote = role.isRemote ?? role.is_remote;
  const status = role.status;

  // Build location string (short, matching member card style)
  const getLocationText = () => {
    if (is_remote) return "Remote";
    const parts = [city, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const locationText = getLocationText();

  // Get initials from role name
  const getRoleInitials = () => {
    const name = role_name || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handle card click — open details modal
  const handleCardClick = (e) => {
    if (e.target.closest("[data-dropdown-menu]")) return;
    setIsDetailsOpen(true);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`flex items-start bg-amber-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-amber-100/70 hover:shadow-md cursor-pointer ${
          status !== "open" ? "opacity-70" : ""
        }`}
      >
        {/* Avatar with initials (w-12 h-12, matching TeamMembersSection) */}
        <div className="avatar placeholder">
          <div className="bg-amber-500 text-white rounded-full w-12 h-12 flex items-center justify-center">
            <span className="text-lg">{getRoleInitials()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-[1px] leading-tight">
          {/* Row 1: role name + badge */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0 overflow-hidden">
              <Tooltip
                content={role_name || "Vacant Role"}
                wrapperClassName="block w-full min-w-0 overflow-hidden"
              >
                <div className="block w-full min-w-0 truncate font-medium text-base-content hover:text-primary transition-colors leading-[120%]">
                  {role_name || "Vacant Role"}
                </div>
              </Tooltip>
            </div>

            <div className="relative flex-shrink-0" data-dropdown-menu>
              <RoleBadgePill
                icon={UserSearch}
                label="Vacant"
                badgeColorClass="badge-role-vacant"
                interactive={canManage}
                onClick={
                  canManage
                    ? (e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }
                    : undefined
                }
              />

              {canManage && showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-8 z-20 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-[140px]">
                    {onEdit && (
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                        onClick={(e) => {
                          e.stopPropagation();
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
                        onClick={(e) => {
                          e.stopPropagation();
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
                        onClick={(e) => {
                          e.stopPropagation();
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
                        onClick={(e) => {
                          e.stopPropagation();
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
                        onClick={(e) => {
                          e.stopPropagation();
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

          {/* Row 2: location + distance */}
          {locationText && (
            <CardMetaRow>
              <CardMetaItem icon={is_remote ? Globe : MapPin}>
                {locationText}
              </CardMetaItem>

              {!is_remote && max_distance_km && (
                <CardMetaItem icon={Ruler} tone="muted" nowrap>
                  within {max_distance_km} km
                </CardMetaItem>
              )}
            </CardMetaRow>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <VacantRoleDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        role={role}
      />
    </>
  );
};

export default VacantRoleCard;
