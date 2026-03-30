import React, { useState, useCallback, useEffect } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import LocationInput from "../common/LocationInput";
import LocationModeToggle from "../common/LocationModeToggle";
import FormSectionDivider from "../common/FormSectionDivider";
import TagInput from "../tags/TagInput";
import Tooltip from "../common/Tooltip";
import { vacantRoleService } from "../../services/vacantRoleService";
import { useLocationAutoFill } from "../../hooks/useLocationAutoFill";
import { getCategoryIcon, getBadgeIcon } from "../../utils/badgeIconUtils";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  CATEGORY_SECTION_PASTELS,
} from "../../constants/badgeConstants";
import {
  UserSearch,
  MapPin,
  Tag,
  Award,
  Ruler,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../services/api";

/**
 * CreateVacantRoleModal Component
 *
 * Modal for creating or editing a vacant team role.
 * Reuses existing form components: LocationInput, LocationModeToggle, TagInput.
 * Badge selection uses a multi-select accordion similar to BadgeAwardModal.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {number} teamId
 * @param {Object|null} existingRole - If provided, modal is in edit mode
 * @param {Function} onSuccess - Called after successful create/update
 */
const CreateVacantRoleModal = ({
  isOpen,
  onClose,
  teamId,
  existingRole = null,
  onSuccess,
}) => {
  const SUCCESS_CLOSE_DELAY_MS = 3000;
  const isEditMode = !!existingRole;

  // Form state
  const [formData, setFormData] = useState({
    roleName: "Vacant Role",
    bio: "",
    isRemote: false,
    postalCode: "",
    city: "",
    state: "",
    country: "",
    maxDistanceKm: 30,
    selectedTags: [],
    selectedBadgeIds: [],
  });

  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Badge data
  const [allBadges, setAllBadges] = useState([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Location auto-fill
  const { getSuggestedUpdates } = useLocationAutoFill({
    postalCode: formData.postalCode || "",
    city: formData.city || "",
    country: formData.country || "",
    isEditing: true,
    isRemote: formData.isRemote || false,
  });

  useEffect(() => {
    if (formData.isRemote) return;
    const updates = getSuggestedUpdates();
    if (Object.keys(updates).length > 0) {
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, [getSuggestedUpdates, formData.isRemote]);

  // Reset / populate form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && existingRole) {
      setFormData({
        roleName: existingRole.roleName ?? existingRole.role_name ?? "Vacant Role",
        bio: existingRole.bio || "",
        isRemote: existingRole.isRemote ?? existingRole.is_remote ?? false,
        postalCode: existingRole.postalCode ?? existingRole.postal_code ?? "",
        city: existingRole.city || "",
        state: existingRole.state || "",
        country: existingRole.country || "",
        maxDistanceKm: existingRole.maxDistanceKm ?? existingRole.max_distance_km ?? 30,
        selectedTags: (existingRole.tags || []).map(
          (t) => t.tagId ?? t.tag_id ?? t.id
        ),
        selectedBadgeIds: (existingRole.badges || []).map(
          (b) => b.badgeId ?? b.badge_id ?? b.id
        ),
      });
    } else {
      setFormData({
        roleName: "Vacant Role",
        bio: "",
        isRemote: false,
        postalCode: "",
        city: "",
        state: "",
        country: "",
        maxDistanceKm: 30,
        selectedTags: [],
        selectedBadgeIds: [],
      });
    }

    setFormErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
    setExpandedCategory(null);
  }, [isOpen, isEditMode, existingRole]);

  // Fetch all badges once
  useEffect(() => {
    if (!isOpen || allBadges.length > 0) return;

    const fetchBadges = async () => {
      setBadgesLoading(true);
      try {
        const response = await api.get("/api/badges");
        setAllBadges(response.data?.data || response.data || []);
      } catch (err) {
        console.error("Error fetching badges:", err);
      } finally {
        setBadgesLoading(false);
      }
    };

    fetchBadges();
  }, [isOpen, allBadges.length]);

  // Group badges by category
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    const cat = badge.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(badge);
    return acc;
  }, {});

  const sortedCategories = Object.keys(badgesByCategory).sort();

  // Handlers
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      if (formErrors[name]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [formErrors]
  );

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

      if (formErrors[mappedKey] || formErrors[name]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[mappedKey];
          delete next[name];
          return next;
        });
      }

      setFormData((prev) => {
        const nextState = { ...prev, [mappedKey]: newValue };
        if (mappedKey === "isRemote" && newValue === true) {
          nextState.postalCode = "";
          nextState.city = "";
          nextState.state = "";
          nextState.country = "";
        }
        return nextState;
      });
    },
    [formErrors]
  );

  const handleTagSelection = useCallback((selected) => {
    const ids = (selected ?? [])
      .map((t) => (typeof t === "object" ? (t.id ?? t.value ?? t) : t))
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    setFormData((prev) => ({
      ...prev,
      selectedTags: Array.from(new Set(ids)),
    }));
  }, []);

  const handleBadgeToggle = useCallback((badgeId) => {
    setFormData((prev) => {
      const ids = prev.selectedBadgeIds.includes(badgeId)
        ? prev.selectedBadgeIds.filter((id) => id !== badgeId)
        : [...prev.selectedBadgeIds, badgeId];
      return { ...prev, selectedBadgeIds: ids };
    });
  }, []);

  const handleCategoryToggle = (category) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.roleName || !formData.roleName.trim()) {
      errors.roleName = "Role name is required";
    }
    return errors;
  };

  // Submit
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
      const payload = {
        role_name: formData.roleName.trim(),
        bio: formData.bio.trim() || null,
        is_remote: formData.isRemote,
        postal_code: formData.isRemote ? null : formData.postalCode || null,
        city: formData.isRemote ? null : formData.city || null,
        state: formData.isRemote ? null : formData.state || null,
        country: formData.isRemote ? null : formData.country || null,
        max_distance_km: formData.isRemote
          ? null
          : parseInt(formData.maxDistanceKm, 10) || null,
        tag_ids: formData.selectedTags,
        badge_ids: formData.selectedBadgeIds,
      };

      if (isEditMode) {
        await vacantRoleService.updateVacantRole(
          teamId,
          existingRole.id,
          payload
        );
      } else {
        await vacantRoleService.createVacantRole(teamId, payload);
      }

      setSubmitSuccess(true);

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, SUCCESS_CLOSE_DELAY_MS);
    } catch (err) {
      console.error("Error saving vacant role:", err);
      setSubmitError(
        err.response?.data?.message || "Failed to save vacant role"
      );
    } finally {
      setLoading(false);
    }
  };

  // Custom header
  const customHeader = (
    <div className="flex items-center gap-2">
      <UserSearch className="text-orange-500" size={22} />
      <h2 className="text-lg font-medium">
        {isEditMode ? "Edit Vacant Role" : "Add Vacant Role"}
      </h2>
    </div>
  );

  // Footer
  const footer = !submitSuccess ? (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={loading}>
        {loading
          ? "Saving..."
          : isEditMode
            ? "Save Changes"
            : "Create Role"}
      </Button>
    </div>
  ) : undefined;

  // Distance preset options
  const DISTANCE_OPTIONS = [10, 20, 30, 50, 100];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      footer={footer}
      size="md"
    >
      <div className="space-y-4">
        {/* Success message */}
        {submitSuccess && (
          <Alert
            type="success"
            message={
              isEditMode
                ? "Vacant role updated successfully!"
                : "Vacant role created. Start building your team by looking for a good match now."
            }
          />
        )}

        {/* Error message */}
        {submitError && (
          <Alert type="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}

        {!submitSuccess && (
          <form onSubmit={handleSubmit} className="space-y-1">
            {/* Role Name */}
            <section className="space-y-4">
              <FormSectionDivider text="Role Details" icon={UserSearch} />

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    Role Name <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="roleName"
                  value={formData.roleName}
                  onChange={handleChange}
                  onFocus={(e) => {
                    if (e.target.value === "Vacant Role") {
                      e.target.select();
                    }
                  }}
                  placeholder="e.g. Drummer, Frontend Dev, Designer"
                  className={`input input-bordered w-full ${
                    formErrors.roleName ? "input-error" : ""
                  }`}
                  disabled={loading}
                />
                {formErrors.roleName && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {formErrors.roleName}
                    </span>
                  </label>
                )}
              </div>

              {/* Bio */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description (Optional)</span>
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Describe what you're looking for in this role..."
                  className="textarea textarea-bordered w-full h-24"
                  disabled={loading}
                />
              </div>
            </section>

            {/* Location */}
            <section className="mt-8 space-y-4">
              <FormSectionDivider text="Location Preference" icon={MapPin} />

              <LocationModeToggle
                name="has_location"
                checked={!formData.isRemote}
                label="Location Preference"
                locationLabel="Has Location Preference"
                remoteLabel="Open to Remote / Anywhere"
                locationHelper="Specify a preferred location and search radius."
                remoteHelper="No geographic preference for this role."
                onChange={(e) => {
                  const hasLocation = e.target.checked;
                  setFormData((prev) => {
                    const next = { ...prev, isRemote: !hasLocation };
                    if (!hasLocation) {
                      next.postalCode = "";
                      next.city = "";
                      next.country = "";
                    }
                    return next;
                  });
                }}
              />

              {!formData.isRemote && (
                <>
                  <LocationInput
                    formData={{
                      is_remote: false,
                      postal_code: formData.postalCode ?? "",
                      city: formData.city ?? "",
                      country: formData.country ?? "",
                    }}
                    onChange={handleLocationChange}
                    errors={{
                      postal_code:
                        formErrors.postalCode || formErrors.postal_code,
                      city: formErrors.city,
                      country: formErrors.country,
                    }}
                    disabled={loading}
                    showRemoteToggle={false}
                    showDivider={false}
                  />

                  {/* Max distance */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1">
                        <Ruler size={14} />
                        Maximum Distance (km)
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DISTANCE_OPTIONS.map((dist) => (
                        <button
                          key={dist}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              maxDistanceKm: dist,
                            }))
                          }
                          className={`btn btn-sm ${
                            formData.maxDistanceKm === dist
                              ? "btn-primary"
                              : "btn-outline"
                          }`}
                          disabled={loading}
                        >
                          {dist} km
                        </button>
                      ))}
                      <input
                        type="number"
                        value={formData.maxDistanceKm}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxDistanceKm: parseInt(e.target.value, 10) || "",
                          }))
                        }
                        className="input input-bordered input-sm w-24"
                        placeholder="Custom"
                        min={1}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Focus Areas (Tags) */}
            <section className="mt-8 space-y-4">
              <FormSectionDivider text="Desired Focus Areas" icon={Tag} />

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    What skills or focus areas should this person have?
                    (Optional)
                  </span>
                </label>
                <TagInput
                  selectedTags={formData.selectedTags}
                  onTagsChange={handleTagSelection}
                  placeholder="Search for focus areas..."
                  showPopularTags={true}
                  maxSuggestions={8}
                />
              </div>
            </section>

            {/* Desired Badges */}
            <section className="mt-8 space-y-4">
              <FormSectionDivider text="Desired Badges" icon={Award} />

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    What qualities or badges should this person have? (Optional)
                  </span>
                </label>

                {/* Selected badges summary */}
                {formData.selectedBadgeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {formData.selectedBadgeIds.map((badgeId) => {
                      const badge = allBadges.find((b) => b.id === badgeId);
                      if (!badge) return null;
                      const color =
                        CATEGORY_COLORS[badge.category] || DEFAULT_COLOR;
                      return (
                        <span
                          key={badgeId}
                          className="badge badge-outline p-2 cursor-pointer hover:opacity-70"
                          style={{ borderColor: color, color }}
                          onClick={() => handleBadgeToggle(badgeId)}
                          title="Click to remove"
                        >
                          {badge.name} ×
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Badge category accordion */}
                {badgesLoading ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm text-primary"></span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sortedCategories.map((category) => {
                      const color =
                        CATEGORY_COLORS[category] || DEFAULT_COLOR;
                      const pastel =
                        CATEGORY_SECTION_PASTELS[category] || "#F3F4F6";
                      const isExpanded = expandedCategory === category;
                      const categoryBadges =
                        badgesByCategory[category] || [];
                      const selectedInCategory = categoryBadges.filter((b) =>
                        formData.selectedBadgeIds.includes(b.id)
                      );

                      return (
                        <div
                          key={category}
                          className="rounded-xl overflow-hidden border border-base-200"
                          style={
                            selectedInCategory.length > 0
                              ? { borderColor: color, borderWidth: 2 }
                              : {}
                          }
                        >
                          {/* Category header */}
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(category)}
                            className="w-full flex items-center justify-between p-3 hover:bg-base-200/30 transition-colors"
                            style={{ backgroundColor: pastel }}
                          >
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(category, color)}
                              <span
                                className="font-medium text-sm"
                                style={{ color }}
                              >
                                {category}
                              </span>
                              {selectedInCategory.length > 0 &&
                                !isExpanded && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full text-white"
                                    style={{ backgroundColor: color }}
                                  >
                                    {selectedInCategory.length} selected
                                  </span>
                                )}
                            </div>
                            {isExpanded ? (
                              <ChevronUp
                                size={16}
                                className="text-base-content/50"
                              />
                            ) : (
                              <ChevronDown
                                size={16}
                                className="text-base-content/50"
                              />
                            )}
                          </button>

                          {/* Badge list (multi-select) */}
                          {isExpanded && (
                            <div
                              className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2"
                              style={{ backgroundColor: pastel }}
                            >
                              {categoryBadges.map((badge) => {
                                const isSelected =
                                  formData.selectedBadgeIds.includes(badge.id);

                                return (
                                  <button
                                    key={badge.id}
                                    type="button"
                                    onClick={() =>
                                      handleBadgeToggle(badge.id)
                                    }
                                    className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all duration-200 ${
                                      isSelected
                                        ? "bg-white shadow-md ring-2"
                                        : "bg-white/60 hover:bg-white/80"
                                    }`}
                                    style={
                                      isSelected
                                        ? {
                                            "--tw-ring-color": color,
                                          }
                                        : undefined
                                    }
                                  >
                                    <span style={{ color }}>
                                      {getBadgeIcon(badge.name, color)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p
                                        className="text-sm font-medium truncate"
                                        style={
                                          isSelected ? { color } : {}
                                        }
                                      >
                                        {badge.name}
                                      </p>
                                      <p className="text-xs text-base-content/60 line-clamp-1">
                                        {badge.description}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                      >
                                        <svg
                                          width="12"
                                          height="12"
                                          viewBox="0 0 12 12"
                                          fill="none"
                                        >
                                          <path
                                            d="M2 6L5 9L10 3"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CreateVacantRoleModal;
