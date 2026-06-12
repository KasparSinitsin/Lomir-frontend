import React, { useMemo, useState } from "react";
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
import ScreenAlert from "../common/ScreenAlert";
import { teamService } from "../../services/teamService";
import { formatDisplayName } from "../../utils/nameFormatters";
import { formatListLocation } from "../../utils/locationUtils";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import Tooltip from "../common/Tooltip";
import UserAvatar from "../users/UserAvatar";
import { DEMO_PROFILE_TOOLTIP, isSyntheticUser } from "../../utils/userHelpers";

const getTeamMemberId = (member) =>
  member?.userId ??
  member?.user_id ??
  member?.memberId ??
  member?.member_id ??
  member?.user?.id ??
  member?.id ??
  null;

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
  const COLLAPSED_COUNT = 4;
  const members = useMemo(
    () => (Array.isArray(team?.members) ? team.members : []),
    [team?.members],
  );
  // Only show the synthetic indicator when the parent embeds is_synthetic
  // in the member object. Fetching profiles per member just to discover this
  // flag was an N+1 (one round trip per member); the indicator is only
  // meaningful for demo users, so gracefully degrade when the data is absent.
  const syntheticMemberStatusMap = useMemo(() => {
    const statuses = {};

    members.forEach((member) => {
      const memberId = getTeamMemberId(member);
      if (memberId == null) return;

      const hasInlineSyntheticFlag =
        member?.is_synthetic != null || member?.isSynthetic != null;
      if (hasInlineSyntheticFlag) {
        statuses[String(memberId)] = isSyntheticUser(member);
      }
    });

    return statuses;
  }, [members]);

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

      <ScreenAlert
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: null, message: null })}
      />

      {/* Members Grid - using key to force re-render when roles change */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        key={team.members
          .map((m) => `${getTeamMemberId(m)}-${m.role}`)
          .join(",")}
      >
        {(isExpanded ? team.members : team.members.slice(0, COLLAPSED_COUNT)).map((member) => {
          // Check which property is available (userId or user_id)
          const memberId = getTeamMemberId(member);
          const isCurrentUser =
            memberId != null && String(memberId) === String(user?.id);

          // Determine if this member should be anonymized
          const anonymize = shouldAnonymizeMember(member);
          const memberAvatarUrl =
            !anonymize ? member.avatarUrl || member.avatar_url || null : null;
          const displayMember = {
            ...member,
            avatar_url: memberAvatarUrl,
            avatarUrl: memberAvatarUrl,
            is_public: anonymize ? false : member.is_public,
            isPublic: anonymize ? false : member.isPublic,
            is_private: anonymize ? true : member.is_private,
            isPrivate: anonymize ? true : member.isPrivate,
          };
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
            (m) => {
              const rowMemberId = getTeamMemberId(m);
              return rowMemberId != null && String(rowMemberId) === String(user?.id);
            },
          );
          const isAdmin = currentUserMember?.role === "admin";

          const canManageThisMember =
            (isOwner || isAdmin) && member.role !== "owner" && !isCurrentUser;

          return (
            <div
              key={memberId}
              className="flex items-start bg-green-50 rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-green-100 hover:shadow-md"
            >
              <UserAvatar
                user={displayMember}
                sizeClass="w-14 h-14"
                privateProfile={anonymize}
                showDemoOverlay={showDemoAvatarOverlay}
                demoOverlayTextClassName="text-[8px]"
                fallbackText={anonymize ? "PP" : undefined}
                initialsClassName="text-xl"
              />

              <div className="flex-1 min-w-0 pt-[1px]">
                <div className="flex flex-col">
                  <div className="flex min-w-0 items-center gap-1">
                    <Tooltip
                      wrapperClassName="block min-w-0 flex-1"
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
                        onClick={() =>
                          !anonymize &&
                          onMemberClick(memberId, {
                            member,
                            teamId: team?.id ?? team?.teamId ?? team?.team_id,
                          })
                        }
                      >
                        <h3 className="font-medium text-base truncate leading-[120%]">
                          {anonymize
                            ? "Private Profile"
                            : formatDisplayName(member)}
                        </h3>
                      </div>
                    </Tooltip>

                    {/* Role Badge with Dropdown */}
                    <div className="shrink-0 ml-1">
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
                            message: `${formatDisplayName(member)} has been ${
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
                        onRemoveMember={async (resolvedMemberId = memberId) => {
                        let demotedForRemoval = false;

                        try {
                          if (resolvedMemberId == null) {
                            throw new Error("Could not determine member ID");
                          }

                          if (member.role === "admin" && isAdmin && !isOwner) {
                            await teamService.updateMemberRole(
                              team.id,
                              resolvedMemberId,
                              "member",
                            );
                            demotedForRemoval = true;
                          }

                          const result = await teamService.removeTeamMember(
                            team.id,
                            resolvedMemberId,
                          );
                          const reopenedRoles = Array.isArray(
                            result?.data?.reopenedRoles,
                          )
                            ? result.data.reopenedRoles
                            : [];

                          setNotification({
                            type: "success",
                            message:
                              reopenedRoles.length > 0
                                ? `${formatDisplayName(member)} has been removed from the team. ${reopenedRoles.length} filled ${reopenedRoles.length === 1 ? "role was" : "roles were"} reopened.`
                                : `${formatDisplayName(member)} has been removed from the team.`,
                          });
                          if (onMemberRemoved) {
                            await onMemberRemoved();
                          }
                        } catch (error) {
                          if (demotedForRemoval) {
                            try {
                              await teamService.updateMemberRole(
                                team.id,
                                resolvedMemberId,
                                "admin",
                              );
                            } catch (restoreError) {
                              console.error(
                                "Failed to restore admin role after removal failed:",
                                restoreError,
                              );
                            }
                          }

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
                  </div>

                  {shouldShowMemberMetaRow && (
                    <CardMetaRow>
                      {!anonymize && (() => {
                        const memberLocationText = formatListLocation(member, {
                          isRemote: member.is_remote || member.isRemote,
                        }).short;

                        return memberLocationText ? (
                          <CardMetaItem icon={MapPin}>{memberLocationText}</CardMetaItem>
                        ) : null;
                      })()}

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

                      {showDemoAvatarOverlay && (
                        <Tooltip
                          content={DEMO_PROFILE_TOOLTIP}
                          wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                        >
                          <FlaskConical size={10} className="shrink-0" />
                        </Tooltip>
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
