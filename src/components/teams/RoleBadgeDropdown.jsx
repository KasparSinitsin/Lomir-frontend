import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("teams");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Get role display information
  const getRoleInfo = (role) => {
    switch (role) {
      case "owner":
        return {
          label: t("common:roles.owner"),
          icon: Crown,
          badgeColor: "badge-role-owner",
        };
      case "admin":
        return {
          label: t("common:roles.admin"),
          icon: Shield,
          badgeColor: "badge-role-admin",
        };
      case "member":
        return {
          label: t("common:roles.member"),
          icon: User,
          badgeColor: "badge-role-member",
        };
      default:
        return {
          label: t("common:roles.unknown"),
          icon: User,
          badgeColor: "badge-neutral",
        };
    }
  };

  const roleInfo = getRoleInfo(member.role);
  const RoleIcon = roleInfo.icon;
  const memberId =
    member.user_id ??
    member.userId ??
    member.member_id ??
    member.memberId ??
    member.user?.id ??
    member.id;

  const getMemberName = () => {
    const first = member.first_name || member.firstName;
    const last = member.last_name || member.lastName;
    if (first && last) return `${first} ${last}`;
    return first || member.username || t("roleManagement.thisMember");
  };

  const handleRoleChange = (newRole) => {
    const memberName = getMemberName();

    let message;
    let title;
    let confirmLabel;
    let variant = "primary";
    let icon = null;

    if (newRole === "owner") {
      title = t("roleManagement.transferTitle");
      message = t("roleManagement.transferBody", { name: memberName });
      confirmLabel = t("roleManagement.transferConfirm");
      variant = "warning";
      icon = <Crown size={16} />;
    } else if (newRole === "admin") {
      title = t("roleManagement.promoteTitle");
      message = t("roleManagement.promoteBody", { name: memberName });
      confirmLabel = t("roleManagement.promoteConfirm");
      icon = <Shield size={16} />;
    } else {
      title = t("roleManagement.demoteTitle");
      message = t("roleManagement.demoteBody", { name: memberName });
      confirmLabel = t("roleManagement.demoteConfirm");
      icon = <User size={16} />;
    }

    setPendingAction({
      type: "role",
      newRole,
      title,
      message,
      confirmLabel,
      loadingLabel: t("roleManagement.updatingLabel"),
      variant,
      icon,
    });
  };

  // Handle member removal
  const handleRemoveMember = () => {
    const memberName = getMemberName();

    setPendingAction({
      type: "remove",
      title: t("roleManagement.removeTitle"),
      message: t("roleManagement.removeBody", { name: memberName }),
      confirmLabel: t("roleManagement.removeConfirm"),
      loadingLabel: t("roleManagement.removingLabel"),
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
        await onRemoveMember(memberId);
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
        dropdownClassName="min-w-48"
      >
        {/* Promote to Admin - shown for members (NOT for archived teams) */}
        {member.role === "member" && !isTeamArchived && (
          <DropdownItem
            icon={<Shield className="w-4 h-4" />}
            onClick={() => handleRoleChange("admin")}
            variant="default"
          >
            {t("roleManagement.promoteToAdmin")}
          </DropdownItem>
        )}

        {/* Demote to Member - shown for admins (NOT for archived teams) */}
        {member.role === "admin" && !isTeamArchived && (
          <DropdownItem
            icon={<User className="w-4 h-4" />}
            onClick={() => handleRoleChange("member")}
            variant="default"
          >
            {t("roleManagement.demoteToMember")}
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
              {t("roleManagement.transferOwnership")}
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
              {t("roleManagement.removeFromTeam")}
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
