import React, { useEffect, useState } from "react";
import {
  Users,
  MapPin,
  Ruler,
  ChevronRight,
  ChevronUp,
  UserCheck,
  FlaskConical,
} from "lucide-react";
import RoleBadgeDropdown from "./RoleBadgeDropdown";
import Alert from "../common/Alert";
import { teamService } from "../../services/teamService";
import { userService } from "../../services/userService";
import { formatDisplayName } from "../../utils/nameFormatters";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import Tooltip from "../common/Tooltip";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import { DEMO_PROFILE_TOOLTIP, isSyntheticUser } from "../../utils/userHelpers";

const memberSyntheticStatusCache = new Map();

const extractProfilePayload = (response) => {
  const payload = response?.data ?? response;

  if (!payload) return null;
  if (payload?.success !== undefined) return payload?.data ?? null;

  return payload?.data?.data ?? payload?.data ?? payload;
};

const getCachedMemberSyntheticStatus = async (memberId) => {
  const cacheKey = String(memberId);

  if (memberSyntheticStatusCache.has(cacheKey)) {
    return memberSyntheticStatusCache.get(cacheKey);
  }

  const request = (async () => {
    const response = await userService.getUserById(memberId);
    return isSyntheticUser(extractProfilePayload(response));
  })();

  memberSyntheticStatusCache.set(cacheKey, request);

  try {
    const result = await request;
    memberSyntheticStatusCache.set(cacheKey, Promise.resolve(result));
    return result;
  } catch (error) {
    memberSyntheticStatusCache.delete(cacheKey);
    throw error;
  }
};

/**
 * TeamMembersSection Component
 * EXACT replica of original member rendering from TeamDetailsModal
 * Preserves all original styling, layout, and functionality
 */
const TeamMembersSection = ({
  team,
  // isEditing: isEditing = false,
  // isAuthenticated: isAuthenticated = false,
  user = null,
  onMemberClick = () => {},
  shouldAnonymizeMember = () => false,
  isOwner = false,
  onRoleChange = null,
  onMemberRemoved = null,
  className = "",
  roles = [],
}) => {
  const [notification, setNotification] = React.useState({
    type: null,
    message: null,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [syntheticMemberStatusMap, setSyntheticMemberStatusMap] = useState({});
  const COLLAPSED_COUNT = 4;

  // Helper function to get member initials (2 letters: "NK" for Nam Khoa)
  const getMemberInitials = (member) => {
    const firstName = member.firstName || member.first_name;
    const lastName = member.lastName || member.last_name;

    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase();
    }
    if (member.username) {
      return member.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  useEffect(() => {
    const members = Array.isArray(team?.members) ? team.members : [];
    const nextKnownStatuses = {};
    const memberIdsToFetch = [];

    members.forEach((member) => {
      const memberId = member?.userId ?? member?.user_id ?? null;
      if (memberId == null) return;

      const cacheKey = String(memberId);
      const hasInlineSyntheticFlag =
        member?.is_synthetic != null || member?.isSynthetic != null;

      if (hasInlineSyntheticFlag) {
        const isDemoMember = isSyntheticUser(member);
        nextKnownStatuses[cacheKey] = isDemoMember;
        memberSyntheticStatusCache.set(cacheKey, Promise.resolve(isDemoMember));
        return;
      }

      memberIdsToFetch.push(memberId);
    });

    if (Object.keys(nextKnownStatuses).length > 0) {
      setSyntheticMemberStatusMap((prev) => ({
        ...prev,
        ...nextKnownStatuses,
      }));
    }

    if (memberIdsToFetch.length === 0) {
      return undefined;
    }

    let cancelled = false;

    Promise.allSettled(
      [...new Set(memberIdsToFetch)].map(async (memberId) => ({
        memberId,
        isSynthetic: await getCachedMemberSyntheticStatus(memberId),
      })),
    ).then((results) => {
      if (cancelled) return;

      const fetchedStatuses = {};

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;

        fetchedStatuses[String(result.value.memberId)] = result.value.isSynthetic;
      });

      if (Object.keys(fetchedStatuses).length > 0) {
        setSyntheticMemberStatusMap((prev) => ({
          ...prev,
          ...fetchedStatuses,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [team?.members]);

  // Early return if no members
  if (!team?.members || team.members.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Section Header */}
      <div className="flex items-center mb-4">
        <Users size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">
          Team Members
          <span className="font-normal text-sm text-base-content/60 ml-1">
            ({team.members.length} {team.members.length === 1 ? 'member' : 'members'})
          </span>
        </h3>
      </div>

      {/* Notification Alert */}
      {notification.type && (
        <Alert
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ type: null, message: null })}
          className="mb-4"
        />
      )}

      {/* Members Grid - using key to force re-render when roles change */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        key={team.members
          .map((m) => `${m.user_id || m.userId}-${m.role}`)
          .join(",")}
      >
        {(isExpanded ? team.members : team.members.slice(0, COLLAPSED_COUNT)).map((member) => {
          // Check which property is available (userId or user_id)
          const memberId = member.userId || member.user_id;
          const isCurrentUser = memberId === user?.id;

          // Determine if this member should be anonymized
          const anonymize = shouldAnonymizeMember(member);
          const memberAvatarUrl =
            !anonymize ? member.avatarUrl || member.avatar_url || null : null;
          const memberSyntheticStatus =
            memberId != null ? syntheticMemberStatusMap[String(memberId)] : undefined;
          const showDemoAvatarOverlay =
            memberSyntheticStatus ?? isSyntheticUser(member);

          // Find the filled role this member is filling (if any)
          const filledRole = roles.find((r) => {
            if (String(r.status ?? "").toLowerCase() !== "filled") return false;
            const filledById =
              r.filledByUserId ?? r.filled_by_user_id ?? r.filledBy ?? r.filled_by ?? null;
            return filledById != null && String(filledById) === String(memberId);
          });
          const filledRoleName = filledRole?.roleName ?? filledRole?.role_name ?? null;
          const shouldShowMemberMetaRow =
            showDemoAvatarOverlay ||
            (!anonymize &&
              (member.city ||
                member.country ||
                member.distance_km != null ||
                filledRoleName));

          // Role management logic - Owners and admins can manage roles
          const currentUserMember = team.members?.find(
            (m) => m.user_id === user?.id || m.userId === user?.id,
          );
          const isAdmin = currentUserMember?.role === "admin";

          const canManageThisMember =
            (isOwner || isAdmin) && member.role !== "owner" && !isCurrentUser;

          return (
            <div
              key={memberId}
              className="flex items-start bg-green-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-green-100 hover:shadow-md"
            >
              <div className="avatar">
                <div className="rounded-full w-12 h-12 relative overflow-hidden">
                  {memberAvatarUrl ? (
                    <img
                      src={memberAvatarUrl}
                      alt={member.username}
                      className="object-cover w-full h-full rounded-full"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback =
                          e.target.parentElement.querySelector(
                            ".avatar-fallback",
                          );
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="avatar-fallback placeholder bg-primary text-primary-content rounded-full w-full h-full absolute inset-0 flex items-center justify-center"
                    style={{ display: memberAvatarUrl ? "none" : "flex" }}
                  >
                    <span className="text-lg">
                      {anonymize ? "PP" : getMemberInitials(member)}
                    </span>
                  </div>
                  {showDemoAvatarOverlay && (
                    <DemoAvatarOverlay textClassName="text-[8px]" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-[1px]">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <Tooltip
                      content={
                        anonymize
                          ? "Private Profile"
                          : (() => {
                              const firstName =
                                member.firstName || member.first_name || "";
                              const lastName =
                                member.lastName || member.last_name || "";
                              const fullName =
                                `${firstName} ${lastName}`.trim();
                              return fullName || member.username || "Unknown";
                            })()
                      }
                    >
                      <div
                        className={`min-w-0 ${!anonymize ? "cursor-pointer" : ""}`}
                        onClick={() => !anonymize && onMemberClick(memberId)}
                      >
                        <h3 className="font-medium text-base truncate leading-[120%]">
                          {anonymize
                            ? "Private Profile"
                            : formatDisplayName(member)}
                        </h3>
                      </div>
                    </Tooltip>

                    {/* Role Badge with Dropdown */}
                    <RoleBadgeDropdown
                      member={member}
                      canManage={canManageThisMember}
                      isOwner={isOwner}
                      isTeamArchived={
                        team?.archived_at || team?.status === "inactive"
                      }
                      onRoleChange={async (newRole) => {
                        try {
                          await teamService.updateMemberRole(
                            team.id,
                            memberId,
                            newRole,
                          );
                          setNotification({
                            type: "success",
                            message: `${member.username || "Member"} has been ${
                              newRole === "admin"
                                ? "promoted to Admin"
                                : "demoted to Member"
                            } successfully!`,
                          });
                          // Refresh team data from parent
                          if (onRoleChange) {
                            await onRoleChange();
                          }
                        } catch (error) {
                          setNotification({
                            type: "error",
                            message:
                              error.response?.data?.message ||
                              "Failed to update role",
                          });
                        }
                      }}
                      onRemoveMember={async () => {
                        try {
                          await teamService.removeTeamMember(team.id, memberId);
                          setNotification({
                            type: "success",
                            message: `${
                              member.username || "Member"
                            } has been removed from the team.`,
                          });
                          if (onMemberRemoved) {
                            await onMemberRemoved();
                          }
                        } catch (error) {
                          setNotification({
                            type: "error",
                            message:
                              error.response?.data?.message ||
                              "Failed to remove member",
                          });
                        }
                      }}
                    />
                  </div>

                  {shouldShowMemberMetaRow && (
                    <CardMetaRow>
                      {!anonymize && (member.city || member.country) && (
                        <CardMetaItem icon={MapPin}>
                          {[member.city, member.country].filter(Boolean).join(", ")}
                        </CardMetaItem>
                      )}

                      {showDemoAvatarOverlay && (
                        <Tooltip
                          content={DEMO_PROFILE_TOOLTIP}
                          wrapperClassName="flex items-start gap-0.5 text-base-content/50"
                        >
                          <FlaskConical size={10} className="shrink-0 mt-[3px]" />
                          <span className="leading-tight">Demo</span>
                        </Tooltip>
                      )}

                      {!anonymize && member.distance_km != null && (
                        <CardMetaItem icon={Ruler} tone="muted" nowrap>
                          {Math.round(member.distance_km)} km away
                        </CardMetaItem>
                      )}

                      {!anonymize && filledRoleName && (
                        <CardMetaItem icon={UserCheck} nowrap>
                          {filledRoleName}
                        </CardMetaItem>
                      )}
                    </CardMetaRow>
                  )}

                  {!anonymize && member.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="badge badge-outline badge-sm text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {team.members.length > COLLAPSED_COUNT && (
        <button
          type="button"
          className="flex items-center gap-1 mt-3 text-sm text-base-content/50 hover:text-base-content/80 transition-colors"
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
          {isExpanded ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
};

export default TeamMembersSection;
