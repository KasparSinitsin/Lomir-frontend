import React, { useState } from "react";
import { Crown, Shield, User, UserX } from "lucide-react";
import Dropdown, { DropdownItem } from "../common/Dropdown";
import RoleBadgePill from "../common/RoleBadgePill";
import ConfirmModal from "../common/ConfirmModal";

const RoleBadgeDropdown = ({
  member,
  canManage,
  onRoleChange,
  onRemoveMember,
  isOwner = false,
  isTeamArchived = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Get role display information
  const getRoleInfo = (role) => {
    switch (role) {
      case "owner":
        return {
          label: "Owner",
          icon: Crown,
          badgeColor: "badge-role-owner",
        };
      case "admin":
        return {
          label: "Admin",
          icon: Shield,
          badgeColor: "badge-role-admin",
        };
      case "member":
        return {
          label: "Member",
          icon: User,
          badgeColor: "badge-role-member",
        };
      default:
        return {
          label: "Unknown",
          icon: User,
          badgeColor: "badge-neutral",
        };
    }
  };

  const roleInfo = getRoleInfo(member.role);
  const RoleIcon = roleInfo.icon;

  const getMemberName = () => {
    const first = member.first_name || member.firstName;
    const last = member.last_name || member.lastName;
    if (first && last) return `${first} ${last}`;
    return first || member.username || "this member";
  };

  const handleRoleChange = (newRole) => {
    const memberName = getMemberName();

    let message;
    let title;
    let confirmLabel;
    let variant = "primary";
    let icon = null;

    if (newRole === "owner") {
      title = "Transfer Ownership";
      message = `Transfer ownership to ${memberName}? You will become an Admin.`;
      confirmLabel = "Transfer";
      variant = "warning";
      icon = <Crown size={16} />;
    } else if (newRole === "admin") {
      title = "Promote Member";
      message = `Promote ${memberName} to Admin?`;
      confirmLabel = "Promote";
      icon = <Shield size={16} />;
    } else {
      title = "Demote Admin";
      message = `Demote ${memberName} to Member?`;
      confirmLabel = "Demote";
      icon = <User size={16} />;
    }

    setPendingAction({
      type: "role",
      newRole,
      title,
      message,
      confirmLabel,
      loadingLabel: "Updating...",
      variant,
      icon,
    });
  };

  // Handle member removal
  const handleRemoveMember = () => {
    const memberName = getMemberName();

    setPendingAction({
      type: "remove",
      title: "Remove Team Member",
      message: `Remove ${memberName} from the team? This action cannot be undone.`,
      confirmLabel: "Remove",
      loadingLabel: "Removing...",
      variant: "error",
      icon: <UserX size={16} />,
    });
  };

  const closePendingAction = () => {
    if (isLoading) return;
    setPendingAction(null);
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    setIsLoading(true);
    try {
      if (pendingAction.type === "role") {
        await onRoleChange(pendingAction.newRole);
      } else if (pendingAction.type === "remove") {
        await onRemoveMember(member.user_id || member.userId);
      }

      setPendingAction(null);
    } catch (error) {
      console.error(
        pendingAction.type === "remove"
          ? "Remove member error:"
          : "Role change error:",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Create the trigger badge
  const triggerBadge = (
    <RoleBadgePill
      icon={RoleIcon}
      label={roleInfo.label}
      badgeColorClass={roleInfo.badgeColor}
      interactive={canManage}
      loading={isLoading}
    />
  );

  // If user can't manage this member, show static badge
  if (!canManage || (isLoading && !pendingAction)) {
    return triggerBadge;
  }

  // For archived teams, check if there are any available actions
  // (only "Remove from Team" is allowed for archived teams)
  const hasAvailableActions = isTeamArchived
    ? member.role !== "owner" && onRemoveMember // Only remove option for archived
    : true; // All options for active teams

  // If no actions available, show static badge
  if (!hasAvailableActions) {
    return triggerBadge;
  }

  return (
    <>
      <Dropdown
        trigger={triggerBadge}
        position="bottom-right"
        openOnHover={true}
        hoverDelay={150}
        dropdownClassName="min-w-48"
      >
        {/* Promote to Admin - shown for members (NOT for archived teams) */}
        {member.role === "member" && !isTeamArchived && (
          <DropdownItem
            icon={<Shield className="w-4 h-4" />}
            onClick={() => handleRoleChange("admin")}
            variant="default"
          >
            Promote to Admin
          </DropdownItem>
        )}

        {/* Demote to Member - shown for admins (NOT for archived teams) */}
        {member.role === "admin" && !isTeamArchived && (
          <DropdownItem
            icon={<User className="w-4 h-4" />}
            onClick={() => handleRoleChange("member")}
            variant="default"
          >
            Demote to Member
          </DropdownItem>
        )}

        {/* Transfer Ownership - only shown to current owner (NOT for archived teams) */}
        {isOwner && member.role !== "owner" && !isTeamArchived && (
          <>
            <div className="border-t border-base-300 my-1" />
            <DropdownItem
              icon={<Crown className="w-4 h-4 text-warning" />}
              onClick={() => handleRoleChange("owner")}
              variant="warning"
            >
              Transfer Ownership
            </DropdownItem>
          </>
        )}

        {/* Remove from Team - shown for non-owners (KEEP for archived teams) */}
        {member.role !== "owner" && onRemoveMember && (
          <>
            {/* Only show divider if there were items above */}
            {!isTeamArchived && <div className="border-t border-base-300 my-1" />}
            <DropdownItem
              icon={<UserX className="w-4 h-4 text-error" />}
              onClick={handleRemoveMember}
              variant="error"
            >
              Remove from Team
            </DropdownItem>
          </>
        )}
      </Dropdown>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={closePendingAction}
        onConfirm={confirmPendingAction}
        title={pendingAction?.title}
        loading={isLoading}
        confirmLabel={pendingAction?.confirmLabel}
        loadingLabel={pendingAction?.loadingLabel}
        confirmVariant={pendingAction?.variant || "primary"}
        confirmIcon={pendingAction?.icon}
      >
        <p className="text-sm text-base-content/80">
          {pendingAction?.message}
        </p>
      </ConfirmModal>
    </>
  );
};

export default RoleBadgeDropdown;
