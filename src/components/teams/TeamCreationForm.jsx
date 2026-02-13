import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheck } from "react-icons/fi";
import axios from "axios";
import TagInputV2 from "../tags/TagInputV2";
import Alert from "../common/Alert";
import { teamService } from "../../services/teamService";
import TeamDetailsModal from "./TeamDetailsModal";
import IconToggle from "../common/IconToggle";
import ImageUploader from "../common/ImageUploader";
import { uploadToCloudinary } from "../../config/cloudinary";
import LocationInput from "../common/LocationInput";
import { useLocationAutoFill } from "../../hooks/useLocationAutoFill";

const TeamCreationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
    maxMembers: 5,
    maxMembersMode: "preset",
    selectedTags: [],
    teamImage: null,
    is_remote: false,
    postal_code: "",
    city: "",
    country: "",
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [newTeamId, setNewTeamId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Location auto-fill hook
  const { getSuggestedUpdates } = useLocationAutoFill({
    postalCode: formData.postal_code || "",
    city: formData.city || "",
    country: formData.country || "",
    isEditing: true,
    isRemote: formData.is_remote || false,
  });

  // Auto-fill city and country from postal code lookup
  useEffect(() => {
    if (formData.is_remote) return;

    const updates = getSuggestedUpdates();
    if (Object.keys(updates).length > 0) {
      // Map camelCase updates to snake_case for this form
      const mappedUpdates = {};
      if (updates.city) mappedUpdates.city = updates.city;
      if (updates.country) mappedUpdates.country = updates.country;

      if (Object.keys(mappedUpdates).length > 0) {
        setFormData((prev) => ({ ...prev, ...mappedUpdates }));
      }
    }
  }, [getSuggestedUpdates, formData.is_remote]);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = "Team name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Team name must be at least 3 characters";
    }

    if (!formData.description) {
      newErrors.description = "Team description is required";
    } else if (formData.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    // Allow null for unlimited; validate only when there's a numeric limit
    let numericMaxMembers = null;

    if (formData.maxMembersMode !== "unlimited") {
      const parsed =
        typeof formData.maxMembers === "number"
          ? formData.maxMembers
          : parseInt(formData.maxMembers, 10);

      numericMaxMembers = Number.isNaN(parsed) ? null : parsed;
    }

    // Only validate when there is a numeric value
    if (numericMaxMembers !== null && numericMaxMembers < 2) {
      newErrors.maxMembers = "Team size must be at least 2 members";
    }

    return newErrors;
  }, [formData.name, formData.description, formData.maxMembers]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    console.log("handleChange called:", { name, value, type, checked });
    let newValue = value;

    if (name === "maxMembers") {
      const parsed = parseInt(value, 10);
      newValue = Number.isNaN(parsed) ? "" : parsed;
    } else if (type === "checkbox") {
      newValue = checked;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear any existing error for the changed field
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  }, []);

  const handleTagSelection = useCallback((selectedTags) => {
    console.log("Team Creation - Tags selected:", selectedTags);
    setFormData((prev) => ({
      ...prev,
      selectedTags,
    }));
  }, []);

  const handleLocationChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => {
      const nextState = {
        ...prev,
        [name]: newValue,
      };

      // If remote turned on, clear physical fields
      if (name === "is_remote" && newValue === true) {
        nextState.postal_code = "";
        nextState.city = "";
        nextState.country = "";
      }

      return nextState;
    });

    // Clear any existing error for the changed field
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  }, []);

  // Get team initials from current name input for avatar fallback
  const getTeamInitialsFromName = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      console.log("Form validation errors:", formErrors);
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      console.log(
        "Starting team creation with image:",
        formData.teamImage ? "Image selected" : "No image",
      );

      // Ensure tag IDs are valid integers
      const formattedTags = formData.selectedTags.map((tagId) => {
        const numericId = parseInt(tagId, 10);
        console.log(`Converting tag ID ${tagId} to numeric: ${numericId}`);
        return { tag_id: numericId };
      });

      // Create the team data object
      console.log("TeamCreationForm handleSubmit formData:", formData);

      // Decide what to send based on the mode
      let maxMembersForSubmit = null;

      if (formData.maxMembersMode === "unlimited") {
        maxMembersForSubmit = null; // ✅ unlimited
      } else {
        const parsed =
          typeof formData.maxMembers === "number"
            ? formData.maxMembers
            : parseInt(formData.maxMembers, 10);

        maxMembersForSubmit = Number.isNaN(parsed) ? 5 : parsed; // fallback just in case
      }

      console.log(
        "TeamCreationForm handleSubmit - mode:",
        formData.maxMembersMode,
      );
      console.log(
        "TeamCreationForm handleSubmit - maxMembersForSubmit:",
        maxMembersForSubmit,
      );

      console.log("formData before submission:", formData);
      console.log("Location fields:", {
        is_remote: formData.is_remote,
        postal_code: formData.postal_code,
        city: formData.city,
        country: formData.country,
      });

      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: maxMembersForSubmit,
        tags: formattedTags,
        teamavatar_url: formData.teamImage ? null : null,
        is_remote: formData.is_remote,
        postal_code: formData.is_remote ? null : formData.postal_code || null,
        city: formData.is_remote ? null : formData.city || null,
        country: formData.is_remote ? null : formData.country || null,
      };

      console.log("Initial submission data:", submissionData);

      // Upload image to Cloudinary if one is selected
      if (formData.teamImage) {
        console.log("Preparing to upload team image to Cloudinary");

        const uploadResult = await uploadToCloudinary(
          formData.teamImage,
          "teamAvatars",
        );

        if (uploadResult.success) {
          console.log("Cloudinary upload success:", uploadResult.url);
          submissionData.teamavatar_url = uploadResult.url;
          submissionData.teamavatarUrl = uploadResult.url;
          console.log("Team data with avatar URL:", submissionData);
        } else {
          console.error("Cloudinary upload failed:", uploadResult.error);
          // Continue with team creation without the avatar
        }
      }

      console.log("Final submission data before API call:", submissionData);

      const response = await teamService.createTeam(submissionData);
      console.log("Team creation response:", response);

      setNewTeamId(response.data.id);
      setSubmitSuccess(true);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Team creation error:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      console.error("Response data:", error.response?.data);

      setSubmitError(
        error.response?.data?.message ||
          error.message ||
          "Failed to create team. Please try again.",
      );
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = useCallback(() => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Create a New Team</h2>

        {/* Team Image Upload */}
        <div className="mb-6">
          <ImageUploader
            currentImage={imagePreview}
            onImageSelect={(file, previewUrl) => {
              setFormData((prev) => ({
                ...prev,
                teamImage: file,
              }));
              setImagePreview(previewUrl);
            }}
            onImageRemove={() => {
              setFormData((prev) => ({
                ...prev,
                teamImage: null,
              }));
              setImagePreview(null);
            }}
            fallbackText={getTeamInitialsFromName() || "T"}
            shape="circle"
            size="lg"
            label="Team Image (Optional)"
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="name"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Team Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.name ? "border-red-500" : ""
            }`}
            placeholder="Enter team name"
          />
          {errors.name && (
            <p className="text-red-500 text-xs italic">{errors.name}</p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.description ? "border-red-500" : ""
            }`}
            placeholder="Enter team description"
            rows="3"
          />
          {errors.description && (
            <p className="text-red-500 text-xs italic">{errors.description}</p>
          )}
        </div>

        {/* Maximum Members - Preset / Custom / Unlimited */}
        <div className="mb-4">
          <label
            htmlFor="maxMembers"
            className="block text-gray-700 text-sm font-bold mb-2"
          >
            Maximum Members
          </label>

          {/* Mode buttons */}
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  maxMembersMode: "preset",
                  maxMembers: 5,
                }))
              }
              className={`btn btn-sm ${
                formData.maxMembersMode === "preset"
                  ? "btn-primary"
                  : "btn-outline"
              }`}
            >
              Preset
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  maxMembersMode: "custom",
                  maxMembers:
                    prev.maxMembers && prev.maxMembers !== null
                      ? prev.maxMembers
                      : 25,
                }))
              }
              className={`btn btn-sm ${
                formData.maxMembersMode === "custom"
                  ? "btn-primary"
                  : "btn-outline"
              }`}
            >
              Custom
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  maxMembersMode: "unlimited",
                  maxMembers: null,
                }))
              }
              className={`btn btn-sm ${
                formData.maxMembersMode === "unlimited"
                  ? "btn-primary"
                  : "btn-outline"
              }`}
            >
              {/* Infinity icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z" />
              </svg>
              Unlimited
            </button>
          </div>

          {/* Preset dropdown */}
          {formData.maxMembersMode === "preset" && (
            <select
              id="maxMembers"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.maxMembers ? "border-red-500" : ""
              }`}
            >
              {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((size) => (
                <option key={size} value={size}>
                  {size} members
                </option>
              ))}
            </select>
          )}

          {/* Custom input */}
          {formData.maxMembersMode === "custom" && (
            <input
              type="number"
              id="maxMembers"
              name="maxMembers"
              value={formData.maxMembers ?? ""}
              onChange={handleChange}
              min="2"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.maxMembers ? "border-red-500" : ""
              }`}
              placeholder="Enter custom number (min. 2)"
            />
          )}

          {/* Unlimited display */}
          {formData.maxMembersMode === "unlimited" && (
            <div className="shadow border rounded w-full py-2 px-3 bg-gray-50 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z" />
              </svg>
              <span className="text-gray-700">No member limit</span>
            </div>
          )}

          {errors.maxMembers && (
            <p className="text-red-500 text-xs italic mt-1">
              {errors.maxMembers}
            </p>
          )}
        </div>

        <div className="mb-4">
          {/* IconToggle switch to choose visibility */}
          <IconToggle
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
            title="Team Visibility"
            entityType="team"
            className="toggle-visibility"
          />
        </div>

        <LocationInput
          formData={formData}
          onChange={handleLocationChange}
          errors={errors}
          disabled={isSubmitting}
          showRemoteToggle={true}
        />

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Team Focus Areas (Optional)
          </label>
          <TagInputV2
            selectedTags={formData.selectedTags}
            onTagsChange={handleTagSelection}
            placeholder="Type to search tags..."
            showPopularTags={true}
            maxSuggestions={8}
          />
        </div>
      </div>
    );
  }, [formData, errors, handleTagSelection, handleChange, imagePreview]);

  return (
    <div className="max-w-xl mx-auto p-4 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Create a New Team</h1>
      {submitError && (
        <Alert
          type="error"
          message={submitError}
          onClose={() => setSubmitError(null)}
          className="mb-4"
        />
      )}
      <form onSubmit={handleSubmit}>
        {renderStepContent()}
        <button
          type="submit"
          className="btn btn-primary ml-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Team"}
        </button>
      </form>

      {submitSuccess && (
        <div className="text-center mt-6">
          <FiCheck className="mx-auto mb-4 text-green-500 text-4xl" />
          <p className="mb-4 font-semibold">Team created successfully!</p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
            >
              Edit Team
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <TeamDetailsModal
          isOpen={isModalOpen}
          teamId={newTeamId}
          onClose={() => {
            setIsModalOpen(false);
            navigate("/teams/my-teams");
          }}
        />
      )}
    </div>
  );
};

export default TeamCreationForm;
