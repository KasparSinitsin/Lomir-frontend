import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import IconToggle from "../common/IconToggle";
import ImageUploader from "../common/ImageUploader";
import TagInput from "../tags/TagInput";
import LocationInput from "../common/LocationInput";
import FormSectionDivider from "../common/FormSectionDivider";
import { UI_TEXT } from "../../constants/uiText";
import { teamService } from "../../services/teamService";
import { uploadToCloudinary } from "../../config/cloudinary";
import { useLocationAutoFill } from "../../hooks/useLocationAutoFill";
import TeamDetailsModal from "./TeamDetailsModal";
import { Users, Camera, Tag, Settings } from "lucide-react";

/**
 * CreateTeamModal Component
 *
 * Modal for creating a new team. Uses consistent styling with TeamEditForm.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onTeamCreated - Callback when team is successfully created (receives new team data)
 */
const CreateTeamModal = ({ isOpen, onClose, onTeamCreated }) => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
    maxMembers: 5,
    maxMembersMode: "preset",
    selectedTags: [],
    teamImage: null,
    teamImagePreview: null,
    isRemote: false,
    postalCode: "",
    city: "",
    country: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [newTeamId, setNewTeamId] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);

  // Location auto-fill hook
  const { getSuggestedUpdates } = useLocationAutoFill({
    postalCode: formData.postalCode || "",
    city: formData.city || "",
    country: formData.country || "",
    isEditing: true,
    isRemote: formData.isRemote || false,
  });

  // Auto-fill city and country from postal code lookup
  useEffect(() => {
    if (formData.isRemote) return;

    const updates = getSuggestedUpdates();
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, [getSuggestedUpdates, formData.isRemote]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        description: "",
        isPublic: false,
        maxMembers: 5,
        maxMembersMode: "preset",
        selectedTags: [],
        teamImage: null,
        teamImagePreview: null,
        isRemote: false,
        postalCode: "",
        city: "",
        country: "",
      });
      setFormErrors({});
      setSubmitError(null);
      setSubmitSuccess(false);
      setNewTeamId(null);
    }
  }, [isOpen]);

  // Validation
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.name) {
      errors.name = "Team name is required";
    } else if (formData.name.length < 3) {
      errors.name = "Team name must be at least 3 characters";
    }

    if (!formData.description) {
      errors.description = "Team description is required";
    } else if (formData.description.length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    // Validate maxMembers only when not unlimited
    if (formData.maxMembersMode !== "unlimited") {
      const parsed =
        typeof formData.maxMembers === "number"
          ? formData.maxMembers
          : parseInt(formData.maxMembers, 10);

      if (!Number.isNaN(parsed) && parsed < 2) {
        errors.maxMembers = "Team size must be at least 2 members";
      }
    }

    return errors;
  }, [
    formData.name,
    formData.description,
    formData.maxMembers,
    formData.maxMembersMode,
  ]);

  // Handle form field changes
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;

      // Special handling for isPublic
      if (name === "isPublic") {
        setFormData((prev) => ({
          ...prev,
          isPublic: checked,
        }));
        return;
      }

      const newValue = type === "checkbox" ? checked : value;

      // Clear error for this field
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }

      setFormData((prev) => ({
        ...prev,
        [name]:
          name === "maxMembers" ? parseInt(newValue, 10) || newValue : newValue,
      }));
    },
    [formErrors],
  );

  // Handle location changes
  const handleLocationChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;

      const map = {
        is_remote: "isRemote",
        postal_code: "postalCode",
        city: "city",
        state: "state",
        country: "country",
      };

      const mappedKey = map[name] || name;
      const newValue = name === "is_remote" ? Boolean(checked) : value;

      // Clear errors
      if (formErrors[mappedKey] || formErrors[name]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[mappedKey];
          delete next[name];
          return next;
        });
      }

      setFormData((prev) => {
        const nextState = {
          ...prev,
          [mappedKey]: newValue,
        };

        // If remote turned on, clear physical fields
        if (mappedKey === "isRemote" && newValue === true) {
          nextState.postalCode = "";
          nextState.city = "";
          nextState.country = "";
        }

        return nextState;
      });
    },
    [formErrors],
  );

  // Handle tag selection
  const handleTagSelection = useCallback((selectedTags) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags,
    }));
  }, []);

  // Get team initials from name
  const getTeamInitials = () => {
    const name = formData.name;
    if (!name || typeof name !== "string") return "T";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) {
      return name.slice(0, 2).toUpperCase();
    }

    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      // Format tags
      const formattedTags = formData.selectedTags.map((tagId) => ({
        tag_id: parseInt(tagId, 10),
      }));

      // Determine maxMembers
      let maxMembersForSubmit = null;
      if (formData.maxMembersMode === "unlimited") {
        maxMembersForSubmit = null;
      } else {
        const parsed =
          typeof formData.maxMembers === "number"
            ? formData.maxMembers
            : parseInt(formData.maxMembers, 10);
        maxMembersForSubmit = Number.isNaN(parsed) ? 5 : parsed;
      }

      // Build submission data
      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: maxMembersForSubmit,
        tags: formattedTags,
        teamavatar_url: null,
        is_remote: formData.isRemote,
        postal_code: formData.isRemote ? null : formData.postalCode || null,
        city: formData.isRemote ? null : formData.city || null,
        country: formData.isRemote ? null : formData.country || null,
      };

      // Upload image if selected
      if (formData.teamImage) {
        const uploadResult = await uploadToCloudinary(
          formData.teamImage,
          "teamAvatars",
        );

        if (uploadResult.success) {
          submissionData.teamavatar_url = uploadResult.url;
        }
      }

      // Create the team
      const response = await teamService.createTeam(submissionData);

      setNewTeamId(response.data.id);
      setSubmitSuccess(true);

      // Notify parent
      if (onTeamCreated) {
        onTeamCreated(response.data);
      }
    } catch (error) {
      console.error("Team creation error:", error);
      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Failed to create team. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (submitSuccess) {
      // Navigate to my-teams with the new team highlighted
      navigate(`/teams/my-teams?highlight=${newTeamId}`);
    }
    onClose();
  };

  // Handle "View Team Details" click
  const handleViewTeamDetails = () => {
    setIsTeamDetailsOpen(true);
  };

  // Handle TeamDetailsModal close
  const handleTeamDetailsClose = () => {
    setIsTeamDetailsOpen(false);
    navigate("/teams/my-teams");
    onClose();
  };

  // Modal title
  const modalTitle = (
    <h2 className="text-xl font-medium text-primary">Create New Team</h2>
  );

  return (
    <>
      <Modal
        isOpen={isOpen && !isTeamDetailsOpen}
        onClose={handleClose}
        title={modalTitle}
        position="center"
        size="default"
        maxHeight="max-h-[90vh]"
        minHeight="min-h-[300px]"
        closeOnBackdrop={!loading}
        closeOnEscape={!loading}
        showCloseButton={!loading}
      >
        {submitError && (
          <Alert
            type="error"
            message={submitError}
            onClose={() => setSubmitError(null)}
            className="mb-4"
          />
        )}

        {submitSuccess ? (
          // Success state
          <div className="text-center py-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-base-content mb-2">
              Team Created Successfully!
            </h3>
            <p className="text-base-content/70 mb-6">
              Your team "{formData.name}" has been created.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="ghost" onClick={handleClose}>
                Go to My Teams
              </Button>
              <Button variant="primary" onClick={handleViewTeamDetails}>
                View Team Details
              </Button>
            </div>
          </div>
        ) : (
          // Form
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Team Avatar Section */}
            <FormSectionDivider text="Team Avatar" icon={Camera} />

            <div className="form-control">
              <ImageUploader
                currentImage={formData.teamImagePreview}
                onImageSelect={(file, previewUrl) => {
                  setFormData((prev) => ({
                    ...prev,
                    teamImage: file,
                    teamImagePreview: previewUrl,
                  }));
                }}
                onImageRemove={() => {
                  setFormData((prev) => ({
                    ...prev,
                    teamImage: null,
                    teamImagePreview: null,
                  }));
                }}
                fallbackText={getTeamInitials()}
                shape="circle"
                size="md"
                disabled={loading}
              />
            </div>

            {/* Team Details Section */}
            <FormSectionDivider text="Team Details" icon={Users} />

            {/* Team Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Team Name *</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter team name"
                className={`input input-bordered w-full ${
                  formErrors.name ? "input-error" : ""
                }`}
                disabled={loading}
                required
              />
              {formErrors.name && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {formErrors.name}
                  </span>
                </label>
              )}
            </div>

            {/* Team Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Description *</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your team's goals and what you're working on"
                className={`textarea textarea-bordered w-full h-24 ${
                  formErrors.description ? "textarea-error" : ""
                }`}
                disabled={loading}
                required
              />
              {formErrors.description && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {formErrors.description}
                  </span>
                </label>
              )}
            </div>

            {/* Team Settings Section */}
            <FormSectionDivider text="Team Settings" icon={Settings} />

            {/* Team Visibility Toggle */}
            <div className="form-control">
              <IconToggle
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleChange}
                title="Team Visibility"
                entityType="team"
                className="toggle-visibility"
                disabled={loading}
              />
            </div>

            {/* Max Members */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Maximum Members *</span>
              </label>

              {/* Selection Mode Tabs */}
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      maxMembersMode: "preset",
                      maxMembers: 5,
                    }));
                  }}
                  className={`btn btn-sm ${
                    formData.maxMembersMode !== "custom" &&
                    formData.maxMembersMode !== "unlimited" &&
                    formData.maxMembers !== null
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  disabled={loading}
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      maxMembersMode: "custom",
                      maxMembers: prev.maxMembers || 25,
                    }));
                  }}
                  className={`btn btn-sm ${
                    formData.maxMembersMode === "custom"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  disabled={loading}
                >
                  Custom
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      maxMembersMode: "unlimited",
                      maxMembers: null,
                    }));
                  }}
                  className={`btn btn-sm ${
                    formData.maxMembers === null ||
                    formData.maxMembersMode === "unlimited"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  disabled={loading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z" />
                  </svg>
                  Unlimited
                </button>
              </div>

              {/* Preset Dropdown */}
              {formData.maxMembersMode !== "custom" &&
                formData.maxMembersMode !== "unlimited" &&
                formData.maxMembers !== null && (
                  <select
                    name="maxMembers"
                    value={formData.maxMembers}
                    onChange={handleChange}
                    className={`select select-bordered w-full ${
                      formErrors.maxMembers ? "select-error" : ""
                    }`}
                    disabled={loading}
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((size) => (
                      <option key={size} value={size}>
                        {size} members
                      </option>
                    ))}
                  </select>
                )}

              {/* Custom Number Input */}
              {formData.maxMembersMode === "custom" && (
                <input
                  type="number"
                  name="maxMembers"
                  value={formData.maxMembers || ""}
                  onChange={handleChange}
                  min="2"
                  placeholder="Enter custom number (min. 2)"
                  className={`input input-bordered w-full ${
                    formErrors.maxMembers ? "input-error" : ""
                  }`}
                  disabled={loading}
                />
              )}

              {/* Unlimited Display */}
              {(formData.maxMembers === null ||
                formData.maxMembersMode === "unlimited") &&
                formData.maxMembersMode !== "custom" &&
                formData.maxMembersMode !== "preset" && (
                  <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z" />
                    </svg>
                    <span className="text-base-content">No member limit</span>
                  </div>
                )}

              {formErrors.maxMembers && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {formErrors.maxMembers}
                  </span>
                </label>
              )}
            </div>

            {/* Team Location */}
            <LocationInput
              formData={{
                is_remote: !!formData.isRemote,
                postal_code: formData.postalCode ?? "",
                city: formData.city ?? "",
                country: formData.country ?? "",
              }}
              onChange={handleLocationChange}
              errors={{
                postal_code: formErrors.postalCode || formErrors.postal_code,
                city: formErrors.city,
                country: formErrors.country,
              }}
              disabled={loading}
              showRemoteToggle={true}
              showDivider={true}
              dividerText="Location"
            />

            {/* Focus Areas (Tags) */}
            <FormSectionDivider text="Focus Areas" icon={Tag} />

            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  What will this team focus on? (Optional)
                </span>
              </label>
              <TagInput
                selectedTags={formData.selectedTags}
                onTagsChange={handleTagSelection}
                placeholder={UI_TEXT.focusAreas.searchPlaceholder}
                showPopularTags={true}
                maxSuggestions={8}
              />
            </div>

            {/* Divider before form actions */}
            <div className="divider my-6"></div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Team Details Modal (opened after successful creation) */}
      {isTeamDetailsOpen && newTeamId && (
        <TeamDetailsModal
          isOpen={isTeamDetailsOpen}
          teamId={newTeamId}
          onClose={handleTeamDetailsClose}
        />
      )}
    </>
  );
};

export default CreateTeamModal;
