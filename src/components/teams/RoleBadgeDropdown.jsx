import React, { useState } from "react";
import { Crown, Shield, User, UserX } from "lucide-react";
import Dropdown, { DropdownItem } from "../common/Dropdown";

const RoleBadgeDropdown = ({ 
  member, 
  canManage, 
  onRoleChange, 
  onRemoveMember,  // Callback for removing member
  isOwner = false,           
}) => {
  const [isLoading, setIsLoading] = useState(false);

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

  const handleRoleChange = async (newRole) => {
    const memberName = member.username || member.first_name || "this member";
    
    let confirmMessage;
    if (newRole === "owner") {
      confirmMessage = `Are you sure you want to transfer ownership to ${memberName}? You will become an Admin.`;
    } else if (newRole === "admin") {
      confirmMessage = `Are you sure you want to promote ${memberName} to Admin?`;
    } else {
      confirmMessage = `Are you sure you want to demote ${memberName} to Member?`;
    }

    if (window.confirm(confirmMessage)) {
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

  // Handle member removal
  const handleRemoveMember = async () => {
    const memberName = member.username || member.first_name || "this member";
    
    if (window.confirm(`Are you sure you want to remove ${memberName} from the team? This action cannot be undone.`)) {
      setIsLoading(true);
      try {
        await onRemoveMember(member.user_id || member.userId);
      } catch (error) {
        console.error("Remove member error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Create the trigger badge
  const triggerBadge = (
    <span
      className={`badge ${roleInfo.badgeColor} badge-sm gap-1 ${
        canManage ? "hover:shadow-md transition-all duration-200 cursor-pointer" : ""
      }`}
    >
      <RoleIcon className="w-3 h-3" />
      {roleInfo.label}
      {isLoading && <span className="loading loading-spinner loading-xs" />}
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
      dropdownClassName="min-w-48"
    >
      {/* Promote to Admin - shown for members */}
      {member.role === "member" && (
        <DropdownItem
          icon={<Shield className="w-4 h-4" />}
          onClick={() => handleRoleChange("admin")}
          variant="default"
        >
          Promote to Admin
        </DropdownItem>
      )}

      {/* Demote to Member - shown for admins */}
      {member.role === "admin" && (
        <DropdownItem
          icon={<User className="w-4 h-4" />}
          onClick={() => handleRoleChange("member")}
          variant="default"
        >
          Demote to Member
        </DropdownItem>
      )}

      {/* Transfer Ownership - only shown to current owner */}
      {isOwner && member.role !== "owner" && (
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

      {/* Remove from Team - shown for non-owners */}
      {member.role !== "owner" && onRemoveMember && (
        <>
          <div className="border-t border-base-300 my-1" />
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
  );
};

export default RoleBadgeDropdown;
