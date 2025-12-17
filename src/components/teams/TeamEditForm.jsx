import React, { useState, useCallback } from "react";
import Button from "../common/Button";
import IconToggle from "../common/IconToggle";
import axios from "axios";

/**
 * TeamEditForm Component
 * Handles the editing interface for team details
 * Extracted from TeamDetailsModal to improve code organization
 */
const TeamEditForm = ({
  team,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  onSubmit,
  onCancel,
  loading = false,
  isOwner = false,
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);

  // Handle regular form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Special handling for isPublic to ensure it's always a boolean
    if (name === "isPublic") {
      setFormData((prev) => ({
        ...prev,
        isPublic: checked,
      }));
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

  // Handle tag selection - PROPERLY MEMOIZED
  const handleTagSelection = useCallback((selected) => {
    // akzeptiert: [number|string|object], z.B. { id, value }
    const ids = (selected ?? [])
      .map((t) => (typeof t === "object" ? t.id ?? t.value ?? t : t))
      .map((x) =>
        x === "" || x === null || x === undefined ? null : Number(x)
      )
      .filter((x) => Number.isFinite(x)); // <- NaN, null etc. raus

    const deduped = Array.from(new Set(ids));

    setFormData((prev) => ({
      ...prev,
      selectedTags: deduped,
    }));
  }, []); // Empty dependency array - only created once

  // Handle avatar file selection
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Get team initials from name (e.g., "Urban Gardeners Berlin" → "UGB")
    const getTeamInitials = () => {
      const name = formData.name;
      if (!name || typeof name !== "string") return "?";

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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    setFormData((prev) => ({
      ...prev,
      teamavatarFile: file,
      teamavatarUrl: previewUrl, // Show preview
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Team Avatar */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Team Avatar</span>
        </label>
        <div className="flex items-center space-x-4">
          {/* Avatar Preview */}
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-16 h-16 flex items-center justify-center">
              {formData.teamavatarUrl ? (
                <img
                  src={formData.teamavatarUrl}
                  alt="Team Preview"
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                <span className="text-xl">{getTeamInitials()}</span>
              )}
            </div>
          </div>

          {/* File Upload Input */}
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="file-input file-input-bordered file-input-sm w-full max-w-xs"
              disabled={loading || uploadingImage}
            />
            <p className="text-xs text-base-content/60 mt-1">
              Max size: 5MB. Supported: JPG, PNG, GIF
            </p>
          </div>
        </div>
      </div>

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
            <span className="label-text-alt text-error">{formErrors.name}</span>
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

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 mt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default TeamEditForm;
