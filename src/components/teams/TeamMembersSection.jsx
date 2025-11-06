import React from "react";
import { Users } from "lucide-react";
import RoleBadgeDropdown from "./RoleBadgeDropdown";
import LocationDisplay from "../common/LocationDisplay";
import { teamService } from "../../services/teamService";

/**
 * TeamMembersSection Component
 * EXACT replica of original member rendering from TeamDetailsModal
 * Preserves all original styling, layout, and functionality
 */
const TeamMembersSection = ({
  team,
  isEditing = false,
  isAuthenticated = false,
  user = null,
  onMemberClick = () => {},
  shouldAnonymizeMember = () => false,
  isCreator = false,
  onRoleChange = null,
  className = "",
}) => {
  const [notification, setNotification] = React.useState({ type: null, message: null });

  // Early return if no members
  if (!team?.members || team.members.length === 0) {
    return null;
  }

  return (
    <div className={`mb-6 ${className}`}>
      {/* Section Header */}
      <h2 className="text-xl font-semibold mb-4">
        Team Members
      </h2>

      {/* Members Grid - EXACT original layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {team.members.map((member) => {
          console.log("Member data:", member); // Debug info

          // Check which property is available (userId or user_id)
          const memberId = member.userId || member.user_id;
          const isCurrentUser = memberId === user?.id;

          // Determine if this member should be anonymized
          const anonymize = shouldAnonymizeMember(member);

          // Role management logic
          const canManageThisMember =
            isCreator &&
            member.role !== "creator" &&
            !isCurrentUser;

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
                          : member.username || "Unknown"}
                      </h3>
                    </div>

                    {/* Role Badge with Dropdown */}
                    <RoleBadgeDropdown
                      member={member}
                      canManage={canManageThisMember}
                      onRoleChange={async (newRole) => {
                        if (onRoleChange) {
                          try {
                            await teamService.updateMemberRole(
                              team.id,
                              memberId,
                              newRole
                            );
                            setNotification({
                              type: "success",
                              message: `${member.username || "Member"} ${
                                newRole === "admin"
                                  ? "promoted to admin"
                                  : "demoted to member"
                              } successfully!`,
                            });
                            // Call parent callback to refresh
                            onRoleChange();
                          } catch (error) {
                            console.error("Error updating member role:", error);
                            setNotification({
                              type: "error",
                              message:
                                error.response?.data?.message ||
                                "Failed to update member role",
                            });
                          }
                        }
                      }}
                    />
                  </div>

                  {!anonymize && (
                    <>
                      {(member.firstName ||
                        member.first_name ||
                        member.lastName ||
                        member.last_name) && (
                        <p className="text-sm text-base-content/70 truncate">
                          {(member.firstName || member.first_name || "") +
                            " " +
                            (member.lastName || member.last_name || "")}
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