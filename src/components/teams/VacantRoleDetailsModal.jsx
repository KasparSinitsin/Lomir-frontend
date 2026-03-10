import React from "react";
import {
  MapPin,
  Globe,
  Ruler,
  UserSearch,
  Tag,
  Award,
  Calendar,
  Users,
  Sparkles,
  CircleDot,
} from "lucide-react";
import Modal from "../common/Modal";
import {
  getCategoryIcon,
  getSupercategoryIcon,
} from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  PILL_ROW_HEIGHT,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
  SUPERCATEGORY_ORDER,
} from "../../constants/badgeConstants";
import Tooltip from "../common/Tooltip";

/**
 * VacantRoleDetailsModal Component
 *
 * Read-only modal showing full details of a vacant team role.
 * Follows the same visual structure as UserDetailsModal:
 * - Header with avatar + name
 * - Bio section
 * - Location section
 * - Focus areas (tags)
 * - Desired badges
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Object} role - Full role data object
 */
const VacantRoleDetailsModal = ({
  isOpen,
  onClose,
  role,
  matchScore = null,
  matchDetails = null,
}) => {
  if (!role) return null;

  // Normalize camelCase/snake_case
  const roleName = role.roleName ?? role.role_name ?? "Vacant Role";
  const bio = role.bio ?? "";
  const city = role.city;
  const country = role.country;
  const state = role.state;
  const postalCode = role.postalCode ?? role.postal_code;
  const maxDistanceKm = role.maxDistanceKm ?? role.max_distance_km;
  const isRemote = role.isRemote ?? role.is_remote;
  const status = role.status;
  const createdAt = role.createdAt ?? role.created_at;
  const tags = role.tags || [];
  const badges = role.badges || [];
  const teamName = role.teamName ?? role.team_name;
  const teamMemberCount = role.teamMemberCount ?? role.team_member_count;
  const teamMaxMembers = role.teamMaxMembers ?? role.team_max_members;

  // Creator info
  const creatorFirstName = role.creatorFirstName ?? role.creator_first_name;
  const creatorLastName = role.creatorLastName ?? role.creator_last_name;
  const creatorUsername = role.creatorUsername ?? role.creator_username;
  const creatorName =
    creatorFirstName && creatorLastName
      ? `${creatorFirstName} ${creatorLastName}`
      : creatorUsername || null;

  // Initials for avatar
  const getRoleInitials = () => {
    const name = roleName || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Location text
  const getLocationText = () => {
    if (isRemote) return "Remote — no geographic preference";
    const parts = [city, state, country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const locationText = getLocationText();

  // Group badges by category
  const badgesByCategory = badges.reduce((acc, badge) => {
    const cat = badge.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  // Modal title
  const modalTitle = (
    <div className="flex items-center gap-2">
      <UserSearch className="text-amber-500" size={20} />
      <h2 className="text-lg font-medium">Vacant Role</h2>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      position="center"
      size="default"
      maxHeight="max-h-[90vh]"
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
    >
      <div className="space-y-6">
        {/* Header — avatar + role name + status */}
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="avatar placeholder">
            <div className="bg-amber-500 text-white rounded-full w-20 h-20 flex items-center justify-center">
              <span className="text-2xl">{getRoleInitials()}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{roleName}</h1>

            {/* Team info line */}
            {teamName && (
              <div className="flex items-center gap-1 mt-1 text-sm text-base-content/70">
                <Users size={14} className="text-primary flex-shrink-0" />
                <span>{teamName}</span>
                {teamMemberCount != null && (
                  <span className="text-base-content/50">
                    · {teamMemberCount}/{teamMaxMembers ?? "∞"} members
                  </span>
                )}
              </div>
            )}

            {/* Created date */}
            {createdAt && (
              <div className="flex items-center gap-1 mt-1 text-xs text-base-content/50">
                <Calendar size={12} />
                <span>Posted {formatDate(createdAt)}</span>
                {creatorName && <span> by {creatorName}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Bio / Description */}
        {bio && (
          <div>
            <p className="text-base-content/90 leading-relaxed">{bio}</p>
          </div>
        )}

        {/* Match Score Banner — shown when the user has a score for this role */}
        {matchScore !== null &&
          matchScore !== undefined &&
          (() => {
            const pct = Math.round(matchScore * 100);
            const tagPct = Math.round(
              (matchDetails?.tagScore ?? matchDetails?.tag_score ?? 0) * 100,
            );
            const badgePct = Math.round(
              (matchDetails?.badgeScore ?? matchDetails?.badge_score ?? 0) *
                100,
            );
            const distPct = Math.round(
              (matchDetails?.distanceScore ??
                matchDetails?.distance_score ??
                0) * 100,
            );

            // Color tiers
            const tierColor =
              pct >= 70
                ? {
                    bg: "bg-emerald-50",
                    border: "border-emerald-200",
                    text: "text-emerald-700",
                    bar: "bg-emerald-500",
                  }
                : pct >= 40
                  ? {
                      bg: "bg-amber-50",
                      border: "border-amber-200",
                      text: "text-amber-700",
                      bar: "bg-amber-500",
                    }
                  : {
                      bg: "bg-base-200/50",
                      border: "border-base-300",
                      text: "text-base-content/70",
                      bar: "bg-base-content/40",
                    };

            return (
              <div
                className={`rounded-xl p-4 ${tierColor.bg} border ${tierColor.border}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className={tierColor.text} />
                  <span className={`text-sm font-semibold ${tierColor.text}`}>
                    {pct}% Match
                  </span>
                </div>

                {/* Score breakdown bars */}
                <div className="space-y-2">
                  {[
                    { label: "Focus Areas", value: tagPct, weight: "40%" },
                    { label: "Badges", value: badgePct, weight: "30%" },
                    { label: "Location", value: distPct, weight: "30%" },
                  ].map(({ label, value, weight }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-xs text-base-content/60 w-24 flex-shrink-0">
                        {label}
                        <span className="text-base-content/40 ml-1">
                          ({weight})
                        </span>
                      </span>
                      <div className="flex-1 h-1.5 bg-base-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tierColor.bar} transition-all duration-500`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-base-content/60 w-8 text-right">
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {/* Location */}
        {locationText && (
          <div>
            <div className="flex items-center mb-2">
              {isRemote ? (
                <Globe size={18} className="mr-2 text-primary flex-shrink-0" />
              ) : (
                <MapPin size={18} className="mr-2 text-primary flex-shrink-0" />
              )}
              <h3 className="font-medium">Location Preference</h3>
            </div>

            <div className="flex items-center gap-2 text-sm text-base-content/70">
              <span>{locationText}</span>
              {!isRemote && maxDistanceKm && (
                <span className="flex items-center gap-1 text-base-content/50">
                  <CircleDot size={14} />
                  within {maxDistanceKm} km from 
                </span>
              )}
            </div>
          </div>
        )}

        {/* Desired Focus Areas — grouped by supercategory */}
        <div>
          <div className="flex items-center mb-2">
            <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">Desired Focus Areas</h3>
          </div>

          {tags.length > 0 ? (
            (() => {
              // Group tags by supercategory
              const groups = {};
              for (const tag of tags) {
                const supercat = tag.supercategory || "Other";
                if (!groups[supercat]) groups[supercat] = [];
                groups[supercat].push(tag);
              }

              // Sort groups by SUPERCATEGORY_ORDER
              const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
                const idxA = SUPERCATEGORY_ORDER.indexOf(a);
                const idxB = SUPERCATEGORY_ORDER.indexOf(b);
                const posA = idxA === -1 ? 999 : idxA;
                const posB = idxB === -1 ? 999 : idxB;
                return posA - posB;
              });

              // Sort tags within each group alphabetically
              for (const [, groupTags] of sortedGroups) {
                groupTags.sort((a, b) => a.name.localeCompare(b.name));
              }

              return (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {sortedGroups.map(([supercategory, groupTags]) => (
                    <div
                      key={supercategory}
                      className="flex items-start gap-0"
                      title={supercategory}
                    >
                      {/* Supercategory icon */}
                      <Tooltip content={supercategory}>
                        <span
                          className="inline-flex items-center justify-center pr-[6px] flex-shrink-0"
                          style={{
                            height: PILL_ROW_HEIGHT,
                            color: FOCUS_GREEN_DARK,
                          }}
                        >
                          {getSupercategoryIcon(
                            supercategory,
                            14,
                            FOCUS_GREEN_DARK,
                          )}
                        </span>
                      </Tooltip>

                      {/* Tag pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {groupTags.map((tag) => (
                          <span
                            key={tag.tagId ?? tag.tag_id ?? tag.id}
                            className="badge badge-outline p-3"
                            style={{
                              borderColor: FOCUS_GREEN_DARK,
                              color: FOCUS_GREEN_DARK,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <p className="text-sm text-base-content/50">
              No specific focus areas required
            </p>
          )}
        </div>

        {/* Desired Badges */}
        <div>
          <div className="flex items-center mb-2">
            <Award size={18} className="mr-2 text-primary flex-shrink-0" />
            <h3 className="font-medium">Desired Badges</h3>
          </div>

          {badges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {Object.entries(badgesByCategory).map(([category, catBadges]) => {
                const categoryColor =
                  CATEGORY_COLORS[category] || DEFAULT_COLOR;

                return (
                  <div key={category} className="flex items-start">
                    {/* Category icon */}
                    <span
                      className="inline-flex items-center justify-center pr-[6px]"
                      style={{
                        height: PILL_ROW_HEIGHT,
                        color: categoryColor,
                      }}
                    >
                      {getCategoryIcon(category, categoryColor, 14)}
                    </span>

                    {/* Badge pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {catBadges.map((badge) => (
                        <Tooltip
                          key={badge.badgeId ?? badge.badge_id ?? badge.id}
                          content={
                            badge.description || `${badge.name} — ${category}`
                          }
                        >
                          <span
                            className="badge badge-outline p-3"
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
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-base-content/50">
              No specific badges required
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VacantRoleDetailsModal;
