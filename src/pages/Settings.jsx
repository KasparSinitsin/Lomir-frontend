import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";
import FormSectionDivider from "../components/common/FormSectionDivider";
import VisibilityToggle from "../components/common/VisibilityToggle";
import Modal from "../components/common/Modal";
import { userService } from "../services/userService";
import { teamService } from "../services/teamService";
import { AlertTriangle, Eye, KeyRound, Shield, Trash2, Users } from "lucide-react";

const DELETE_STEP_PASSWORD = "password";
const DELETE_STEP_SUMMARY = "summary";
const DELETE_STEP_EXECUTING = "executing";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const firstNonEmptyString = (...values) => {
  const match = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return match?.trim() || null;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const toNumber = (...values) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const sameId = (left, right) =>
  left !== undefined &&
  left !== null &&
  right !== undefined &&
  right !== null &&
  String(left) === String(right);

const formatRoleLabel = (role) => {
  if (!role) return "Member";

  return String(role)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getDisplayName = (entity) => {
  if (!entity || typeof entity !== "object") {
    return "Unknown";
  }

  const directName = firstNonEmptyString(
    entity.name,
    entity.fullName,
    entity.full_name,
    entity.displayName,
    entity.display_name,
    entity.username,
  );

  if (directName) {
    return directName;
  }

  const firstName = firstNonEmptyString(entity.firstName, entity.first_name);
  const lastName = firstNonEmptyString(entity.lastName, entity.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || "Unknown";
};

const getTransferTeamId = (team) =>
  normalizeId(firstDefined(team?.teamId, team?.team_id, team?.id));

const getTransferTeamName = (team) =>
  firstNonEmptyString(team?.teamName, team?.team_name, team?.name) ||
  "Untitled team";

const getTransferTeamMemberCount = (team) =>
  toNumber(
    team?.memberCount,
    team?.member_count,
    team?.membersCount,
    team?.members_count,
    team?.currentMemberCount,
    team?.current_members_count,
    toArray(team?.members).length,
    toArray(team?.teamMembers).length,
    toArray(team?.team_members).length,
  );

const getDefaultSuccessor = (team) => {
  const nestedSuccessor =
    firstDefined(
      team?.defaultSuccessor,
      team?.default_successor,
      team?.successor,
      team?.selectedSuccessor,
      team?.selected_successor,
      team?.autoSelectedSuccessor,
      team?.auto_selected_successor,
    ) || {};

  const successorId = normalizeId(
    firstDefined(
      nestedSuccessor?.userId,
      nestedSuccessor?.user_id,
      nestedSuccessor?.id,
      team?.defaultSuccessorId,
      team?.default_successor_id,
      team?.successorId,
      team?.successor_id,
    ),
  );

  if (successorId === null) {
    return null;
  }

  return {
    id: successorId,
    name:
      (getDisplayName(nestedSuccessor) !== "Unknown" &&
        getDisplayName(nestedSuccessor)) ||
      firstNonEmptyString(
        team?.defaultSuccessorName,
        team?.default_successor_name,
        team?.successorName,
        team?.successor_name,
      ) ||
      "Unknown member",
    role:
      firstNonEmptyString(
        nestedSuccessor?.role,
        team?.defaultSuccessorRole,
        team?.default_successor_role,
        team?.successorRole,
        team?.successor_role,
      ) || "member",
  };
};

const getRoleToReopenName = (role) =>
  firstNonEmptyString(role?.roleName, role?.role_name, role?.name, role?.title) ||
  "Untitled role";

const getRoleToReopenTeamName = (role) =>
  firstNonEmptyString(
    role?.teamName,
    role?.team_name,
    role?.team?.name,
    role?.team?.teamName,
    role?.team?.team_name,
  ) || "Unknown team";

const getTeamMemberId = (member) =>
  normalizeId(
    firstDefined(
      member?.userId,
      member?.user_id,
      member?.memberId,
      member?.member_id,
      member?.id,
    ),
  );

const normalizeTransferOptions = (members, currentUserId) =>
  toArray(members)
    .map((member) => {
      const memberId = getTeamMemberId(member);

      if (memberId === null || sameId(memberId, currentUserId)) {
        return null;
      }

      return {
        id: memberId,
        name: getDisplayName(member),
        role: firstNonEmptyString(member?.role, member?.memberRole) || "member",
      };
    })
    .filter(Boolean);

const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // ── Visibility ───────────────────────────────────────────────
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(
    user?.is_public ?? user?.isPublic ?? false,
  );

  const handleVisibilityChange = async (e) => {
    const newValue = e.target.checked;
    setIsPublic(newValue);
    setError(null);
    setSuccess(null);

    try {
      setVisibilityLoading(true);
      await userService.updateUser(user.id, { is_public: newValue });
      updateUser({ is_public: newValue, isPublic: newValue });
      setSuccess("Profile visibility updated");
    } catch {
      setIsPublic(!newValue); // revert on failure
      setError("Failed to update visibility. Please try again.");
    } finally {
      setVisibilityLoading(false);
    }
  };

  // ── Change Email ─────────────────────────────────────────────
  const [emailData, setEmailData] = useState({
    newEmail: "",
    currentPasswordForEmail: "",
  });
  const [emailErrors, setEmailErrors] = useState({});
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const validateEmail = () => {
    const errs = {};
    if (!emailData.newEmail) errs.newEmail = "New email is required";
    else if (!/\S+@\S+\.\S+/.test(emailData.newEmail))
      errs.newEmail = "Invalid email address";
    if (!emailData.currentPasswordForEmail)
      errs.currentPasswordForEmail = "Current password is required";
    setEmailErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setError(null);
    setSuccess(null);
    setEmailLoading(true);

    try {
      await userService.changeEmail(
        emailData.newEmail,
        emailData.currentPasswordForEmail,
      );
      updateUser({ email: emailData.newEmail });
      setSuccess("Email address updated successfully");
      setEmailData({ newEmail: "", currentPasswordForEmail: "" });
      setShowEmailForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update email");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Change Password ──────────────────────────────────────────
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const validatePassword = () => {
    const errs = {};
    if (!passwordData.currentPassword)
      errs.currentPassword = "Current password is required";
    if (!passwordData.newPassword)
      errs.newPassword = "New password is required";
    else if (passwordData.newPassword.length < 8)
      errs.newPassword = "Password must be at least 8 characters";
    else if (
      !/[A-Za-z]/.test(passwordData.newPassword) ||
      !/\d/.test(passwordData.newPassword)
    )
      errs.newPassword =
        "Password must contain at least one letter and one number";
    if (passwordData.newPassword !== passwordData.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setError(null);
    setSuccess(null);
    setPasswordLoading(true);

    try {
      await userService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );
      setSuccess("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // ── Delete Account ───────────────────────────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionStep, setDeletionStep] = useState(DELETE_STEP_PASSWORD);
  const [deletionPreviewData, setDeletionPreviewData] = useState(null);
  const [ownershipOverrides, setOwnershipOverrides] = useState(() => new Map());
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [transferOptionsByTeam, setTransferOptionsByTeam] = useState({});
  const [transferOptionsLoadingByTeam, setTransferOptionsLoadingByTeam] =
    useState({});
  const [editingTransferTeamId, setEditingTransferTeamId] = useState(null);

  // ── Shared helpers ───────────────────────────────────────────
  const inputClass = (hasError) =>
    `input input-bordered w-full ${hasError ? "input-error" : ""}`;

  const FieldError = ({ msg }) =>
    msg ? (
      <label className="label">
        <span className="label-text-alt text-error">{msg}</span>
      </label>
    ) : null;

  const resetDeleteState = () => {
    setDeletionStep(DELETE_STEP_PASSWORD);
    setDeletionPreviewData(null);
    setOwnershipOverrides(new Map());
    setDeletePassword("");
    setDeleteError(null);
    setPreviewLoading(false);
    setTransferOptionsByTeam({});
    setTransferOptionsLoadingByTeam({});
    setEditingTransferTeamId(null);
  };

  const openDeleteModal = () => {
    resetDeleteState();
    setIsDeleteModalOpen(true);
  };

  const isDeleteBusy =
    previewLoading || deletionStep === DELETE_STEP_EXECUTING;

  const closeDeleteModal = () => {
    if (isDeleteBusy) return;
    setIsDeleteModalOpen(false);
    resetDeleteState();
  };

  const transferTeams = toArray(deletionPreviewData?.teamsToTransfer);
  const teamsToDelete = toArray(deletionPreviewData?.teamsToDelete);
  const rolesToReopen = toArray(deletionPreviewData?.rolesToReopen);
  const badgeAwardsGivenCount = toNumber(
    deletionPreviewData?.counts?.badgeAwardsGiven,
  );
  const teamMembershipsCount = toNumber(
    deletionPreviewData?.counts?.teamMemberships,
  );
  const directMessagesCount = toNumber(
    deletionPreviewData?.counts?.directMessages,
  );
  const passwordFieldError =
    deletionStep === DELETE_STEP_PASSWORD && deleteError === "Incorrect password"
      ? deleteError
      : null;
  const deleteAlertError =
    deleteError && deleteError !== "Incorrect password" ? deleteError : null;

  const getTransferOptionsForTeam = (team) => {
    const teamId = getTransferTeamId(team);

    if (teamId === null) {
      return [];
    }

    if (transferOptionsByTeam[teamId]) {
      return transferOptionsByTeam[teamId];
    }

    return normalizeTransferOptions(
      firstDefined(
        team?.successorOptions,
        team?.successor_options,
        team?.members,
        team?.teamMembers,
        team?.team_members,
      ),
      user?.id,
    );
  };

  const getSelectedSuccessorForTeam = (team) => {
    const defaultSuccessor = getDefaultSuccessor(team);
    const teamId = getTransferTeamId(team);
    const overrideId =
      teamId !== null ? ownershipOverrides.get(teamId) : undefined;

    if (overrideId === undefined || overrideId === null) {
      return defaultSuccessor;
    }

    const overrideOption = getTransferOptionsForTeam(team).find((option) =>
      sameId(option.id, overrideId),
    );

    if (overrideOption) {
      return overrideOption;
    }

    if (defaultSuccessor && sameId(defaultSuccessor.id, overrideId)) {
      return defaultSuccessor;
    }

    return {
      id: overrideId,
      name: "Selected teammate",
      role: "member",
    };
  };

  const handleDeletePasswordChange = (event) => {
    setDeletePassword(event.target.value);
    if (deleteError) {
      setDeleteError(null);
    }
  };

  const handleDeletionPreview = async (event) => {
    event.preventDefault();

    if (!deletePassword.trim()) {
      setDeleteError("Password is required");
      return;
    }

    try {
      setDeleteError(null);
      setPreviewLoading(true);

      const previewResponse = await userService.deletionPreview(
        user.id,
        deletePassword,
      );

      if (previewResponse?.success === false) {
        throw new Error(
          previewResponse?.message ||
            "Failed to load account deletion summary. Please try again.",
        );
      }

      const previewPayload = previewResponse?.data ?? previewResponse;

      setDeletionPreviewData(previewPayload || {});
      setOwnershipOverrides(new Map());
      setTransferOptionsByTeam({});
      setTransferOptionsLoadingByTeam({});
      setEditingTransferTeamId(null);
      setDeletionStep(DELETE_STEP_SUMMARY);
    } catch (err) {
      if (err.response?.status === 401) {
        setDeleteError("Incorrect password");
      } else {
        setDeleteError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load account deletion summary. Please try again.",
        );
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenTransferOptions = async (team) => {
    const teamId = getTransferTeamId(team);

    if (teamId === null) {
      return;
    }

    if (sameId(editingTransferTeamId, teamId)) {
      setEditingTransferTeamId(null);
      return;
    }

    setEditingTransferTeamId(teamId);
    setDeleteError(null);

    if (transferOptionsByTeam[teamId]) {
      return;
    }

    const previewOptions = normalizeTransferOptions(
      firstDefined(
        team?.successorOptions,
        team?.successor_options,
        team?.members,
        team?.teamMembers,
        team?.team_members,
      ),
      user?.id,
    );

    if (previewOptions.length > 0) {
      setTransferOptionsByTeam((prev) => ({
        ...prev,
        [teamId]: previewOptions,
      }));
      return;
    }

    try {
      setTransferOptionsLoadingByTeam((prev) => ({
        ...prev,
        [teamId]: true,
      }));

      const teamResponse = await teamService.getTeamById(teamId);
      const teamData = teamResponse?.data ?? teamResponse;
      const options = normalizeTransferOptions(teamData?.members, user?.id);

      setTransferOptionsByTeam((prev) => ({
        ...prev,
        [teamId]: options,
      }));
    } catch (err) {
      setDeleteError(
        err.response?.data?.message ||
          "Failed to load team members. Please try again.",
      );
    } finally {
      setTransferOptionsLoadingByTeam((prev) => ({
        ...prev,
        [teamId]: false,
      }));
    }
  };

  const handleSuccessorOverrideChange = (team, nextSuccessorId) => {
    const teamId = getTransferTeamId(team);
    const defaultSuccessor = getDefaultSuccessor(team);
    const normalizedSuccessorId = normalizeId(nextSuccessorId);

    if (teamId === null || normalizedSuccessorId === null) {
      return;
    }

    setOwnershipOverrides((prev) => {
      const next = new Map(prev);

      if (defaultSuccessor && sameId(defaultSuccessor.id, normalizedSuccessorId)) {
        next.delete(teamId);
      } else {
        next.set(teamId, normalizedSuccessorId);
      }

      return next;
    });
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      setDeleteError(null);
      setDeletionStep(DELETE_STEP_EXECUTING);

      const ownershipOverridePayload = Array.from(ownershipOverrides.entries()).map(
        ([teamId, successorId]) => ({
          teamId: normalizeId(teamId),
          successorId: normalizeId(successorId),
        }),
      );

      const result = await userService.deleteUser(
        user.id,
        deletePassword,
        ownershipOverridePayload,
      );

      if (result?.success === false) {
        throw new Error(result?.message || "Failed to delete account.");
      }

      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeletionStep(DELETE_STEP_SUMMARY);
      setDeleteError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete account. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-6">
      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}
      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
      )}

      <Card className="overflow-visible">
        {/* Page Header — sits directly in Card, no extra wrapper */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h1 className="text-2xl sm:text-3xl font-medium text-primary">
            Settings
          </h1>
        </div>

        {/* Divider — cancels only the Card's own p-4 sm:p-7 */}
        <div className="border-b border-base-300 -mx-4 sm:-mx-7"></div>

        {/* All sections inside their own padded wrapper */}
        <div className="p-6 space-y-12">
          {/* ── Privacy ── */}
          <section className="space-y-4">
            <FormSectionDivider text="Privacy" icon={Eye} />
            <VisibilityToggle
              name="isPublic"
              checked={isPublic}
              onChange={handleVisibilityChange}
              label="Profile Visibility"
              entityType="profile"
              visibleLabel="Visible to Everyone"
              hiddenLabel="Private Profile"
              showDescription={true}
              disabled={visibilityLoading}
            />
          </section>

          {/* ── Account ── */}
          <section className="space-y-4">
            <FormSectionDivider text="Account" icon={KeyRound} />

            {/* Current email display */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Email Address</span>
              </label>
              <div className="input input-bordered w-full flex items-center justify-between pr-2">
                <span className="text-base-content/70">
                  {user?.email || "—"}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setShowEmailForm(!showEmailForm);
                    setEmailErrors({});
                  }}
                >
                  {showEmailForm ? "Cancel" : "Change"}
                </button>
              </div>
            </div>

            {/* Change email form */}
            {showEmailForm && (
              <form
                onSubmit={handleEmailChange}
                className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-200/40"
              >
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">New Email Address</span>
                  </label>
                  <input
                    type="email"
                    className={inputClass(emailErrors.newEmail)}
                    value={emailData.newEmail}
                    onChange={(e) =>
                      setEmailData({ ...emailData, newEmail: e.target.value })
                    }
                    placeholder="new@email.com"
                  />
                  <FieldError msg={emailErrors.newEmail} />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      Confirm with Current Password
                    </span>
                  </label>
                  <input
                    type="password"
                    className={inputClass(emailErrors.currentPasswordForEmail)}
                    value={emailData.currentPasswordForEmail}
                    onChange={(e) =>
                      setEmailData({
                        ...emailData,
                        currentPasswordForEmail: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                  />
                  <FieldError msg={emailErrors.currentPasswordForEmail} />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={emailLoading}
                  >
                    {emailLoading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Update Email"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Change password trigger */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <div className="input input-bordered w-full flex items-center justify-between pr-2">
                <span className="text-base-content/70 tracking-widest text-sm">
                  ••••••••
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm);
                    setPasswordErrors({});
                  }}
                >
                  {showPasswordForm ? "Cancel" : "Change"}
                </button>
              </div>
            </div>

            {/* Change password form */}
            {showPasswordForm && (
              <form
                onSubmit={handlePasswordChange}
                className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-200/40"
              >
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Current Password</span>
                  </label>
                  <input
                    type="password"
                    className={inputClass(passwordErrors.currentPassword)}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                  />
                  <FieldError msg={passwordErrors.currentPassword} />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">New Password</span>
                  </label>
                  <input
                    type="password"
                    className={inputClass(passwordErrors.newPassword)}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                  />
                  <FieldError msg={passwordErrors.newPassword} />
                </div>

                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Confirm New Password</span>
                  </label>
                  <input
                    type="password"
                    className={inputClass(passwordErrors.confirmPassword)}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                  />
                  <FieldError msg={passwordErrors.confirmPassword} />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </section>

          {/* ── Danger Zone ── */}
          <section className="space-y-4">
            <FormSectionDivider text="Danger Zone" icon={Trash2} />

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Delete Account</span>
              </label>
              <div className="flex items-center justify-between">
                <p className="form-helper-text">
                  Permanently delete your profile, messages, teams, and all
                  associated data. This cannot be undone.
                </p>
                <Button
                  variant="errorOutline"
                  size="sm"
                  onClick={openDeleteModal}
                  icon={<Trash2 size={16} />}
                  className="flex-shrink-0 ml-4"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </Card>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title={
            <div>
              <h2 className="text-lg font-semibold text-primary">
                Delete Account
              </h2>
              <p className="mt-1 text-sm text-base-content/60">
                {deletionStep === DELETE_STEP_PASSWORD
                  ? "Step 1 of 2: Confirm your password"
                  : deletionStep === DELETE_STEP_EXECUTING
                    ? "Deleting your account"
                    : "Step 2 of 2: Review what will change"}
              </p>
            </div>
          }
          position="center"
          size={deletionStep === DELETE_STEP_PASSWORD ? "small" : "lg"}
          maxHeight="max-h-[85vh]"
          closeOnBackdrop={!isDeleteBusy}
          closeOnEscape={!isDeleteBusy}
          showCloseButton={!isDeleteBusy}
        >
          {deletionStep === DELETE_STEP_PASSWORD ? (
            <form onSubmit={handleDeletionPreview} className="space-y-4">
              <Alert type="warning" className="w-full">
                This action is immediate, permanent, and cannot be undone.
              </Alert>

              {deleteAlertError && (
                <Alert
                  type="error"
                  message={deleteAlertError}
                  className="w-full"
                />
              )}

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">
                    Enter your password to continue
                  </span>
                </label>
                <input
                  type="password"
                  autoFocus
                  className={inputClass(Boolean(passwordFieldError))}
                  value={deletePassword}
                  onChange={handleDeletePasswordChange}
                  placeholder="••••••••"
                />
                <FieldError msg={passwordFieldError} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={closeDeleteModal}
                  disabled={previewLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={previewLoading || !deletePassword.trim()}
                >
                  {previewLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert type="warning" className="w-full">
                Please review this carefully. Deleting your account is
                irreversible.
              </Alert>

              {deleteAlertError && (
                <Alert
                  type="error"
                  message={deleteAlertError}
                  className="w-full"
                />
              )}

              {transferTeams.length > 0 && (
                <Card
                  hoverable={false}
                  marginClassName="mb-0"
                  contentClassName="space-y-4"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Users size={18} />
                    <h3 className="text-base font-semibold">
                      Teams to be transferred
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {transferTeams.map((team) => {
                      const teamId = getTransferTeamId(team);
                      const selectedSuccessor = getSelectedSuccessorForTeam(team);
                      const transferOptions = getTransferOptionsForTeam(team);
                      const isEditing = sameId(editingTransferTeamId, teamId);
                      const isLoadingOptions = Boolean(
                        transferOptionsLoadingByTeam[teamId],
                      );
                      const memberCount = getTransferTeamMemberCount(team);

                      return (
                        <div
                          key={teamId ?? getTransferTeamName(team)}
                          className="rounded-xl border border-base-300 bg-base-200/30 p-4 space-y-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="font-medium text-base-content">
                                {getTransferTeamName(team)}
                              </p>
                              <p className="text-sm text-base-content/70">
                                Successor:{" "}
                                <span className="font-medium text-base-content">
                                  {selectedSuccessor?.name || "Unknown member"}
                                </span>
                                {selectedSuccessor?.role
                                  ? ` (${formatRoleLabel(selectedSuccessor.role)})`
                                  : ""}
                              </p>
                              <p className="text-sm text-base-content/70">
                                {memberCount}{" "}
                                {memberCount === 1 ? "member" : "members"}
                              </p>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTransferOptions(team)}
                              disabled={deletionStep === DELETE_STEP_EXECUTING}
                            >
                              {isEditing ? "Close" : "Change"}
                            </Button>
                          </div>

                          {isEditing && (
                            <div className="form-control w-full">
                              <label className="label pb-2">
                                <span className="label-text text-sm">
                                  Transfer ownership to
                                </span>
                              </label>

                              {isLoadingOptions ? (
                                <div className="flex items-center gap-2 text-sm text-base-content/70">
                                  <span className="loading loading-spinner loading-sm" />
                                  Loading team members...
                                </div>
                              ) : transferOptions.length > 0 ? (
                                <select
                                  className="select select-bordered w-full"
                                  value={selectedSuccessor?.id ?? ""}
                                  onChange={(event) =>
                                    handleSuccessorOverrideChange(
                                      team,
                                      event.target.value,
                                    )
                                  }
                                  disabled={
                                    deletionStep === DELETE_STEP_EXECUTING
                                  }
                                >
                                  {transferOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name} (
                                      {formatRoleLabel(option.role)})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm text-warning">
                                  No other team members are available for
                                  transfer.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {teamsToDelete.length > 0 && (
                <Card
                  hoverable={false}
                  marginClassName="mb-0"
                  contentClassName="space-y-4"
                >
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle size={18} />
                    <h3 className="text-base font-semibold text-base-content">
                      Teams to be deleted
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {teamsToDelete.map((team) => (
                      <div
                        key={getTransferTeamId(team) ?? getTransferTeamName(team)}
                        className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
                      >
                        <AlertTriangle
                          size={18}
                          className="mt-0.5 flex-shrink-0 text-warning"
                        />
                        <div>
                          <p className="font-medium text-base-content">
                            {getTransferTeamName(team)}
                          </p>
                          <p className="text-sm text-warning">
                            This team will be permanently deleted
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {rolesToReopen.length > 0 && (
                <Card
                  hoverable={false}
                  marginClassName="mb-0"
                  contentClassName="space-y-4"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Shield size={18} />
                    <h3 className="text-base font-semibold">
                      Roles to be reopened
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {rolesToReopen.map((role, index) => (
                      <div
                        key={`${getRoleToReopenTeamName(role)}-${getRoleToReopenName(role)}-${index}`}
                        className="rounded-xl border border-base-300 bg-base-200/30 p-4"
                      >
                        <p className="font-medium text-base-content">
                          {getRoleToReopenName(role)}
                        </p>
                        <p className="text-sm text-base-content/70">
                          {getRoleToReopenTeamName(role)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card
                hoverable={false}
                marginClassName="mb-0"
                contentClassName="space-y-4"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Trash2 size={18} />
                  <h3 className="text-base font-semibold">Summary</h3>
                </div>

                <div className="space-y-2 text-sm text-base-content/80">
                  <p>
                    {badgeAwardsGivenCount} badge award
                    {badgeAwardsGivenCount === 1 ? "" : "s"} you&apos;ve given
                    will show &quot;Former Lomir User&quot;
                  </p>
                  <p>
                    {teamMembershipsCount} team membership
                    {teamMembershipsCount === 1 ? "" : "s"} will be removed
                  </p>
                  <p>
                    {directMessagesCount} direct message
                    {directMessagesCount === 1 ? "" : "s"} will be deleted
                  </p>
                </div>
              </Card>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={closeDeleteModal}
                  disabled={deletionStep === DELETE_STEP_EXECUTING}
                >
                  Cancel
                </Button>
                <Button
                  variant="errorOutline"
                  onClick={handleConfirmDeleteAccount}
                  disabled={deletionStep === DELETE_STEP_EXECUTING}
                  icon={<Trash2 size={16} />}
                >
                  {deletionStep === DELETE_STEP_EXECUTING ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Delete My Account"
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default Settings;
