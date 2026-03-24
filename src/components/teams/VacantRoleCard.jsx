import React, { useState } from "react";
import {
  MapPin,
  Globe,
  CircleDot,
  UserSearch,
  UserCheck,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import VacantRoleDetailsModal from "./VacantRoleDetailsModal";
import RoleBadgePill from "../common/RoleBadgePill";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import Tooltip from "../common/Tooltip";
import { getDisplayName, getUserInitials } from "../../utils/userHelpers";
import { resolveFilledRoleUser } from "../../utils/vacantRoleUtils";

/**
 * VacantRoleCard Component
 *
 * Compact card matching TeamMembersSection member cards.
 * Shows: avatar initials, role name, location, status badge,
 * and optionally the authenticated user's match score.
 * Clicking opens VacantRoleDetailsModal with full details.
 *
 * @param {Object} role - Vacant role data from API
 * @param {boolean} canManage - Whether the current user can edit/delete this role
 * @param {Function} onEdit - Callback to open edit modal
 * @param {Function} onDelete - Callback to delete this role
 * @param {Function} onStatusChange - Callback to change role status
 * @param {number|null} matchScore - 0–1 match score (null = not available)
 * @param {Object|null} matchDetails - Breakdown: tagScore, badgeScore, distanceScore
 */
const VacantRoleCard = ({
  team = null,
  role,
  canManage = false,
  canManageStatus = false,
  isTeamMember = false,
  onEdit,
  onDelete,
  onStatusChange,
  allowedStatusActions = ["filled", "closed", "open"],
  statusActionLoading = false,
  matchScore = null,
  matchDetails = null,
  viewAsUserId = null,
  viewAsUser = null,
  onViewApplicationDetails = null,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!role) return null;

  // Handle both camelCase (from API response interceptor) and snake_case
  const role_name = role.roleName ?? role.role_name;
  const city = role.city;
  const country = role.country;
  const max_distance_km = role.maxDistanceKm ?? role.max_distance_km;
  const is_remote = role.isRemote ?? role.is_remote;
  const status = role.status;
  const statusActions = Array.isArray(allowedStatusActions)
    ? allowedStatusActions
    : [];

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

  // ── Match score helpers ──────────────────────────────────
  const hasMatchScore = matchScore !== null && matchScore !== undefined;
  const pct = hasMatchScore ? Math.round(matchScore * 100) : 0;

  /**
   * Color tiers for match score (solid fills for the avatar circle):
   */
  const getMatchColor = () => {
    if (pct >= 80)
      return {
        avatarBg: "bg-amber-500",
        avatarText: "text-white",
        sparkle: "text-white/40",
      };
    if (pct >= 50)
      return {
        avatarBg: "bg-success",
        avatarText: "text-white",
        sparkle: "text-white/40",
      };
    return {
      avatarBg: "bg-slate-400",
      avatarText: "text-white",
      sparkle: "text-white/40",
    };
  };

  const matchColor = hasMatchScore ? getMatchColor() : null;

  // Build tooltip text for match breakdown
  const getMatchTooltip = () => {
    if (!matchDetails) return `${pct}% match`;
    const tagPct = Math.round(
      (matchDetails.tagScore ?? matchDetails.tag_score ?? 0) * 100,
    );
    const badgePct = Math.round(
      (matchDetails.badgeScore ?? matchDetails.badge_score ?? 0) * 100,
    );
    const distPct = Math.round(
      (matchDetails.distanceScore ?? matchDetails.distance_score ?? 0) * 100,
    );
    return `${pct}% match — Tags ${tagPct}% · Badges ${badgePct}% · Location ${distPct}%`;
  };

  const canUpdateStatus =
    (canManage || canManageStatus) && typeof onStatusChange === "function";
  const canEditRole = canManage && typeof onEdit === "function";
  const canDeleteRole = canManage && typeof onDelete === "function";
  const canMarkFilled =
    canUpdateStatus &&
    status === "open" &&
    statusActions.includes("filled");
  const canCloseRole =
    canUpdateStatus &&
    status === "open" &&
    statusActions.includes("closed");
  const canReopenRole =
    canUpdateStatus &&
    status !== "open" &&
    statusActions.includes("open");
  const hasBadgeActions =
    canEditRole ||
    canDeleteRole ||
    canMarkFilled ||
    canCloseRole ||
    canReopenRole;
  const canOpenBadgeMenu = hasBadgeActions && !statusActionLoading;
  const isFilled = status === "filled";
  const filledUser = isFilled
    ? resolveFilledRoleUser(role, { viewAsUserId, viewAsUser })
    : null;
  const filledUserAvatarUrl =
    filledUser?.avatar_url ?? filledUser?.avatarUrl ?? null;
  const filledUserDisplayName =
    filledUser && getDisplayName(filledUser) !== "Unknown"
      ? getDisplayName(filledUser)
      : null;
  const filledByText = filledUserDisplayName
    ? `Filled by ${filledUserDisplayName}`
    : "Filled";
  const badgeConfig =
    isFilled
      ? {
          icon: UserCheck,
          label: "Filled",
          badgeColorClass: "badge-role-filled",
        }
      : {
          icon: UserSearch,
          label: "Vacant",
          badgeColorClass: "badge-role-vacant",
        };
  const cardColorClass = isFilled
    ? "bg-green-50 hover:bg-green-100"
    : "bg-amber-50 hover:bg-amber-100/70";
  const initialsAvatarClass = isFilled
    ? "bg-success text-white"
    : "bg-amber-500 text-white";

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`flex items-start rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:shadow-md cursor-pointer ${cardColorClass} ${
          status !== "open" ? "opacity-70" : ""
        }`}
      >
        {/* Avatar — shows match score when available, initials otherwise */}
        <div className="flex-shrink-0">
          {isFilled && filledUser ? (
            <div className="avatar">
              <div className="w-12 h-12 rounded-full relative">
                {filledUserAvatarUrl ? (
                  <img
                    src={filledUserAvatarUrl}
                    alt={filledUserDisplayName || "Filled role"}
                    className="object-cover w-full h-full rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(".avatar-fallback");
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback bg-success text-white flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{ display: filledUserAvatarUrl ? "none" : "flex" }}
                >
                  <span className="text-lg font-medium">
                    {getUserInitials(filledUser)}
                  </span>
                </div>
              </div>
            </div>
          ) : hasMatchScore ? (
            <Tooltip content={getMatchTooltip()}>
              <div className="avatar placeholder">
                <div
                  className={`${matchColor.avatarBg} ${matchColor.avatarText} rounded-full w-12 h-12 relative flex items-center justify-center overflow-hidden`}
                >
                  {/* Icon in background */}
                  {pct >= 80 ? (
                    <Sparkles
                      size={40}
                      className={`absolute ${matchColor.sparkle}`}
                      strokeWidth={1.5}
                    />
                  ) : pct >= 50 ? (
                    <TrendingUp
                      size={40}
                      className={`absolute ${matchColor.sparkle}`}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <TrendingDown
                      size={40}
                      className={`absolute ${matchColor.sparkle}`}
                      strokeWidth={1.5}
                    />
                  )}
                  {/* Score text on top */}
                  <span className="relative text-lg font-bold leading-none">
                    {pct}%
                  </span>
                </div>
              </div>
            </Tooltip>
          ) : (
            <div className="avatar placeholder">
              <div
                className={`${initialsAvatarClass} rounded-full w-12 h-12 flex items-center justify-center`}
              >
                <span className="text-lg">{getRoleInitials()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-[1px]">
          {/* Row 1: role name + badge */}
          <div className="flex items-center justify-between gap-2 min-w-0">
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
                icon={badgeConfig.icon}
                label={badgeConfig.label}
                badgeColorClass={badgeConfig.badgeColorClass}
                interactive={canOpenBadgeMenu}
                loading={statusActionLoading}
                onClick={
                  canOpenBadgeMenu
                    ? (e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }
                    : undefined
                }
              />

              {canOpenBadgeMenu && showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-8 z-20 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-[200px]">
                    {canEditRole && (
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
                    {canMarkFilled && (
                      <button
                        className="flex items-start gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onStatusChange(role.id, "filled");
                        }}
                      >
                        <CheckCircle size={14} className="text-success flex-shrink-0 mt-[2px]" />
                        {viewAsUser
                          ? `Mark role as filled with ${
                              viewAsUser.firstName ??
                              viewAsUser.first_name ??
                              viewAsUser.username ??
                              "this applicant"
                            }`
                          : "Mark Filled"}
                      </button>
                    )}
                    {canCloseRole && (
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
                    {canReopenRole && (
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
                    {canDeleteRole && (
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
          {isFilled ? (
            <CardMetaRow>
              <CardMetaItem icon={UserCheck}>{filledByText}</CardMetaItem>
            </CardMetaRow>
          ) : locationText && (
            <CardMetaRow>
              <CardMetaItem icon={is_remote ? Globe : MapPin}>
                {locationText}
              </CardMetaItem>

              {!is_remote && max_distance_km && (
                <CardMetaItem icon={CircleDot} tone="muted" nowrap>
                  {max_distance_km} km
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
        team={team}
        role={role}
        matchScore={matchScore}
        matchDetails={matchDetails}
        canManage={canManage}
        isTeamMember={isTeamMember}
        viewAsUserId={viewAsUserId}
        viewAsUser={viewAsUser}
        onViewApplicationDetails={onViewApplicationDetails}
      />
    </>
  );
};

export default VacantRoleCard;
