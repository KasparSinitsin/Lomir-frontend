import React, { useState, useEffect, useCallback } from "react"; // Add useCallback here
import Card from "../common/Card";
import Button from "../common/Button";
import { Users, MapPin, Trash2, EyeClosed, EyeIcon, Tag } from "lucide-react";
import TeamDetailsModal from "./TeamDetailsModal";
import { teamService } from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import Alert from "../common/Alert";
import ApplicationNotificationBadge from './ApplicationNotificationBadge';
import TeamApplicationsModal from './TeamApplicationsModal';

const TeamCard = ({ team, onUpdate, onDelete, isSearchResult = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teamData, setTeamData] = useState(team);
  const { user, isAuthenticated } = useAuth();
  const [pendingApplications, setPendingApplications] = useState([]);
  const [isApplicationsModalOpen, setIsApplicationsModalOpen] = useState(false);

  // Get the team image or initial for the avatar
  const getTeamImage = () => {
    if (teamData.teamavatar_url) {
      console.log("Found teamavatar_url:", teamData.teamavatar_url);
      return teamData.teamavatar_url;
    }

    if (teamData.teamavatarUrl) {
      console.log("Found teamavatarUrl:", teamData.teamavatarUrl);
      return teamData.teamavatarUrl;
    }

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

  // Fixed: Add useCallback here
  const fetchPendingApplications = useCallback(async () => {
    if (isCreator && teamData.id) {
      try {
        const response = await teamService.getTeamApplications(teamData.id);
        setPendingApplications(response.data || []);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    }
  }, [isCreator, teamData.id]);

  // Add useEffect to fetch applications
  useEffect(() => {
    fetchPendingApplications();
  }, [fetchPendingApplications]);

  // Add this function to handle application actions
  const handleApplicationAction = async (applicationId, action, response) => {
    try {
      await teamService.handleTeamApplication(applicationId, action, response);
      // Refresh applications and team data
      await fetchPendingApplications();
      if (onUpdate) {
        const updatedTeam = await teamService.getTeamById(teamData.id);
        onUpdate(updatedTeam.data);
      }
    } catch (error) {
      throw error;
    }
  };

  const openTeamDetails = () => {
    setIsModalOpen(true);
  };

  const closeTeamDetails = () => {
    setIsModalOpen(false);
  };

  const handleTeamUpdate = (updatedTeam) => {
    setTeamData(updatedTeam);
    if (onUpdate) {
      onUpdate(updatedTeam);
    }
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();

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

  const handleModalClose = async () => {
    try {
      const response = await teamService.getTeamById(teamData.id);
      if (response && response.data) {
        const freshTeamData = response.data;
        setTeamData(freshTeamData);

        if (onUpdate) {
          onUpdate(freshTeamData);
        }
      }
    } catch (error) {
      console.error("Error refreshing team data:", error);
    }

    closeTeamDetails();
  };

  const isPublic = teamData.is_public === true;

  const shouldShowVisibilityIcon = () => {
    if (!isAuthenticated || !user) {
      return false;
    }

    if (isCreator) {
      return true;
    }

    if (teamData.creator_id === user.id || teamData.creatorId === user.id) {
      return true;
    }

    if (teamData.members && Array.isArray(teamData.members)) {
      const foundInMembers = teamData.members.some(
        (member) => member.user_id === user.id || member.userId === user.id
      );
      if (foundInMembers) {
        return true;
      }
    }

    if (userRole && userRole !== null) {
      return true;
    }

    return false;
  };

  useEffect(() => {
    const fetchCompleteTeamData = async () => {
      if (teamData && teamData.id) {
        try {
          if (
            teamData.tags &&
            Array.isArray(teamData.tags) &&
            teamData.tags.length > 0 &&
            teamData.tags.every((tag) => tag.name || typeof tag === "string")
          ) {
            return;
          }

          const response = await teamService.getTeamById(teamData.id);
          if (response && response.data) {
            if (response.data.tags && Array.isArray(response.data.tags)) {
              setTeamData((prev) => ({
                ...prev,
                tags: response.data.tags,
              }));
            }
          }
        } catch (error) {
          console.error("Error fetching complete team data:", error);
        }
      }
    };

    fetchCompleteTeamData();
  }, [teamData.id]);

  const getDisplayTags = () => {
    let displayTags = [];

    try {
      if (teamData.tags_json) {
        const tagStrings = teamData.tags_json.split(",");
        displayTags = tagStrings
          .filter((tagStr) => tagStr && tagStr.trim() !== "null")
          .map((tagStr) => {
            try {
              return JSON.parse(tagStr.trim());
            } catch (e) {
              console.warn("Failed to parse tag JSON:", tagStr);
              return null;
            }
          })
          .filter((tag) => tag !== null);
      } else if (teamData.tags) {
        if (Array.isArray(teamData.tags)) {
          displayTags = teamData.tags.map((tag) => {
            if (typeof tag === "string") {
              return { name: tag };
            } else if (tag && typeof tag === "object") {
              return {
                id:
                  tag.id ||
                  tag.tag_id ||
                  tag.tagId ||
                  Math.random().toString(36).substr(2, 9),
                name: tag.name || (typeof tag.tag === "string" ? tag.tag : ""),
                category: tag.category || tag.supercategory || "",
              };
            }
            return tag;
          });
        } else if (typeof teamData.tags === "string") {
          try {
            displayTags = JSON.parse(teamData.tags);
          } catch (e) {
            displayTags = teamData.tags
              .split(",")
              .map((name) => ({ name: name.trim() }));
          }
        }
      }
    } catch (e) {
      console.error("Error processing tags for display:", e);
      displayTags = [];
    }

    displayTags = displayTags.filter(
      (tag) => tag && (tag.name || typeof tag === "string")
    );

    return displayTags;
  };

  return (
    <>
      <Card
        title={teamData.name}
        subtitle={
          <div className="flex items-center space-x-1 text-sm">
            <Users size={16} className="text-primary" />
            <span>
              {teamData.current_members_count ??
                teamData.currentMembersCount ??
                teamData.members?.length ??
                0}{" "}
              / {teamData.max_members ?? teamData.maxMembers ?? "∞"} Members
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

          {/* Team Tags Display */}
          {(() => {
            const displayTags = getDisplayTags();

            if (displayTags && displayTags.length > 0) {
              return (
                <div className="flex items-center text-sm text-base-content/70 bg-base-200/50 py-1 rounded-full">
                  <Tag size={16} className="mr-1 text-base-content/70" />
                  <span className="truncate">
                    {displayTags.slice(0, 2).map((tag, index) => {
                      const tagName =
                        typeof tag === "string"
                          ? tag
                          : tag.name || tag.tag || "";

                      return (
                        <span key={index}>
                          {index > 0 ? ", " : ""}
                          {tagName}
                        </span>
                      );
                    })}
                    {displayTags.length > 2 && ` +${displayTags.length - 2}`}
                  </span>
                </div>
              );
            }
            return null;
          })()}
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

          {/* Fixed: Edit/Delete buttons - only for authenticated creators on non-search pages */}
          {isAuthenticated && isCreator && !isSearchResult && (
            <div className="flex items-center space-x-2 ml-2">
              {/* Application notification badge */}
              <ApplicationNotificationBadge 
                count={pendingApplications.length}
                onClick={() => setIsApplicationsModalOpen(true)}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="hover:bg-[#C7D2FE] hover:text-[#1E40AF]"
                icon={<Trash2 size={16} />}
                aria-label="Delete team"
              >
                {isDeleting ? "Deleting..." : ""}
              </Button>
            </div>
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

      <TeamApplicationsModal
        isOpen={isApplicationsModalOpen}
        onClose={() => setIsApplicationsModalOpen(false)}
        teamId={teamData.id}
        applications={pendingApplications}
        onApplicationAction={handleApplicationAction}
      />
    </>
  );
};

export default TeamCard;