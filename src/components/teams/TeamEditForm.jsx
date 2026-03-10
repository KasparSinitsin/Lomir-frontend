import React, { useState, useCallback, useEffect, useMemo } from "react";
import Button from "../common/Button";
import VisibilityToggle from "../common/VisibilityToggle";
import LocationModeToggle from "../common/LocationModeToggle";
import FormSectionDivider from "../common/FormSectionDivider";
import { getTeamInitials } from "../../utils/userHelpers";
import { teamService } from "../../services/teamService";
import ImageUploader from "../common/ImageUploader";
import LocationInput from "../common/LocationInput";
import TagInput from "../tags/TagInput";
import { UI_TEXT } from "../../constants/uiText";
import { useLocationAutoFill } from "../../hooks/useLocationAutoFill";
import { Camera, Users, Settings, Tag } from "lucide-react";

const PRESET_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
const UNLIMITED_VALUE = null;

const InfinityIcon = ({ className = "h-4 w-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z" />
  </svg>
);

/**
 * TeamEditForm Component
 * Handles the editing interface for team details
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
  onAvatarDeleted,
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [avatarDeleteLoading, setAvatarDeleteLoading] = useState(false);

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
  }, [getSuggestedUpdates, formData.isRemote, setFormData]);

  // Handle regular form field changes
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;

      // Special handling for isPublic to ensure it's always a boolean
      if (name === "isPublic") {
        setFormData((prev) => ({
          ...prev,
          isPublic: checked,
        }));
        return;
      }

      const newValue = type === "checkbox" ? checked : value;

      // Clear error for this field when user starts typing
      if (formErrors[name]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }

      setFormData((prev) => ({
        ...prev,
        [name]:
          name === "maxMembers" ? parseInt(newValue, 10) || newValue : newValue,
      }));
    },
    [formErrors, setFormData, setFormErrors],
  );

  // Handle location changes (snake_case emitted by LocationInput)
  const handleLocationChange = useCallback(
    (e) => {
      const { name, value, checked } = e.target;

      const map = {
        is_remote: "isRemote",
        postal_code: "postalCode",
        city: "city",
        state: "state",
        country: "country",
      };

      const mappedKey = map[name] || name;
      const newValue = name === "is_remote" ? Boolean(checked) : value;

      // Clear errors for these fields if present
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

        // If remote turned on, clear physical fields in the form state
        if (mappedKey === "isRemote" && newValue === true) {
          nextState.postalCode = "";
          nextState.city = "";
          nextState.state = "";
          nextState.country = "";
        }

        return nextState;
      });
    },
    [formErrors, setFormData, setFormErrors],
  );

  // Handle tag selection
  const handleTagSelection = useCallback(
    (selected) => {
      const ids = (selected ?? [])
        .map((t) => (typeof t === "object" ? (t.id ?? t.value ?? t) : t))
        .map((x) => (x === "" || x == null ? null : String(x)))
        .filter((x) => typeof x === "string" && x.length > 0);

      const deduped = Array.from(new Set(ids));

      setFormData((prev) => ({
        ...prev,
        selectedTags: deduped,
      }));
    },
    [setFormData],
  );

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  // Handle avatar deletion
  const handleAvatarDelete = async () => {
    if (!team?.id) return;

    if (!window.confirm("Are you sure you want to remove the team picture?")) {
      return;
    }

    try {
      setAvatarDeleteLoading(true);
      const response = await teamService.deleteTeamAvatar(team.id);

      if (response.success) {
        setFormData((prev) => ({
          ...prev,
          teamavatarUrl: null,
          teamavatarFile: null,
        }));

        onAvatarDeleted?.();
      }
    } catch (error) {
      console.error("Error deleting team avatar:", error);
      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove team picture. Please try again.",
      );
    } finally {
      setAvatarDeleteLoading(false);
    }
  };

  // Build display objects for TagInput so preselected IDs render with names
  const selectedFocusAreaTags = useMemo(() => {
    const teamTags = Array.isArray(team?.tags) ? team.tags : [];

    // Build id -> name map from the team payload
    const nameById = new Map(
      teamTags
        .map((t) => {
          const id = Number(t?.id ?? t?.tag_id ?? t?.tagId ?? t?.tagID);
          const name = t?.name ?? t?.label ?? t?.category;
          return Number.isFinite(id) && id > 0 ? [id, name] : null;
        })
        .filter(Boolean),
    );

    return (formData.selectedTags ?? [])
      .map((t) => {
        // If we already have an object, keep it
        if (t && typeof t === "object") {
          const id = Number(t.id ?? t.tag_id ?? t.tagId ?? t.tagID ?? t.value);
          const name = t.name ?? t.label ?? t.category;
          return Number.isFinite(id) && id > 0 ? { id, name } : null;
        }

        // Otherwise treat it as an ID
        const id = Number(t);
        if (!Number.isFinite(id) || id <= 0) return null;

        const name = nameById.get(id);
        return { id, name: name || `Focus Area ${id}` };
      })
      .filter(Boolean);
  }, [formData.selectedTags, team?.tags]);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      {/* Team Avatar Section */}
      <section className="space-y-4">
        <FormSectionDivider text="Team Avatar" icon={Camera} />

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <ImageUploader
              currentImage={
                formData.teamavatarUrl ||
                team?.teamavatar_url ||
                team?.teamavatarUrl
              }
              onImageSelect={(file, previewUrl) => {
                setFormData((prev) => ({
                  ...prev,
                  teamavatarFile: file,
                  teamavatarUrl: previewUrl,
                }));
              }}
              onImageRemove={handleAvatarDelete}
              fallbackText={getTeamInitials(team)}
              shape="circle"
              size="mdPlus"
              disabled={loading || uploadingImage}
              loading={avatarDeleteLoading}
              showRemoveButton={
                !!(
                  formData.teamavatarUrl ||
                  team?.teamavatar_url ||
                  team?.teamavatarUrl
                ) && !formData.teamavatarFile
              }
              removeButtonText="Remove Team Picture"
            />
          </div>
        </div>
      </section>

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

      {/* Team Settings Section */}
      <section className="space-y-4 mt-12">
        <FormSectionDivider text="Team Settings" icon={Settings} />

        {/* Team Visibility Toggle */}
        <div className="form-control">
          <VisibilityToggle
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
            label="Team Visibility"
            entityType="team"
            visibleLabel="Public Team"
            hiddenLabel="Private Team"
          />
        </div>

        {/* Maximum Members */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Maximum Members *</span>
          </label>

          {/* One row: buttons (left) + value input (right) */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className={`btn btn-sm ${
                  formData.maxMembersMode === "preset"
                    ? "btn-primary"
                    : "btn-outline"
                }`}
                onClick={() => {
                  setFormData((prev) => {
                    const current = Number(prev.maxMembers);
                    const nextMax = PRESET_OPTIONS.includes(current)
                      ? current
                      : PRESET_OPTIONS[0];
                    return {
                      ...prev,
                      maxMembersMode: "preset",
                      maxMembers: nextMax,
                    };
                  });
                }}
                disabled={loading}
              >
                Preset
              </button>

              <button
                type="button"
                className={`btn btn-sm ${
                  formData.maxMembersMode === "custom"
                    ? "btn-primary"
                    : "btn-outline"
                }`}
                onClick={() => {
                  setFormData((prev) => {
                    const current = Number(prev.maxMembers);
                    const nextMax =
                      !Number.isNaN(current) && current >= 2 ? current : 25;
                    return {
                      ...prev,
                      maxMembersMode: "custom",
                      maxMembers: nextMax,
                    };
                  });
                }}
                disabled={loading}
              >
                Custom
              </button>

              <button
                type="button"
                className={`btn btn-sm ${
                  formData.maxMembersMode === "unlimited"
                    ? "btn-primary"
                    : "btn-outline"
                }`}
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    maxMembersMode: "unlimited",
                    maxMembers: UNLIMITED_VALUE,
                  }));
                }}
                disabled={loading}
              >
                <InfinityIcon className="h-4 w-4 mr-1" />
                Unlimited
              </button>
            </div>

            {/* Selector/Input (responsive) */}
            <div className="w-full sm:flex-1 sm:min-w-[180px]">
              {formData.maxMembersMode === "preset" && (
                <select
                  name="maxMembers"
                  className="select select-bordered w-full"
                  value={
                    PRESET_OPTIONS.includes(Number(formData.maxMembers))
                      ? Number(formData.maxMembers)
                      : PRESET_OPTIONS[0]
                  }
                  onChange={handleChange}
                  disabled={loading}
                >
                  {PRESET_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} members
                    </option>
                  ))}
                </select>
              )}

              {formData.maxMembersMode === "custom" && (
                <input
                  name="maxMembers"
                  type="number"
                  min={2}
                  className="input input-bordered w-full"
                  value={formData.maxMembers ?? ""}
                  onChange={handleChange}
                  placeholder="min. 2"
                  disabled={loading}
                />
              )}

              {formData.maxMembersMode === "unlimited" && (
                <div className="input input-bordered w-full flex items-center gap-2 opacity-70">
                  <InfinityIcon className="h-4 w-4" />
                  <span>No member limit</span>
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
          </div>
        </div>
      </section>

      {/* Location Section (Create-Team consistent) */}
      <section className="mt-12 space-y-4">
        <FormSectionDivider text="Location" icon={Settings} />

        {/* Location Mode Toggle */}
        {/* Location Mode Toggle */}
        <div className="form-control">
          <LocationModeToggle
            name="has_location"
            checked={!formData.isRemote} // ✅ ON = team with location
            onChange={(e) => {
              const hasLocation = Boolean(e.target.checked);

              // We store isRemote in state -> inverse of hasLocation
              const nextIsRemote = !hasLocation;

              // Reuse your existing handler shape (snake_case)
              handleLocationChange({
                target: {
                  name: "is_remote",
                  checked: nextIsRemote,
                  value: nextIsRemote,
                  type: "checkbox",
                },
              });
            }}
            label="Team Location"
            locationLabel="This is a team with a location"
            remoteLabel="This is a remote team"
            locationDescription="Provide location information for your team. This information is optional."
            remoteDescription="Remote teams don't have a physical meeting location."
          />
        </div>

        {!formData.isRemote && (
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
            showRemoteToggle={false} // toggle is handled above
            showDivider={false} // section already has divider
          />
        )}
      </section>

      {/* Focus Areas Section */}
      <section className="mt-12 space-y-4">
        <FormSectionDivider text="Focus Areas" icon={Tag} />

        <div className="form-control">
          <label className="label">
            <span className="label-text">
              What does this team focus on? (Optional)
            </span>
          </label>
          <TagInput
            // Pass objects so TagInput can render names for preselected tags
            selectedTags={formData.selectedTags ?? []}
            onTagsChange={handleTagSelection}
            placeholder={UI_TEXT.focusAreas.searchPlaceholder}
            showPopularTags={true}
            maxSuggestions={8}
          />
        </div>
      </section>

      {/* More whitespace above the last divider (as in Create Team) */}
      <div className="pt-5">
        <div className="divider my-6"></div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
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
