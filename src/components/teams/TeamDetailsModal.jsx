import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { teamService } from "../../services/teamService";
import TagSelector from "../tags/TagSelector";
import Button from "../common/Button";
import Alert from "../common/Alert";
import TagDisplay from "../common/TagDisplay";
import LocationDisplay from "../common/LocationDisplay";
import { X, Edit, Users, Trash2, Eye, EyeClosed, Tag } from "lucide-react";
import IconToggle from "../common/IconToggle";
import axios from "axios";

const TeamDetailsModal = ({
  isOpen = true,
  teamId: propTeamId,
  onClose,
  onUpdate,
  onDelete,
  userRole,
  isFromSearch = false,
}) => {
  const navigate = useNavigate();
  const { id: urlTeamId } = useParams();
  const { user, isAuthenticated } = useAuth();

  const effectiveTeamId = useMemo(
    () => propTeamId || urlTeamId,
    [propTeamId, urlTeamId]
  );

  const [isModalVisible, setIsModalVisible] = useState(isOpen);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({
    type: null,
    message: null,
  });
  const [team, setTeam] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false, // Default is invisible
    maxMembers: 5,
    selectedTags: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [isCreator, setIsCreator] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  const fetchTeamDetails = useCallback(async () => {
    if (!effectiveTeamId) return;

    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      // Get the team details
      console.log(`Fetching details for team ID: ${effectiveTeamId}`);
      const response = await teamService.getTeamById(effectiveTeamId);

      // Log full response for debugging
      console.log("Raw API response:", response);

      // Get team data from response
      let teamData;
      if (response.data && typeof response.data === "object") {
        teamData = response.data;
      } else if (response.data && response.data.data) {
        teamData = response.data.data;
      } else {
        teamData = {};
      }

      console.log("Team data extracted:", teamData);

      // Look for creator ID in multiple possible locations
      let creatorId = null;

      // 1. Try direct creator_id field
      if (teamData.creator_id !== undefined) {
        creatorId = parseInt(teamData.creator_id, 10);
      }
      // 2. Try creatorId field (camelCase variation)
      else if (teamData.creatorId !== undefined) {
        creatorId = parseInt(teamData.creatorId, 10);
      }

      // 3. If still not found or invalid, check members array for creator role
      if (
        isNaN(creatorId) &&
        teamData.members &&
        Array.isArray(teamData.members)
      ) {
        console.log(
          "Searching for creator in members array:",
          teamData.members
        );

        const creatorMember = teamData.members.find(
          (m) => m.role === "creator" || m.role === "Creator"
        );

        if (creatorMember) {
          // Use either user_id or userId depending on which exists
          creatorId = parseInt(
            creatorMember.user_id || creatorMember.userId,
            10
          );
          console.log("Found creator ID from members array:", creatorId);
        }
      }

      // 4. Ensure creatorId is valid, use logged-in user as fallback for creator's own teams
      if (isNaN(creatorId) && user && teamData.members) {
        // Check if current user is listed as creator in members
        const isCurrentUserCreator = teamData.members.some(
          (member) =>
            (member.user_id === user.id || member.userId === user.id) &&
            (member.role === "creator" || member.role === "Creator")
        );

        if (isCurrentUserCreator) {
          creatorId = parseInt(user.id, 10);
          console.log("Using current user as creator ID:", creatorId);
        }
      }

      console.log("Final creator ID determination:", creatorId);

      // Process visibility
      let isPublicValue = false;
      const isPublicRaw = teamData.is_public || teamData.isPublic;

      if (isPublicRaw === true || isPublicRaw === "true" || isPublicRaw === 1) {
        isPublicValue = true;
      }

      // Enhance team data with normalized values
      const enhancedTeamData = {
        ...teamData,
        creator_id: creatorId, // Set the corrected creator ID
        is_public: isPublicValue,
      };

      console.log("Enhanced team data:", enhancedTeamData);

      // Store the enhanced team data
      setTeam(enhancedTeamData);
      setIsPublic(isPublicValue);

      // Determine if current user is creator - REQUIRE AUTHENTICATION FIRST
      const isUserAuthenticated = isAuthenticated && user && user.id;

      // Calculate if user is creator by ID comparison (only if authenticated)
      const isCreatorById =
        isUserAuthenticated &&
        !isNaN(creatorId) &&
        parseInt(user.id, 10) === creatorId;

      // Calculate if user is creator by role (only if authenticated)
      const isCreatorByRole =
        (isUserAuthenticated &&
          teamData.members?.some(
            (member) =>
              (member.user_id === user.id || member.userId === user.id) &&
              (member.role === "creator" || member.role === "Creator")
          )) ||
        false;

      // Final creator determination - must be authenticated AND either method confirms
      const finalCreatorStatus =
        isUserAuthenticated && (isCreatorById || isCreatorByRole);

      console.log("Creator check:", {
        isUserAuthenticated,
        userId: user?.id,
        creatorId,
        isCreatorById,
        isCreatorByRole,
        finalCreatorStatus,
      });

      setIsCreator(finalCreatorStatus);

      // Set form data with the normalized values from team data
      setFormData({
        name: teamData.name || "",
        description: teamData.description || "",
        isPublic: isPublicValue,
        maxMembers: teamData.max_members || teamData.maxMembers || 5,
        teamavatarUrl: teamData.teamavatar_url || teamData.teamavatarUrl || "",
        selectedTags: (teamData.tags || []).map((tag) =>
          parseInt(tag.id || tag.tag_id, 10)
        ),
      });
    } catch (err) {
      console.error("Error fetching team details:", err);
      setNotification({
        type: "error",
        message:
          "Server error: " +
          (err.response?.data?.error || err.message || "Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveTeamId, user, isAuthenticated]);

  // Add effect to check team data after it's set
  useEffect(() => {
    if (team) {
      console.log("Current team data in state:", team);
      console.log("Team visibility value:", team.is_public);
      console.log("Team creator:", team.creator_id, "Current user:", user?.id);
    }
  }, [team, user]);

  useEffect(() => {
    if (team) {
      console.log("TeamDetailsModal - Team data:", {
        name: team.name,
        current_members_count: team.current_members_count,
        max_members: team.max_members,
        max_members_type: typeof team.max_members,
        members_length: team.members?.length,
      });
    }
  }, [team]);

  useEffect(() => {
    setIsModalVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isModalVisible && effectiveTeamId) {
      fetchTeamDetails();
    } else if (isModalVisible && !effectiveTeamId) {
      // Handle the case where teamId is not yet available (e.g., just created)
      setLoading(false); // Don't show loading indefinitely
    }
  }, [isModalVisible, effectiveTeamId, fetchTeamDetails]);

  useEffect(() => {
    // Reset state when modal closes
    if (!isModalVisible) {
      setNotification({ type: null, message: null });
      setFormErrors({});
    }
  }, [isModalVisible]);

  // Use our independent isCreator state for more reliability
  const isTeamCreator = useMemo(() => isCreator, [isCreator]);

  const isTeamAdmin = useMemo(() => userRole === "admin", [userRole]);

  const canEditTeam = isTeamCreator || isTeamAdmin;

  // Check if user is already a member of this team
  const isTeamMember = useMemo(() => {
    if (!team || !user) return false;
    return (
      team.members?.some((member) => member.user_id === user.id) ||
      isTeamCreator ||
      userRole
    );
  }, [team, user, isTeamCreator, userRole]);

  // Helper function to determine if visibility status should be shown
  const shouldShowVisibilityStatus = () => {
    // Only show for authenticated users
    if (!isAuthenticated || !user) {
      return false;
    }

    // Show for creators
    if (isCreator) {
      return true;
    }

    // Show for team members
    if (team && team.members && Array.isArray(team.members)) {
      return team.members.some(
        (member) => member.user_id === user.id || member.userId === user.id
      );
    }

    // Show if user has a role in the team
    if (userRole && userRole !== null) {
      return true;
    }

    return false;
  };

  // Helper function to determine if a member profile should be anonymized
  const shouldAnonymizeMember = (member) => {
    // Don't anonymize the current user's own profile
    if (user && (member.user_id === user.id || member.userId === user.id)) {
      return false;
    }

    // Check if the member has a private profile
    // Look for is_public property in both camelCase and snake_case formats
    return member.is_public === false || member.isPublic === false;
  };

  const handleClose = useCallback(() => {
    setIsModalVisible(false);
    // Allow animation to complete before executing onClose
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else if (urlTeamId) {
        // If we're on a team-specific route, navigate back to teams
        navigate("/teams/my-teams");
      }
    }, 300);
  }, [onClose, navigate, urlTeamId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Special handling for isPublic to ensure it's always a boolean
    if (name === "isPublic") {
      setFormData((prev) => ({
        ...prev,
        isPublic: checked, // Explicitly use the checked property
      }));

      // Debug logging
      console.log(`Changed isPublic to: ${checked} (${typeof checked})`);
      return;
    }

    // Handle other form fields normally
    const newValue = type === "checkbox" ? checked : value;

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === "maxMembers" ? parseInt(newValue, 10) : newValue,
    }));
  };

  const handleTagSelection = useCallback((selectedTags) => {
    console.log("Tags selected (raw):", selectedTags);

    // Convert tag IDs to numbers
    const numericTags = selectedTags.map((tag) => Number(tag));
    console.log("Tags converted to numbers:", numericTags);

    setFormData((prev) => ({
      ...prev,
      selectedTags: numericTags,
    }));
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Team name is required";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Team name must be at least 3 characters";
    }

    if (!formData.description.trim()) {
      errors.description = "Team description is required";
    } else if (formData.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    if (formData.maxMembers < 2 || formData.maxMembers > 20) {
      errors.maxMembers = "Team size must be between 2 and 20 members";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Prevent non-creators from submitting form updates
    if (!isCreator) {
      setNotification({
        type: "error",
        message: "You do not have permission to edit this team.",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      // Log the form data before submission
      console.log("Form data before submission:", formData);

      // Ensure isPublic is a proper boolean
      const isPublicBoolean = formData.isPublic === true;
      console.log(
        "Visibility value computed:",
        isPublicBoolean,
        typeof isPublicBoolean
      );

      // Prepare the submission data first
      const submissionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_public: isPublicBoolean, // Force it to be a boolean
        max_members: formData.maxMembers,
      };

      // Handle avatar file upload if a new file was selected
      if (formData.teamavatarFile) {
        // Create FormData for file upload
        const avatarFormData = new FormData();
        avatarFormData.append("file", formData.teamavatarFile);
        avatarFormData.append(
          "upload_preset",
          import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
        );

        try {
          // Upload to Cloudinary
          const cloudinaryResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${
              import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
            }/image/upload`,
            avatarFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          // Add the uploaded URL to submission data
          submissionData.teamavatar_url = cloudinaryResponse.data.secure_url;
        } catch (uploadError) {
          console.error("Error uploading team avatar:", uploadError);
          // Continue with the update even if image upload fails
          setNotification({
            type: "warning",
            message: "Team updated but avatar upload failed.",
          });
        }
      }

      console.log("Submission data prepared:", submissionData);

      // Only add tags if there are any selected
      if (formData.selectedTags && formData.selectedTags.length > 0) {
        // Process and add tags to submission data
        const processedTags = formData.selectedTags
          .filter((tagId) => tagId) // Remove any falsy values
          .map((tagId) => {
            const numericId = Number(tagId); // Explicitly convert to number
            return {
              tag_id: numericId,
            };
          });

        // Only include tags in the submission if we have valid ones
        if (processedTags.length > 0) {
          submissionData.tags = processedTags;
        }
      }

      console.log("Final submission data:", submissionData);

      const response = await teamService.updateTeam(
        effectiveTeamId,
        submissionData
      );
      console.log("Update response:", response);

      // Update our local state with the new visibility value
      setIsPublic(isPublicBoolean);

      // Create a properly updated team object to return to parent
      const updatedTeam = {
        ...team,
        ...submissionData,
        is_public: isPublicBoolean, // Explicitly include the visibility
      };

      setNotification({
        type: "success",
        message: "Team updated successfully!",
      });

      setIsEditing(false);

      // After updating, fetch the latest data to ensure we have the most up-to-date info
      await fetchTeamDetails();

      // Update the parent component if callback is provided
      if (onUpdate) {
        onUpdate(updatedTeam);
      }
    } catch (err) {
      console.error("Error updating team:", err);

      // Improve error message by extracting the specific error from the API response
      let errorMessage = "Failed to update team. Please try again.";
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        errorMessage = `Error: ${err.response.data.errors[0]}`;
      } else if (err.response?.data?.message) {
        errorMessage = `Error: ${err.response.data.message}`;
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setNotification({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this team? This action cannot be undone."
      )
    ) {
      try {
        setLoading(true);

        let success = false;
        if (onDelete) {
          success = await onDelete(effectiveTeamId);
        } else {
          await teamService.deleteTeam(effectiveTeamId);
          success = true;
        }

        if (success) {
          handleClose();
          // If we're on a team-specific route, navigate away
          if (urlTeamId) {
            navigate("/teams/my-teams");
          }
        }
      } catch (err) {
        console.error("Error deleting team:", err);
        setNotification({
          type: "error",
          message: "Failed to delete team. Please try again.",
        });
        setLoading(false);
      }
    }
  };

  const handleApplyToJoin = async () => {
    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      await teamService.addTeamMember(effectiveTeamId, user.id);
      await fetchTeamDetails();

      setNotification({
        type: "success",
        message: "Successfully applied to join the team!",
      });
    } catch (err) {
      console.error("Error applying to join team:", err);
      setNotification({
        type: "error",
        message: "Failed to apply. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderJoinButton = () => {
    if (!isAuthenticated || !user || isTeamMember || loading) {
      return null;
    }

    return (
      <div className="mt-6">
        <Button
          variant="primary"
          onClick={handleApplyToJoin}
          disabled={loading}
          className="w-full"
        >
          Apply to Join Team
        </Button>
      </div>
    );
  };

  const renderNotification = () => {
    if (!notification.type || !notification.message) return null;

    return (
      <Alert
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: null, message: null })}
        className="mb-4"
      />
    );
  };

  // Add detailed debugging
  console.log("Team Details Debug:", {
    // User information
    "Current User ID": user?.id,
    "User Object": user,

    // Team information
    "Team Creator ID": team?.creator_id,
    "Team Object": team,

    // Role information
    "User Role": userRole,

    // Computed values
    "Is Creator": isCreator,
    "Is Admin": userRole === "admin",
    "Can Edit": canEditTeam,
    "Is Public": isPublic,

    // Modal state
    "Is Editing": isEditing,
    "Is Modal Visible": isModalVisible,

    // Form Data
    "Form Data": formData,
  });

  if (!isModalVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={handleClose}
      ></div>

      {/* Modal container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
        <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-xl font-medium text-primary">
            {isEditing ? "Edit Team" : "Team Details"}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Only show edit/delete buttons if user is authenticated AND creator */}
            {!isEditing && (
              <>
                {/* Debug info for development only
                {import.meta.env.DEV && (
                  <span className="text-xs mr-2">
                    Auth: {isAuthenticated ? "✓" : "✗"} | User: {user?.id} |
                    Creator: {team?.creator_id} | Status:{" "}
                    {isCreator ? "✓ Creator" : "✗ Not Creator"}
                  </span>
                )} */}

                {/* Edit button - only shown to authenticated creators */}
                {isAuthenticated && isCreator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                    icon={<Edit size={16} />}
                  >
                    Edit
                  </Button>
                )}

                {/* Delete button - only shown to authenticated creators */}
                {isAuthenticated && isCreator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteTeam}
                    className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                    icon={<Trash2 size={16} />}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {renderNotification()}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
          ) : (
            <>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="form-control">
                    <label className="label">Team Avatar</label>
                    <div className="flex items-center space-x-4">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-16 h-16">
                          {formData.teamavatarUrl ? (
                            <img
                              src={formData.teamavatarUrl}
                              alt="Team Preview"
                              className="rounded-full object-cover w-full h-full"
                            />
                          ) : (
                            <span className="text-2xl">
                              {formData.name?.charAt(0) || "?"}
                            </span>
                          )}
                        </div>
                      </div>
                      <input
                        type="file"
                        name="teamavatar"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            // Preview the image
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setFormData((prev) => ({
                                ...prev,
                                teamavatarUrl: event.target.result,
                                teamavatarFile: e.target.files[0], // Store the file for upload
                              }));
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                        accept="image/*"
                        className="file-input file-input-bordered w-full max-w-xs"
                      />
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="label">Team Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`input input-bordered w-full ${
                        formErrors.name ? "input-error" : ""
                      }`}
                      placeholder="Team Name"
                    />
                    {formErrors.name && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {formErrors.name}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label">Team Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className={`textarea textarea-bordered h-24 w-full ${
                        formErrors.description ? "textarea-error" : ""
                      }`}
                      placeholder="Team Description"
                    ></textarea>
                    {formErrors.description && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {formErrors.description}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Toggle visibility with IconToggle */}
                  <IconToggle
                    name="isPublic"
                    checked={formData.isPublic === true}
                    onChange={handleChange}
                    title="Team Visibility"
                    entityType="team"
                    visibleLabel="Public Team"
                    hiddenLabel="Private Team"
                    visibleDescription="Anyone can find and view your team"
                    hiddenDescription="Only members can see this team"
                    className="toggle-visibility"
                  />

                  {/* Debug info for form data
                  {import.meta.env.DEV && (
                    <div className="text-xs bg-base-200 p-2 rounded">
                      Debug - Form Data:
                      <pre>
                        {JSON.stringify(
                          {
                            isPublic: formData.isPublic,
                            type: typeof formData.isPublic,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )} */}

                  <div className="form-control">
                    <label className="label">Maximum Members</label>
                    <select
                      name="maxMembers"
                      value={formData.maxMembers}
                      onChange={handleChange}
                      className={`select select-bordered w-full ${
                        formErrors.maxMembers ? "select-error" : ""
                      }`}
                    >
                      {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((size) => (
                        <option key={size} value={size}>
                          {size} members
                        </option>
                      ))}
                    </select>
                    {formErrors.maxMembers && (
                      <label className="label">
                        <span className="label-text-alt text-error">
                          {formErrors.maxMembers}
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="form-control">
                    <label className="label">Team Tags (Optional)</label>
                    <TagSelector
                      selectedTags={formData.selectedTags}
                      onTagsSelected={handleTagSelection}
                    />
                    {import.meta.env.DEV && (
                      <div className="mt-2 text-sm text-base-content/70">
                        <p>
                          Debug: Selected tag IDs:{" "}
                          {formData.selectedTags.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-1">
                  {/* Team header with avatar */}
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-full w-16 h-16">
                        {/* Check for both snake_case and camelCase versions of avatar URL */}
                        {team?.teamavatar_url || team?.teamavatarUrl ? (
                          <img
                            src={team?.teamavatar_url || team?.teamavatarUrl}
                            alt="Team"
                            className="rounded-full object-cover w-full h-full"
                          />
                        ) : (
                          <span className="text-2xl">
                            {team?.name?.charAt(0) || "?"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{team?.name}</h1>
                      {/* Members count */}
                      <div className="flex items-center space-x-1 text-sm">
                        <Users size={18} className="text-primary" />
                        <span>
                          {team.current_members_count ??
                            team.currentMembersCount ??
                            team.members?.length ??
                            0}{" "}
                          / {team.max_members ?? team.maxMembers ?? "∞"} Members
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Team description */}
                  {team?.description && (
                    <div>
                      <p className="text-base-content/90 my-6">
                        {team.description}
                      </p>
                    </div>
                  )}

                  {/* Visibility info - only show to authenticated members/creators */}
                  {shouldShowVisibilityStatus() && (
                    <div className="flex items-center space-x-1 text-sm text-base-content/70">
                      {isPublic ? (
                        <>
                          <Eye size={16} className="mr-1 text-green-600" />
                          <span>Public Team</span>
                        </>
                      ) : (
                        <>
                          <EyeClosed size={16} className="mr-1 text-grey-600" />
                          <span>Private Team</span>
                        </>
                      )}

                      {/* Debug info in development
                      {import.meta.env.DEV && (
                        <span className="text-xs ml-2 opacity-50">
                          (Debug: stored isPublic={String(isPublic)},
                          team.is_public=
                          {team?.is_public !== undefined
                            ? String(team.is_public)
                            : "undefined"}
                          )
                        </span>
                      )} */}
                    </div>
                  )}

                  {/* Team Tags - Enhanced Display */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Tag size={18} className="mr-2 text-primary" />
                      Team Focus Areas
                    </h3>

                    {team?.tags?.length > 0 ? (
                      <div className="space-y-3">
                        {/* Group tags by category if available */}
                        {(() => {
                          const tagsByCategory = {};
                          team.tags.forEach((tag) => {
                            const category = tag.category || "Other";
                            if (!tagsByCategory[category]) {
                              tagsByCategory[category] = [];
                            }
                            tagsByCategory[category].push(tag);
                          });

                          return Object.entries(tagsByCategory).map(
                            ([category, categoryTags]) => (
                              <div
                                key={category}
                                className="bg-base-200/30 rounded-lg p-3"
                              >
                                <h4 className="font-medium text-sm text-base-content/80 mb-2">
                                  {category}
                                </h4>
                                <TagDisplay
                                  tags={categoryTags}
                                  size="md"
                                  variant="primary"
                                  showCategory={false}
                                />
                              </div>
                            )
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="bg-base-200/20 rounded-lg p-4 text-center">
                        <Tag
                          size={24}
                          className="mx-auto mb-2 text-base-content/40"
                        />
                        <p className="text-sm text-base-content/60">
                          No focus areas specified yet
                        </p>
                        {isCreator && !isEditing && (
                          <p className="text-xs text-base-content/50 mt-1">
                            Add tags to help others find your team
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  {team?.members && team.members.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mt-6 mb-4">
                        Team Members
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {team.members.map((member) => {
                          console.log("Member data:", member); // Debug info

                          // Check which property is available (userId or user_id)
                          const memberId = member.userId || member.user_id;

                          // Determine if this member should be anonymized
                          const anonymize = shouldAnonymizeMember(member);

                          return (
                            <div
                              key={memberId}
                              className="flex items-start bg-green-50 rounded-xl shadow p-4 gap-4"
                            >
                              <div className="avatar">
                                {!anonymize &&
                                (member.avatarUrl || member.avatar_url) ? (
                                  <div className="rounded-full w-12 h-12">
                                    <img
                                      src={
                                        member.avatarUrl || member.avatar_url
                                      }
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
                                        const span =
                                          document.createElement("span");
                                        span.className = "text-lg";
                                        span.textContent = anonymize
                                          ? "PP"
                                          : (member.username || "").charAt(0) ||
                                            "?";
                                        parentDiv.appendChild(span);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="placeholder bg-primary text-primary-content rounded-full w-12 h-12">
                                    <span className="text-lg">
                                      {anonymize
                                        ? "PP"
                                        : (member.username || "").charAt(0) ||
                                          "?"}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col">
                                <span className="font-medium text-primary">
                                  {anonymize
                                    ? "Private Profile"
                                    : member.firstName && member.lastName
                                    ? `${member.firstName} ${member.lastName}`
                                    : member.first_name && member.last_name
                                    ? `${member.first_name} ${member.last_name}`
                                    : member.username}
                                </span>
                                <div className="flex items-center">
                                  <span className="text-xs text-base-content/70">
                                    {member.role}
                                  </span>
                                  {/* Add location display if the member has a postal code */}
                                  {!anonymize &&
                                    (member.postal_code ||
                                      member.postalCode) && (
                                      <>
                                        <span className="text-xs text-base-content/70 mx-1">
                                          •
                                        </span>
                                        <LocationDisplay
                                          postalCode={
                                            member.postal_code ||
                                            member.postalCode
                                          }
                                          showIcon={false}
                                          displayType="short"
                                          className="text-xs text-base-content/70"
                                        />
                                      </>
                                    )}
                                </div>

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
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Join Team Button for non-members */}
                  {renderJoinButton()}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamDetailsModal;
