import React, { useState, useEffect } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import { Users, MapPin, Trash2, EyeClosed, EyeIcon } from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";

const TeamCard = ({ team, onUpdate, onDelete, isSearchResult = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teamData, setTeamData] = useState(team); // Store team data locally
  const { user, isAuthenticated } = useAuth();

  // Get the team image or initial for the avatar
  const getTeamImage = () => {
    // First check for teamavatar_url (snake_case from API)
    if (teamData.teamavatar_url) {
      console.log("Found teamavatar_url:", teamData.teamavatar_url);
      return teamData.teamavatar_url;
    }

    // Then check for teamavatarUrl (camelCase from frontend)
    if (teamData.teamavatarUrl) {
      console.log("Found teamavatarUrl:", teamData.teamavatarUrl);
      return teamData.teamavatarUrl;
    }

    // If no image is found, return the first letter of the team name as fallback
    return teamData.name?.charAt(0) || "?";
  };

  // Check if current user is the creator of the team
  const isCreator =
    user && (teamData.creator_id === user.id || teamData.creatorId === user.id);

  // Update local team data when the prop changes
  useEffect(() => {
    setTeamData(team);
  }, [team]);

  // Fetch the user's role in this team on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && teamData.id && !isSearchResult) {
        try {
          const response = await teamService.getUserRoleInTeam(
            teamData.id,
            user.id
          );
          setUserRole(response.data.role);
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      }
    };

    fetchUserRole();
  }, [user, teamData.id, isSearchResult]);

  // Debugging useEffect to log team data:
  useEffect(() => {
    console.log("=== TEAMCARD DEBUG ===");
    console.log("Team name:", team.name);
    console.log("Original team prop:", team);
    console.log("team.is_public:", team.is_public);
    console.log("typeof team.is_public:", typeof team.is_public);
    console.log("teamData.is_public:", teamData.is_public);
    console.log("typeof teamData.is_public:", typeof teamData.is_public);
    console.log("teamData.creator_id:", teamData.creator_id);
    console.log("user.id:", user?.id);
    console.log("isCreator:", isCreator);
    console.log("=== END TEAMCARD DEBUG ===");
  }, [team, teamData, isCreator, user]);

  const openTeamDetails = () => {
    setIsModalOpen(true);
  };

  const closeTeamDetails = () => {
    setIsModalOpen(false);
  };

  const handleTeamUpdate = (updatedTeam) => {
    // Update the local state first
    setTeamData(updatedTeam);

    // Then call the parent's callback if provided
    if (onUpdate) {
      onUpdate(updatedTeam);
    }
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation(); // Prevent opening the details modal

    if (
      window.confirm(
        "Are you sure you want to delete this team? This action cannot be undone."
      )
    ) {
      try {
        setIsDeleting(true);
        await teamService.deleteTeam(teamData.id);

        if (onDelete) {
          onDelete(teamData.id);
        }
      } catch (err) {
        console.error("Error deleting team:", err);
        setError("Failed to delete team. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Force local refresh of team data when modal closes
  const handleModalClose = async () => {
    try {
      // Fetch fresh team data directly
      const response = await teamService.getTeamById(teamData.id);
      if (response && response.data) {
        const freshTeamData = response.data;
        setTeamData(freshTeamData);

        // Call parent update handler
        if (onUpdate) {
          onUpdate(freshTeamData);
        }
      }
    } catch (error) {
      console.error("Error refreshing team data:", error);
    }

    closeTeamDetails();
  };

  // Ensure is_public is a proper boolean
  const isPublic = teamData.is_public === true;

  // Enhanced helper function to determine if visibility icon should be shown
  const shouldShowVisibilityIcon = () => {
    // Only show visibility icons for authenticated users
    if (!isAuthenticated || !user) {
      console.log("❌ No visibility icon - not authenticated");
      return false;
    }

    // Show for creators (using creator_id from search results)
    if (isCreator) {
      console.log("✅ Show visibility icon - user is creator");
      return true;
    }

    // Additional check: if creator_id matches user id (handles different property names)
    if (teamData.creator_id === user.id || teamData.creatorId === user.id) {
      console.log(
        "✅ Show visibility icon - user is creator (direct property check)"
      );
      return true;
    }

    // Show for team members (check if user is in the team via members array)
    if (teamData.members && Array.isArray(teamData.members)) {
      const foundInMembers = teamData.members.some(
        (member) => member.user_id === user.id || member.userId === user.id
      );
      if (foundInMembers) {
        console.log("✅ Show visibility icon - user found in members array");
        return true;
      }
    }

    // Show if user has a role in the team
    if (userRole && userRole !== null) {
      console.log("✅ Show visibility icon - user has role:", userRole);
      return true;
    }

    console.log("❌ No visibility icon - user not associated with team", {
      userId: user.id,
      creatorId: teamData.creator_id,
      teamName: teamData.name,
      isCreator: isCreator,
    });
    return false;
  };

  // For debugging in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("TeamCard visibility check:", {
        teamName: teamData.name,
        isPublic: teamData.is_public,
        shouldShow: shouldShowVisibilityIcon(),
        userId: user?.id,
        creatorId: teamData.creator_id,
        isCreator: isCreator,
      });
    }
  }, [teamData, isPublic, user, isCreator]);

  return (
    <>
      <Card
        title={teamData.name}
        subtitle={
          <div className="flex items-center space-x-1 text-sm">
            <Users size={16} className="text-primary" />
            <span>
              {teamData.current_members_count ?? 1} /{" "}
              {teamData.max_members ?? "∞"} Members
            </span>
          </div>
        }
        hoverable
        image={getTeamImage()}
        imageAlt={`${teamData.name} team`}
        imageSize="medium"
        imageShape="circle"
      >
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        <p className="text-base-content/80 mb-4 -mt-4">
          {teamData.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {shouldShowVisibilityIcon() && (
            <div className="flex items-center text-sm text-base-content/70 bg-base-200/50 py-1 rounded-full">
              {team.isPublic === true || team.is_public === true ? (
                <>
                  <EyeIcon size={16} className="mr-1 text-green-600" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <EyeClosed size={16} className="mr-1 text-grey-600" />
                  <span>Private</span>
                </>
              )}
            </div>
          )}

          {userRole && !isSearchResult && (
            <span className="badge badge-primary badge-outline">
              {userRole}
            </span>
          )}

          {/* Debug info in development */}
          {import.meta.env.DEV && (
            <div className="text-xs bg-yellow-100 px-2 py-1 rounded text-black">
              Debug: Creator={isCreator ? "✓" : "✗"} | Show=
              {shouldShowVisibilityIcon() ? "✓" : "✗"} | UserID={user?.id} |
              CreatorID={teamData.creator_id}
            </div>
          )}
        </div>

        <div className="mt-auto flex justify-between items-center">
          {/* Show View Details button to ALL users */}
          <Button
            variant="primary"
            size="sm"
            onClick={openTeamDetails}
            className="flex-grow"
          >
            View Details
          </Button>

          {/* Edit/Delete buttons - only for authenticated creators on non-search pages */}
          {isAuthenticated && isCreator && !isSearchResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="ml-2 hover:bg-[#C7D2FE] hover:text-[#1E40AF]"
              icon={<Trash2 size={16} />}
              aria-label="Delete team"
            >
              {isDeleting ? "Deleting..." : ""}
            </Button>
          )}
        </div>
      </Card>

      <TeamDetailsModal
        isOpen={isModalOpen}
        teamId={teamData.id}
        onClose={handleModalClose}
        onUpdate={handleTeamUpdate}
        onDelete={onDelete}
        userRole={userRole}
        isFromSearch={isSearchResult}
      />
    </>
  );
};

export default TeamCard;
