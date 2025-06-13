import React, { useState } from "react";
import { Crown, Shield, User } from "lucide-react";
import Dropdown, { DropdownItem } from "../common/Dropdown";

const RoleBadgeDropdown = ({ member, canManage, onRoleChange }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Get role display information
  const getRoleInfo = (role) => {
    switch (role) {
      case "creator":
        return {
          label: "Creator",
          icon: Crown,
          badgeColor: "badge-warning",
        };
      case "admin":
        return {
          label: "Admin",
          icon: Shield,
          badgeColor: "badge-info",
        };
      case "member":
        return {
          label: "Member",
          icon: User,
          badgeColor: "badge-success",
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

  const handleRoleChange = async (newRole) => {
    const actionText = newRole === "admin" ? "promote" : "demote";
    const memberName = member.username || member.first_name || "this member";

    if (
      window.confirm(`Are you sure you want to ${actionText} ${memberName}?`)
    ) {
      setIsLoading(true);
      try {
        await onRoleChange(newRole);
      } catch (error) {
        console.error("Role change error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Create the trigger badge
  const triggerBadge = (
    <span
      className={`badge ${roleInfo.badgeColor} badge-sm gap-1 ${
        canManage ? "hover:shadow-md transition-all duration-200" : ""
      }`}
    >
      <RoleIcon className="w-3 h-3" />
      {roleInfo.label}
      {isLoading && <div className="loading loading-spinner loading-xs" />}
    </span>
  );

  // If user can't manage this member, show static badge
  if (!canManage || isLoading) {
    return triggerBadge;
  }

  return (
    <Dropdown
      trigger={triggerBadge}
      position="bottom-right"
      openOnHover={true}
      hoverDelay={150}
      dropdownClassName="min-w-40"
    >
      {member.role === "member" && (
        <DropdownItem
          icon={<Shield className="w-4 h-4" />}
          onClick={() => handleRoleChange("admin")}
          variant="default"
        >
          Promote to Admin
        </DropdownItem>
      )}

      {member.role === "admin" && (
        <DropdownItem
          icon={<User className="w-4 h-4" />}
          onClick={() => handleRoleChange("member")}
          variant="default"
        >
          Demote to Member
        </DropdownItem>
      )}
    </Dropdown>
  );
};

export default RoleBadgeDropdown;
