import React, { useState, useEffect } from "react";
import Card from "../common/Card";
import Button from "../common/Button";
import { Users, MapPin, Trash2, EyeClosed } from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";
import { EyeIcon } from "lucide-react";

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
  const isCreator = user && teamData.creator_id === user.id;

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
    console.log("=== END TEAMCARD DEBUG ===");
  }, [team, teamData]);

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

  // For debugging in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("TeamCard data:", teamData);
      console.log("isPublic value:", teamData.is_public);
      console.log("Computed isPublic:", isPublic);
      console.log("Team image:", getTeamImage());
    }
  }, [teamData, isPublic]);

  // Determine if the View Details button should be shown
  const showViewDetailsButton = isSearchResult
    ? isAuthenticated // On search page, show to all authenticated users
    : isCreator || userRole === "admin" || userRole === "member"; // On team pages, show to members

  return (
    <>
      <Card
        title={teamData.name}
        subtitle={`Members: ${teamData.current_members_count ?? 1} out of ${
          teamData.max_members ?? "∞"
        }`}
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
          <div className="flex items-center text-sm text-base-content/70">
            {team.isPublic === true || team.is_public === true ? (
              <>
                <EyeIcon size={16} className="mr-1" />
                <span>Public</span>
              </>
            ) : (
              <>
                <EyeClosed size={16} className="mr-1" />
                <span>Private</span>
              </>
            )}
          </div>

          {userRole && !isSearchResult && (
            <span className="badge badge-primary badge-outline">
              {userRole}
            </span>
          )}
        </div>

        <div className="mt-auto flex justify-between items-center">
          {/* Show View Details button based on our condition */}
          {showViewDetailsButton && (
            <Button
              variant="primary"
              size="sm"
              onClick={openTeamDetails}
              className="flex-grow"
            >
              View Details
            </Button>
          )}

          {isCreator && !isSearchResult && (
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
