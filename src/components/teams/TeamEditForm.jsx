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
  isCreator = false,
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