import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import LocationInput from "../common/LocationInput";
import LocationModeToggle from "../common/LocationModeToggle";
import FormSectionDivider from "../common/FormSectionDivider";
import TagInput from "../tags/TagInput";
import BadgeInput from "../badges/BadgeInput";
import Tooltip from "../common/Tooltip";
import { vacantRoleService } from "../../services/vacantRoleService";
import { formatDistanceKm } from "../../utils/locationUtils";
import {
  useLocationAutoFill,
  describeLocationBlock,
} from "../../hooks/useLocationAutoFill";
import {
  UserSearch,
  SquarePen,
  MapPin,
  Tag,
  Award,
  Ruler,
  Trash2,
  Save,
  X,
} from "lucide-react";

/**
 * The role name a new role starts with, and is SAVED WITH if the user does not
 * overwrite it (`role_name` in the submit payload). It is stored data, not
 * display text, so it stays English in every language - otherwise the name in
 * the database would depend on the creator's language and every other viewer
 * would be stuck with it. The *display* fallback for a role with no name is a
 * separate, translated thing: `common:roleStatus.vacantRoleFallback`.
 *
 * Referenced by the focus handler below, which selects the field only while it
 * still holds this untouched default. Never compare against translated text.
 */
const DEFAULT_ROLE_NAME = "Vacant Role"; // i18n-ignore

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
  onDelete,
}) => {
  const { t } = useTranslation("teams");
  const SUCCESS_CLOSE_DELAY_MS = 3000;
  const isEditMode = !!existingRole;

  // Form state
  const [formData, setFormData] = useState({
    roleName: DEFAULT_ROLE_NAME,
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


  // Location auto-fill
  const {
    getSuggestedUpdates,
    markFieldAsEdited,
    locationMismatch,
  } = useLocationAutoFill({
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
        roleName:
          existingRole.roleName ?? existingRole.role_name ?? DEFAULT_ROLE_NAME,
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
        roleName: DEFAULT_ROLE_NAME,
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
  }, [isOpen, isEditMode, existingRole]);

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

  const handleBadgeIdsChange = useCallback((ids) => {
    setFormData((prev) => ({ ...prev, selectedBadgeIds: ids }));
  }, []);

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.roleName || !formData.roleName.trim()) {
      errors.roleName = t("vacantRoleForm.validation.nameRequired");
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

    // The location fields disagree, or one of them could not be confirmed. What
    // that means per case - which value goes, what the user is told - lives in
    // describeLocationBlock so the five forms cannot drift apart.
    if (locationMismatch?.blocksSubmit) {
      const { clearField, message } = describeLocationBlock(locationMismatch);

      if (clearField) {
        setFormData((prev) => ({ ...prev, [clearField]: "" }));
      }

      setSubmitError(message);
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
        district: formData.isRemote ? null : formData.district || null,
        country: formData.isRemote ? null : formData.country || null,
        max_distance_km: formData.isRemote
          ? null
          : parseInt(formData.maxDistanceKm, 10) || null,
        tag_ids: formData.selectedTags,
        badge_ids: formData.selectedBadgeIds,
      };

      if (isEditMode) {
        await vacantRoleService.updateVacantRole(teamId, existingRole.id, payload);
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
        err.response?.data?.message || t("vacantRoleForm.saveFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  // Custom header
  const editModalTitle = (() => {
    const status = String(existingRole?.status ?? "").toLowerCase();
    if (status === "filled") return t("vacantRoleForm.editTitleFilled");
    if (status === "closed") return t("vacantRoleForm.editTitleClosed");
    return t("vacantRoleForm.editTitleVacant");
  })();

  const customHeader = (
    <h2 className="text-xl font-medium text-primary leading-[110%] flex items-center gap-2">
      {isEditMode
        ? <SquarePen className="flex-shrink-0" size={20} />
        : <UserSearch className="flex-shrink-0" size={20} />}
      {isEditMode ? editModalTitle : t("vacantRoleForm.createTitle")}
    </h2>
  );

  // Footer
  const footer = !submitSuccess ? (
    <div className="flex items-center justify-between">
      {isEditMode && onDelete ? (
        <Tooltip
          content={t("vacantRoleForm.deleteTooltip")}
          position="top"
        >
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={loading}
            icon={<Trash2 size={16} />}
            className="hover:bg-red-600 hover:text-white"
          >
            {t("teamForm.delete")}
          </Button>
        </Tooltip>
      ) : <div />}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading} icon={<X size={16} />}>
          {t("teamForm.cancel")}
        </Button>
        <Tooltip content={t("vacantRoleForm.saveTooltip")} position="top">
          <Button variant="primary" onClick={handleSubmit} disabled={loading} icon={<Save size={16} />}>
            {loading ? t("teamForm.saving") : t("teamForm.save")}
          </Button>
        </Tooltip>
      </div>
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
                ? t("vacantRoleForm.updated")
                : t("vacantRoleForm.created")
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
              <FormSectionDivider
                text={t("vacantRoleForm.sectionDetails")}
                icon={UserSearch}
              />

              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    {t("vacantRoleForm.nameLabel")}{" "}
                    <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  name="roleName"
                  value={formData.roleName}
                  onChange={handleChange}
                  onFocus={(e) => {
                    if (e.target.value === DEFAULT_ROLE_NAME) {
                      e.target.select();
                    }
                  }}
                  placeholder={t("vacantRoleForm.namePlaceholder")}
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
                  <span className="label-text">
                    {t("vacantRoleForm.descriptionLabel")}
                  </span>
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder={t("vacantRoleForm.descriptionPlaceholder")}
                  className="textarea textarea-bordered w-full h-24"
                  disabled={loading}
                />
              </div>
            </section>

            {/* Location */}
            <section className="mt-8 space-y-4">
              <FormSectionDivider
                text={t("vacantRoleForm.sectionLocation")}
                icon={MapPin}
              />

              <LocationModeToggle
                name="has_location"
                checked={!formData.isRemote}
                label={t("vacantRoleForm.sectionLocation")}
                locationLabel={t("vacantRoleForm.locationHasLabel")}
                remoteLabel={t("vacantRoleForm.locationRemoteLabel")}
                locationHelper={t("vacantRoleForm.locationHelper")}
                remoteHelper={t("vacantRoleForm.remoteHelper")}
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
                    onFieldEdited={markFieldAsEdited}
                    mismatch={locationMismatch}
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
                          {formatDistanceKm(dist)}
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
                        placeholder={t("teamForm.custom")}
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
              <FormSectionDivider
                text={t("vacantRoleForm.sectionFocusAreas")}
                icon={Tag}
              />

              <div className="form-control">
                <label className="label whitespace-normal">
                  <span className="label-text">
                    {t("vacantRoleForm.focusAreasPrompt")}
                  </span>
                </label>
                <TagInput
                  selectedTags={formData.selectedTags}
                  onTagsChange={handleTagSelection}
                  showPopularTags={true}
                  maxSuggestions={8}
                />
              </div>
            </section>

            {/* Desired Badges */}
            <section className="mt-8 space-y-4">
              <FormSectionDivider
                text={t("vacantRoleForm.sectionBadges")}
                icon={Award}
              />

              <div className="form-control">
                <label className="label whitespace-normal">
                  <span className="label-text">
                    {t("vacantRoleForm.badgesPrompt")}
                  </span>
                </label>
                <BadgeInput
                  selectedBadgeIds={formData.selectedBadgeIds}
                  onBadgeIdsChange={handleBadgeIdsChange}
                />
              </div>
            </section>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CreateVacantRoleModal;
