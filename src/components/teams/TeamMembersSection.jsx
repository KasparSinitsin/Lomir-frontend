import React from "react";
import { Users } from "lucide-react";
import RoleBadgeDropdown from "./RoleBadgeDropdown";
import LocationDisplay from "../common/LocationDisplay";
import Alert from "../common/Alert";
import { teamService } from "../../services/teamService";

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
}) => {
  const [notification, setNotification] = React.useState({
    type: null,
    message: null,
  });

  // Early return if no members
  if (!team?.members || team.members.length === 0) {
    return null;
  }

  return (
    <div className={`mt-6 mb-6 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center mb-4">
        <Users size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="font-medium">Team Members</h3>
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
        {team.members.map((member) => {
          console.log("Member data:", member); // Debug info

          // Check which property is available (userId or user_id)
          const memberId = member.userId || member.user_id;
          const isCurrentUser = memberId === user?.id;

          // Determine if this member should be anonymized
          const anonymize = shouldAnonymizeMember(member);

          // Role management logic - Owners and admins can manage roles
          const currentUserMember = team.members?.find(
            (m) => m.user_id === user?.id || m.userId === user?.id
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
                {!anonymize && (member.avatarUrl || member.avatar_url) ? (
                  <div className="rounded-full w-12 h-12">
                    <img
                      src={member.avatarUrl || member.avatar_url}
                      alt={member.username}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.target.onerror = null;
                        // Fall back to placeholder on error
                        e.target.style.display = "none";
                        const parentDiv = e.target.parentNode;
                        parentDiv.classList.add(
                          "placeholder",
                          "bg-primary",
                          "text-primary-content"
                        );
                        const span = document.createElement("span");
                        span.className = "text-lg";
                        span.textContent = anonymize
                          ? "PP"
                          : (member.username || "").charAt(0) || "?";
                        parentDiv.appendChild(span);
                      }}
                    />
                  </div>
                ) : (
                  <div className="placeholder bg-primary text-primary-content rounded-full w-12 h-12">
                    <span className="text-lg">
                      {anonymize
                        ? "PP"
                        : (member.username || "").charAt(0) || "?"}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <div
                      className={`${!anonymize ? "cursor-pointer" : ""}`}
                      onClick={() => !anonymize && onMemberClick(memberId)}
                    >
                      <h3 className="font-medium text-base truncate">
                        {anonymize
                          ? "Private Profile"
                          : (() => {
                              const firstName =
                                member.firstName || member.first_name || "";
                              const lastName =
                                member.lastName || member.last_name || "";
                              const fullName =
                                `${firstName} ${lastName}`.trim();
                              return fullName || member.username || "Unknown";
                            })()}
                      </h3>
                    </div>

                    {/* Role Badge with Dropdown */}
                    <RoleBadgeDropdown
                      member={member}
                      canManage={canManageThisMember}
                      isOwner={isOwner}
                      onRoleChange={async (newRole) => {
                        try {
                          await teamService.updateMemberRole(
                            team.id,
                            memberId,
                            newRole
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

                  {!anonymize && (
                    <>
                      {/* Username - now shown as subtitle */}
                      {member.username && (
                        <p className="text-sm text-base-content/70 truncate">
                          @{member.username}
                        </p>
                      )}

                      {(member.postal_code || member.postalCode) && (
                        <LocationDisplay
                          postalCode={member.postal_code || member.postalCode}
                          showIcon={false}
                          displayType="short"
                          className="text-xs text-base-content/70"
                        />
                      )}
                    </>
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
    </div>
  );
};

export default TeamMembersSection;
