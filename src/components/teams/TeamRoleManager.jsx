import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { teamService } from "../../services/teamService";
import Button from "../common/Button";
import Alert from "../common/Alert";
import {
  Crown,
  Shield,
  User,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const TeamRoleManager = ({ team, onRoleUpdate, className = "" }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    type: null,
    message: null,
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    member: null,
    action: null,
    newRole: null,
  });

  // Get current user's role
  const getCurrentUserRole = () => {
    if (!team?.members || !user) return null;

    const currentUserMember = team.members.find(
      (member) => member.user_id === user.id || member.userId === user.id
    );

    return currentUserMember?.role || null;
  };

  const currentUserRole = getCurrentUserRole();

  // Check if current user can manage roles
  const canManageRoles = currentUserRole === "creator";

  // Get role display information
  const getRoleInfo = (role) => {
    switch (role) {
      case "creator":
        return {
          label: "Team Creator",
          icon: Crown,
          color: "text-warning",
          bgColor: "bg-warning/10",
          description: "Full control over team",
        };
      case "admin":
        return {
          label: "Admin",
          icon: Shield,
          color: "text-info",
          bgColor: "bg-info/10",
          description: "Can manage team and members",
        };
      case "member":
        return {
          label: "Member",
          icon: User,
          color: "text-base-content",
          bgColor: "bg-base-200",
          description: "Regular team participant",
        };
      default:
        return {
          label: "Unknown",
          icon: User,
          color: "text-base-content",
          bgColor: "bg-base-200",
          description: "",
        };
    }
  };

  // Handle role change confirmation
  const handleRoleChange = async (member, newRole) => {
    setConfirmDialog({
      isOpen: true,
      member,
      action: newRole === "admin" ? "promote" : "demote",
      newRole,
    });
  };

  // Execute role change
  const executeRoleChange = async () => {
    const { member, newRole } = confirmDialog;

    if (!member || !newRole) return;

    setLoading(true);
    try {
      await teamService.updateMemberRole(team.id, member.user_id, newRole);

      setNotification({
        type: "success",
        message: `${member.first_name || member.username} has been ${
          newRole === "admin" ? "promoted to admin" : "demoted to member"
        } successfully!`,
      });

      // Call parent callback to refresh team data
      if (onRoleUpdate) {
        onRoleUpdate();
      }
    } catch (error) {
      console.error("Error updating member role:", error);
      setNotification({
        type: "error",
        message:
          error.response?.data?.message || "Failed to update member role",
      });
    } finally {
      setLoading(false);
      setConfirmDialog({
        isOpen: false,
        member: null,
        action: null,
        newRole: null,
      });
    }
  };

  // Close confirmation dialog
  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      member: null,
      action: null,
      newRole: null,
    });
  };

  // Sort members by role priority
  const sortedMembers =
    team?.members?.sort((a, b) => {
      const roleOrder = { creator: 1, admin: 2, member: 3 };
      return roleOrder[a.role] - roleOrder[b.role];
    }) || [];

  // Don't render if user can't manage roles
  if (!canManageRoles) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-base-content">
          Role Management
        </h3>
        <div className="text-sm text-base-content/70">
          {sortedMembers.length} members
        </div>
      </div>

      {/* Notification */}
      {notification.type && (
        <Alert
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification({ type: null, message: null })}
          className="mb-4"
        />
      )}

      {/* Members List */}
      <div className="space-y-3">
        {sortedMembers.map((member) => {
          const roleInfo = getRoleInfo(member.role);
          const RoleIcon = roleInfo.icon;
          const isCurrentUser =
            member.user_id === user?.id || member.userId === user?.id;
          const canChangeRole = member.role !== "creator" && !isCurrentUser;

          return (
            <div
              key={member.user_id || member.userId}
              className="flex items-center justify-between p-4 bg-base-100 rounded-lg border border-base-300"
            >
              {/* Member Info */}
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10 h-10">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.username}
                        className="rounded-full object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-sm">
                        {(member.first_name || member.username)?.charAt(0) ||
                          "?"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Name and Role */}
                <div>
                  <div className="font-medium text-base-content">
                    {member.first_name && member.last_name
                      ? `${member.first_name} ${member.last_name}`
                      : member.username}
                    {isCurrentUser && (
                      <span className="text-xs text-base-content/70 ml-2">
                        (You)
                      </span>
                    )}
                  </div>

                  {/* Role Badge */}
                  <div
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${roleInfo.bgColor} ${roleInfo.color}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    <span>{roleInfo.label}</span>
                  </div>
                </div>
              </div>

              {/* Role Management Buttons */}
              {canChangeRole && (
                <div className="flex space-x-2">
                  {member.role === "member" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRoleChange(member, "admin")}
                      disabled={loading}
                      icon={<ChevronUp className="w-4 h-4" />}
                    >
                      Promote to Admin
                    </Button>
                  )}

                  {member.role === "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRoleChange(member, "member")}
                      disabled={loading}
                      icon={<ChevronDown className="w-4 h-4" />}
                    >
                      Demote to Member
                    </Button>
                  )}
                </div>
              )}

              {/* Loading indicator for current action */}
              {loading && confirmDialog.member?.user_id === member.user_id && (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
            </div>
          );
        })}
      </div>

      {/* Role Information Guide */}
      <div className="bg-base-200 rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-base-content">Role Permissions</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <Crown className="w-4 h-4 text-warning" />
            <span>
              <strong>Creator:</strong> Full control, can delete team, manage
              all roles
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-info" />
            <span>
              <strong>Admin:</strong> Can edit team, manage members, handle
              applications
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-base-content" />
            <span>
              <strong>Member:</strong> Can participate in team activities
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeConfirmDialog}
          />

          {/* Dialog */}
          <div className="relative bg-base-100 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <h3 className="text-lg font-semibold">Confirm Role Change</h3>
            </div>

            <p className="text-base-content/80 mb-6">
              Are you sure you want to {confirmDialog.action}{" "}
              <strong>
                {confirmDialog.member?.first_name ||
                  confirmDialog.member?.username}
              </strong>{" "}
              to {confirmDialog.newRole}?
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="ghost"
                onClick={closeConfirmDialog}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={executeRoleChange}
                disabled={loading}
                icon={
                  loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null
                }
              >
                {loading ? "Updating..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamRoleManager;
