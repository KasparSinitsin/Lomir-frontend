import React, { useState, useEffect, useCallback } from "react";
import { UserSearch, Plus, AlertCircle } from "lucide-react";
import VacantRoleCard from "./VacantRoleCard";
import CreateVacantRoleModal from "./CreateVacantRoleModal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import { vacantRoleService } from "../../services/vacantRoleService";
import { matchingService } from "../../services/matchingService";
import { useAuth } from "../../contexts/AuthContext";

/**
 * VacantRolesSection Component
 *
 * Displays vacant team roles inside TeamDetailsModal.
 * Follows the same section pattern as TeamMembersSection:
 * - Icon + title header
 * - List of cards
 * - Action button for owners/admins
 *
 * When an authenticated user views roles they don't manage, matching
 * scores are fetched and displayed on each VacantRoleCard.
 *
 * @param {number} teamId - The team ID to fetch roles for
 * @param {boolean} canManage - Whether the current user is owner/admin
 * @param {boolean} isEditing - Whether the team is in edit mode (hide section)
 * @param {string} className - Additional CSS classes
 */
const VacantRolesSection = ({
  teamId,
  canManage = false,
  isEditing = false,
  className = "",
}) => {
  const { isAuthenticated } = useAuth();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    type: null,
    message: null,
  });

  // Matching scores: { [roleId]: { matchScore, matchDetails } }
  const [matchScores, setMatchScores] = useState({});

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Fetch vacant roles
  const fetchRoles = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);
      // Admins/owners see all statuses; others see only open
      const statusFilter = canManage ? "all" : "open";
      const response = await vacantRoleService.getVacantRoles(
        teamId,
        statusFilter,
      );
      setRoles(response.data || []);
    } catch (err) {
      console.error("Error fetching vacant roles:", err);
      setError("Failed to load vacant roles");
    } finally {
      setLoading(false);
    }
  }, [teamId, canManage]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Fetch matching scores for authenticated users
  // Runs after roles are loaded, only for non-managers (non-managers are the
  // users who'd want to know "how well do I match this role?")
  useEffect(() => {
    const fetchMatchScores = async () => {
      if (!isAuthenticated || !teamId || roles.length === 0) {
        setMatchScores({});
        return;
      }

      try {
        const response = await matchingService.getMatchingRolesForTeam(teamId);
        const scoreMap = {};
        (response.data || []).forEach((scored) => {
          scoreMap[scored.id] = {
            matchScore: scored.matchScore ?? scored.match_score,
            matchDetails: scored.matchDetails ?? scored.match_details,
          };
        });
        setMatchScores(scoreMap);
      } catch (err) {
        // Matching scores are supplementary — don't block the UI
        console.warn("Could not fetch matching scores:", err);
        setMatchScores({});
      }
    };

    fetchMatchScores();
  }, [isAuthenticated, teamId, roles]);

  // Handle status change
  const handleStatusChange = async (roleId, newStatus) => {
    try {
      await vacantRoleService.updateVacantRoleStatus(teamId, roleId, newStatus);
      setNotification({
        type: "success",
        message: `Role ${newStatus === "filled" ? "marked as filled" : newStatus === "closed" ? "closed" : "reopened"} successfully`,
      });
      // Refresh the list
      await fetchRoles();
    } catch (err) {
      console.error("Error updating role status:", err);
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Failed to update role status",
      });
    }
  };

  // Handle delete
  const handleDelete = async (roleId) => {
    if (!window.confirm("Are you sure you want to delete this vacant role?")) {
      return;
    }

    try {
      await vacantRoleService.deleteVacantRole(teamId, roleId);
      setNotification({
        type: "success",
        message: "Vacant role deleted successfully",
      });
      await fetchRoles();
    } catch (err) {
      console.error("Error deleting vacant role:", err);
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Failed to delete role",
      });
    }
  };

  // Handle edit — open modal in edit mode
  const handleEdit = (role) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  // Handle create — open modal in create mode
  const handleCreate = () => {
    setEditingRole(null);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  // Handle modal success — refresh roles list
  const handleModalSuccess = () => {
    fetchRoles();
  };

  // Don't render in edit mode
  if (isEditing) return null;

  // Don't render if loading still in progress
  if (loading) {
    return (
      <div className={`mt-6 mb-6 ${className}`}>
        <div className="flex items-center mb-4">
          <UserSearch size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">Vacant Roles</h3>
        </div>
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner loading-sm text-primary"></span>
        </div>
      </div>
    );
  }

  // Don't render the section at all if there are no roles and user can't manage
  if (roles.length === 0 && !canManage) return null;

  // Count open roles for the title
  const openCount = roles.filter((r) => r.status === "open").length;

  return (
    <div className={`mt-6 mb-6 ${className}`}>
      {/* Section Header — mirrors TeamMembersSection pattern */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <UserSearch size={18} className="mr-2 text-primary flex-shrink-0" />
          <h3 className="font-medium">
            Vacant Roles
            {openCount > 0 && (
              <span className="text-sm font-normal text-base-content/60 ml-1">
                ({openCount} open)
              </span>
            )}
          </h3>
        </div>

        {/* Add role button for owners/admins */}
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreate}
            className="gap-1"
          >
            <Plus size={16} />
            Add Role
          </Button>
        )}
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

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-error mb-4">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Roles list — sorted by match score (highest first) when available */}
      {roles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...roles]
            .sort((a, b) => {
              const scoreA = matchScores[a.id]?.matchScore ?? -1;
              const scoreB = matchScores[b.id]?.matchScore ?? -1;
              return scoreB - scoreA;
            })
            .map((role) => (
            <VacantRoleCard
              key={role.id}
              role={role}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              matchScore={matchScores[role.id]?.matchScore ?? null}
              matchDetails={matchScores[role.id]?.matchDetails ?? null}
            />
          ))}
        </div>
      ) : (
        canManage && (
          <div className="bg-base-200/20 rounded-lg p-4 text-center">
            <UserSearch
              size={24}
              className="mx-auto mb-2 text-base-content/40"
            />
            <p className="text-sm text-base-content/60">
              No vacant roles defined yet
            </p>
            <p className="text-xs text-base-content/40 mt-1">
              Add roles to describe what kind of members your team is looking
              for
            </p>
          </div>
        )
      )}

      {/* Create / Edit Modal */}
      <CreateVacantRoleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        teamId={teamId}
        existingRole={editingRole}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default VacantRolesSection;
