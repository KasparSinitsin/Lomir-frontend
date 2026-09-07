import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";
import ScreenAlert from "../components/common/ScreenAlert";
import FormSectionDivider from "../components/common/FormSectionDivider";
import VisibilityToggle from "../components/common/VisibilityToggle";
import CommunicationSection from "../components/common/CommunicationSection";
import BlocklistSection from "../components/users/BlocklistSection";
import Modal from "../components/common/Modal";
import { userService } from "../services/userService";
import { teamService } from "../services/teamService";
import { describeLanguageSelection } from "../utils/languageUtils";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

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

// Title-cases a role value that is outside the known vocabulary. The known
// ones are translated by `roleLabel` in the component; this is the fallback.
const formatRoleLabel = (role) =>
  String(role)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** Returns null - not an English placeholder - when nothing usable is set. */
const getDisplayName = (entity) => {
  if (!entity || typeof entity !== "object") {
    return null;
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

  return fullName || null;
};

const getTransferTeamId = (team) =>
  normalizeId(firstDefined(team?.teamId, team?.team_id, team?.id));

const getTransferTeamName = (team) =>
  firstNonEmptyString(team?.teamName, team?.team_name, team?.name);

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
      getDisplayName(nestedSuccessor) ||
      firstNonEmptyString(
        team?.defaultSuccessorName,
        team?.default_successor_name,
        team?.successorName,
        team?.successor_name,
      ) ||
      null,
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
  firstNonEmptyString(role?.roleName, role?.role_name, role?.name, role?.title);

const getRoleToReopenTeamName = (role) =>
  firstNonEmptyString(
    role?.teamName,
    role?.team_name,
    role?.team?.name,
    role?.team?.teamName,
    role?.team?.team_name,
  );

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
  const { t } = useTranslation("profile");
  const { user, updateUser, logout, refreshBlocks } = useAuth();
  const navigate = useNavigate();
  const pendingEmail = user?.pendingEmail || user?.pending_email || null;

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // ── Visibility ───────────────────────────────────────────────
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? false);

  const handleVisibilityChange = async (e) => {
    const newValue = e.target.checked;
    setIsPublic(newValue);
    setError(null);
    setSuccess(null);

    try {
      setVisibilityLoading(true);
      await userService.updateUser(user.id, { isPublic: newValue });
      updateUser({ isPublic: newValue });
      setSuccess(t("settings.status.visibilityUpdated"));
    } catch {
      setIsPublic(!newValue); // revert on failure
      setError(t("settings.errors.visibility"));
    } finally {
      setVisibilityLoading(false);
    }
  };

  // ── Communication ────────────────────────────────────────────
  // Moved here from the profile's edit mode: it is a setting, not part of how
  // someone presents themselves, and it belongs with the other things that
  // apply immediately rather than behind a Save button.
  //
  // Seeded with what the picker should *show*, not with what is stored. An
  // account that never chose a language still has to display one, and that is
  // the resolved default - a guess the user can see and change.
  const [preferredLanguage, setPreferredLanguage] = useState(
    () =>
      describeLanguageSelection({
        preferredLanguage: user?.preferredLanguage,
        country: user?.country,
      }).value,
  );
  const [languageLoading, setLanguageLoading] = useState(false);

  // The seed above runs once, and on a cold load this page can render before
  // /api/auth/me has answered. Without this the picker would keep showing the
  // pre-login guess over an account that has a language stored.
  useEffect(() => {
    setPreferredLanguage(
      describeLanguageSelection({
        preferredLanguage: user?.preferredLanguage,
        country: user?.country,
      }).value,
    );
  }, [user?.preferredLanguage, user?.country]);

  const handleLanguageChange = async (e) => {
    const newValue = e.target.value;
    const previousValue = preferredLanguage;
    setPreferredLanguage(newValue);
    setError(null);
    setSuccess(null);

    try {
      setLanguageLoading(true);
      await userService.updateUser(user.id, { preferredLanguage: newValue });
      // LanguageProvider watches user.preferredLanguage, so this is also what
      // switches the interface over and mirrors the choice into localStorage.
      updateUser({ preferredLanguage: newValue });
      setSuccess(t("settings.status.languageUpdated"));
    } catch {
      setPreferredLanguage(previousValue); // revert on failure
      setError(t("settings.errors.language"));
    } finally {
      setLanguageLoading(false);
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
    if (!emailData.newEmail)
      errs.newEmail = t("settings.account.errors.newEmailRequired");
    else if (!/\S+@\S+\.\S+/.test(emailData.newEmail))
      errs.newEmail = t("settings.account.errors.invalidEmail");
    if (!emailData.currentPasswordForEmail)
      errs.currentPasswordForEmail = t(
        "settings.account.errors.currentPasswordRequired",
      );
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
      const response = await userService.changeEmail(
        emailData.newEmail,
        emailData.currentPasswordForEmail,
      );
      const nextPendingEmail =
        response?.data?.pendingEmail || emailData.newEmail;

      updateUser({ pendingEmail: nextPendingEmail });
      setSuccess(
        t("settings.account.verificationSent", { email: nextPendingEmail }),
      );
      setEmailData({ newEmail: "", currentPasswordForEmail: "" });
      setShowEmailForm(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setEmailErrors((prev) => ({
          ...prev,
          currentPasswordForEmail:
            err.response?.data?.message ||
            t("settings.account.errors.currentPasswordIncorrect"),
        }));
        return;
      }

      setError(
        err.response?.data?.message ||
          t("settings.account.errors.sendVerification"),
      );
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
  const [showCurrentPasswordForEmail, setShowCurrentPasswordForEmail] =
    useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = () => {
    const errs = {};
    if (!passwordData.currentPassword)
      errs.currentPassword = t(
        "settings.account.errors.currentPasswordRequired",
      );
    if (!passwordData.newPassword)
      errs.newPassword = t("settings.account.errors.newPasswordRequired");
    else if (passwordData.newPassword.length < 8)
      errs.newPassword = t("settings.account.errors.passwordTooShort");
    else if (
      !/[A-Za-z]/.test(passwordData.newPassword) ||
      !/\d/.test(passwordData.newPassword)
    )
      errs.newPassword = t("settings.account.errors.passwordComplexity");
    if (passwordData.newPassword !== passwordData.confirmPassword)
      errs.confirmPassword = t("settings.account.errors.passwordsDoNotMatch");
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

      // The change invalidates the current session server-side, so log out and
      // send the user straight to the login form with their new password.
      await logout();
      navigate("/login", {
        replace: true,
        state: {
          message: t("settings.account.passwordChanged"),
        },
      });
      return;
    } catch (err) {
      if (err.response?.status === 401) {
        setPasswordErrors((prev) => ({
          ...prev,
          currentPassword:
            err.response?.data?.message ||
            t("settings.account.errors.currentPasswordIncorrect"),
        }));
        return;
      }

      setError(
        err.response?.data?.message ||
          t("settings.account.errors.changePassword"),
      );
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

  // The module-level helpers return null where a name is missing, so the
  // placeholder is resolved here in the active language. One of them used to
  // be compared against the literal "Unknown", which a translation would have
  // broken with nothing to catch it.
  const teamName = (team) =>
    getTransferTeamName(team) ?? t("settings.delete.untitledTeam");
  const reopenRoleName = (role) =>
    getRoleToReopenName(role) ?? t("settings.delete.untitledRole");
  const reopenTeamName = (role) =>
    getRoleToReopenTeamName(role) ?? t("settings.delete.unknownTeam");
  const memberName = (name) => name ?? t("settings.delete.unknownMember");

  // The role vocabulary is closed - owner / admin / member - so these are real
  // keys rather than a generic capitalisation. Anything outside it keeps the
  // title-cased fallback instead of rendering nothing.
  const roleLabel = (role) => {
    if (role === "owner") return t("settings.delete.roles.owner");
    if (role === "admin") return t("settings.delete.roles.admin");
    if (role === "member" || !role) return t("settings.delete.roles.member");
    return formatRoleLabel(role);
  };

  const FieldError = ({ msg }) =>
    msg ? <p className="text-xs text-error mt-2 px-1">{msg}</p> : null;

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

  const isDeleteBusy = previewLoading || deletionStep === DELETE_STEP_EXECUTING;

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
  // deleteError carries its own routing: a wrong password belongs under the
  // password field, anything else in the alert above the form. That decision
  // used to be made by comparing the message against the literal "Incorrect
  // password" - a comparison a translation breaks silently.
  const passwordFieldError =
    deletionStep === DELETE_STEP_PASSWORD && deleteError?.field === "password"
      ? deleteError.text
      : null;
  const deleteAlertError =
    deleteError && deleteError.field !== "password" ? deleteError.text : null;

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
      name: t("settings.delete.selectedTeammate"),
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
      setDeleteError({ text: t("settings.delete.errors.passwordRequired") });
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
            t("settings.delete.errors.loadSummary"),
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
        setDeleteError({
          field: "password",
          text: t("settings.delete.errors.passwordIncorrect"),
        });
      } else {
        setDeleteError({
          text:
            err.response?.data?.message ||
            err.message ||
            t("settings.delete.errors.loadSummary"),
        });
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
      setDeleteError({
        text:
          err.response?.data?.message ||
          t("settings.delete.errors.loadMembers"),
      });
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

      if (
        defaultSuccessor &&
        sameId(defaultSuccessor.id, normalizedSuccessorId)
      ) {
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

      const ownershipOverridePayload = Array.from(
        ownershipOverrides.entries(),
      ).map(([teamId, successorId]) => ({
        teamId: normalizeId(teamId),
        successorId: normalizeId(successorId),
      }));

      const result = await userService.deleteUser(
        user.id,
        deletePassword,
        ownershipOverridePayload,
      );

      if (result?.success === false) {
        throw new Error(
          result?.message || t("settings.delete.errors.deleteAccount"),
        );
      }

      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeletionStep(DELETE_STEP_SUMMARY);
      setDeleteError({
        text:
          err.response?.data?.message ||
          err.message ||
          t("settings.delete.errors.deleteAccountRetry"),
      });
    }
  };

  return (
    <div className="space-y-6">
      <ScreenAlert
        alerts={[
          success && {
            type: "success",
            message: success,
            onClose: () => setSuccess(null),
          },
          error && {
            type: "error",
            message: error,
            onClose: () => setError(null),
          },
        ]}
      />

      <Card className="overflow-visible">
        {/* Page Header — sits directly in Card, no extra wrapper */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h1 className="text-2xl sm:text-3xl font-medium text-primary">
            {t("settings.title")}
          </h1>
        </div>

        {/* Divider — cancels only the Card's own p-4 sm:p-7 */}
        <div className="border-b border-base-300 -mx-4 sm:-mx-7"></div>

        {/* All sections inside their own padded wrapper */}
        <div className="p-6 space-y-12">
          {/* ── Privacy ── */}
          <section className="space-y-4">
            <FormSectionDivider text={t("settings.sections.privacy")} icon={Eye} />
            <VisibilityToggle
              name="isPublic"
              checked={isPublic}
              onChange={handleVisibilityChange}
              label={t("settings.visibility.label")}
              entityType="profile"
              visibleLabel={t("settings.visibility.public")}
              hiddenLabel={t("settings.visibility.private")}
              showDescription={true}
              disabled={visibilityLoading}
            />
            <p className="form-helper-text px-1">
              {t("common:privacy.profileVisibilitySettings")}
            </p>

            {user?.id && (
              <BlocklistSection userId={user.id} onChange={refreshBlocks} />
            )}
          </section>

          {/* ── Account ── */}
          <section className="space-y-4">
            <FormSectionDivider text={t("settings.sections.account")} icon={KeyRound} />

            <div
              className={`grid grid-cols-1 gap-4 items-start ${
                showEmailForm || showPasswordForm ? "" : "md:grid-cols-2"
              }`}
            >
              {/* Email column */}
              <div className="space-y-4">
                {/* Current email display */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      {t("settings.account.emailLabel")}
                    </span>
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
                        setShowPasswordForm(false);
                        setEmailErrors({});
                        setShowCurrentPasswordForEmail(false);
                      }}
                    >
                      {showEmailForm
                        ? t("settings.account.cancel")
                        : t("settings.account.change")}
                    </button>
                  </div>
                  {pendingEmail && (
                    <p className="mt-2 text-sm text-info">
                      {t("settings.account.pendingEmail", {
                        email: pendingEmail,
                      })}
                    </p>
                  )}
                </div>

                {/* Change email form */}
                {showEmailForm && (
                  <form
                    onSubmit={handleEmailChange}
                    className="border border-base-300 rounded-lg p-4 space-y-3 bg-base-200/40"
                  >
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">
                          {t("settings.account.newEmailLabel")}
                        </span>
                      </label>
                      <input
                        type="email"
                        className={inputClass(emailErrors.newEmail)}
                        value={emailData.newEmail}
                        onChange={(e) =>
                          setEmailData({
                            ...emailData,
                            newEmail: e.target.value,
                          })
                        }
                        placeholder={t("settings.account.newEmailPlaceholder")}
                      />
                      <FieldError msg={emailErrors.newEmail} />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">
                          {t("settings.account.confirmWithPassword")}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={
                            showCurrentPasswordForEmail ? "text" : "password"
                          }
                          className={`${inputClass(emailErrors.currentPasswordForEmail)} pr-12`}
                          value={emailData.currentPasswordForEmail}
                          onChange={(e) =>
                            setEmailData({
                              ...emailData,
                              currentPasswordForEmail: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 transition-colors hover:text-base-content"
                          onClick={() =>
                            setShowCurrentPasswordForEmail((prev) => !prev)
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          aria-label={
                            showCurrentPasswordForEmail
                              ? t("settings.account.hidePassword")
                              : t("settings.account.showPassword")
                          }
                          aria-pressed={showCurrentPasswordForEmail}
                        >
                          {showCurrentPasswordForEmail ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FieldError msg={emailErrors.currentPasswordForEmail} />
                    </div>

                    <div className="flex justify-end !mt-[25px] pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={emailLoading}
                        className="w-full sm:w-auto"
                      >
                        {emailLoading ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          t("settings.account.sendVerification")
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Password column */}
              <div className="space-y-4">
                {/* Change password trigger */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">
                      {t("settings.account.passwordLabel")}
                    </span>
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
                        setShowEmailForm(false);
                        setPasswordErrors({});
                        setShowCurrentPassword(false);
                        setShowNewPassword(false);
                        setShowConfirmPassword(false);
                      }}
                    >
                      {showPasswordForm
                        ? t("settings.account.cancel")
                        : t("settings.account.change")}
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
                        <span className="label-text">
                          {t("settings.account.currentPassword")}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          className={`${inputClass(passwordErrors.currentPassword)} pr-12`}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 transition-colors hover:text-base-content"
                          onClick={() =>
                            setShowCurrentPassword((prev) => !prev)
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          aria-label={
                            showCurrentPassword
                              ? t("settings.account.hidePassword")
                              : t("settings.account.showPassword")
                          }
                          aria-pressed={showCurrentPassword}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FieldError msg={passwordErrors.currentPassword} />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">
                          {t("settings.account.newPassword")}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          className={`${inputClass(passwordErrors.newPassword)} pr-12`}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 transition-colors hover:text-base-content"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          onMouseDown={(e) => e.preventDefault()}
                          aria-label={
                            showNewPassword
                              ? t("settings.account.hidePassword")
                              : t("settings.account.showPassword")
                          }
                          aria-pressed={showNewPassword}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FieldError msg={passwordErrors.newPassword} />
                    </div>

                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">
                          {t("settings.account.confirmNewPassword")}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className={`${inputClass(passwordErrors.confirmPassword)} pr-12`}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center px-3 text-base-content/60 transition-colors hover:text-base-content"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          aria-label={
                            showConfirmPassword
                              ? t("settings.account.hidePassword")
                              : t("settings.account.showPassword")
                          }
                          aria-pressed={showConfirmPassword}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FieldError msg={passwordErrors.confirmPassword} />
                    </div>

                    <div className="flex flex-col-reverse gap-4 !mt-[25px] pt-1 sm:flex-row sm:justify-between sm:items-start">
                      <p className="form-helper-text px-1 !mt-0">
                        {t("settings.account.passwordHelp")}
                      </p>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={passwordLoading}
                        className="w-full sm:w-auto sm:flex-shrink-0"
                      >
                        {passwordLoading ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          t("settings.account.updatePassword")
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>

          {/* ── Communication ── */}
          {/* Renders nothing while LANGUAGE_FEATURE_VISIBLE is false, which is
              also why no payload gate is needed here: the only thing that
              writes preferredLanguage is this picker's own onChange. */}
          <CommunicationSection
            value={preferredLanguage}
            onChange={handleLanguageChange}
            name="preferredLanguage"
            disabled={languageLoading}
          />

          {/* ── Danger Zone ── */}
          <section className="space-y-4">
            <FormSectionDivider text={t("settings.sections.dangerZone")} icon={Trash2} />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="form-helper-text">{t("common:privacy.accountDeletion")}</p>
              <Button
                variant="errorOutline"
                size="sm"
                onClick={openDeleteModal}
                icon={<Trash2 size={16} />}
                className="w-full sm:w-auto sm:flex-shrink-0 sm:ml-4"
              >
                {t("settings.delete.button")}
              </Button>
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
                {t("settings.delete.modalTitle")}
              </h2>
              <p className="mt-1 text-sm text-base-content/60">
                {deletionStep === DELETE_STEP_PASSWORD
                  ? t("settings.delete.step1")
                  : deletionStep === DELETE_STEP_EXECUTING
                    ? t("settings.delete.executing")
                    : t("settings.delete.step2")}
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
                {t("common:privacy.accountDeletion")}
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
                    {t("settings.delete.passwordLabel")}
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
                  {t("settings.delete.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={previewLoading || !deletePassword.trim()}
                >
                  {previewLoading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    t("settings.delete.continue")
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert type="warning" className="w-full mb-2">
                {t("settings.delete.reviewNotice")}{" "}
                {t("common:privacy.accountDeletion")}
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
                      {t("settings.delete.transferHeading")}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {transferTeams.map((team) => {
                      const teamId = getTransferTeamId(team);
                      const selectedSuccessor =
                        getSelectedSuccessorForTeam(team);
                      const transferOptions = getTransferOptionsForTeam(team);
                      const isEditing = sameId(editingTransferTeamId, teamId);
                      const isLoadingOptions = Boolean(
                        transferOptionsLoadingByTeam[teamId],
                      );
                      const memberCount = getTransferTeamMemberCount(team);

                      return (
                        <div
                          key={teamId ?? teamName(team)}
                          className="rounded-xl border border-base-300 bg-base-200/30 p-4 space-y-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="font-medium text-base-content">
                                {teamName(team)}
                              </p>
                              <p className="text-sm text-base-content/70">
                                {t("settings.delete.successorLabel")}{" "}
                                <span className="font-medium text-base-content">
                                  {memberName(selectedSuccessor?.name)}
                                </span>
                                {selectedSuccessor?.role
                                  ? t("settings.delete.roleParenthetical", {
                                      role: roleLabel(selectedSuccessor.role),
                                    })
                                  : ""}
                              </p>
                              <p className="text-sm text-base-content/70">
                                {t("settings.delete.memberCount", {
                                  count: memberCount,
                                })}
                              </p>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenTransferOptions(team)}
                              disabled={deletionStep === DELETE_STEP_EXECUTING}
                            >
                              {isEditing
                                ? t("settings.delete.close")
                                : t("settings.delete.change")}
                            </Button>
                          </div>

                          {isEditing && (
                            <div className="form-control w-full">
                              <label className="label pb-2">
                                <span className="label-text text-sm">
                                  {t("settings.delete.transferTo")}
                                </span>
                              </label>

                              {isLoadingOptions ? (
                                <div className="flex items-center gap-2 text-sm text-base-content/70">
                                  <span className="loading loading-spinner loading-sm" />
                                  {t("settings.delete.loadingMembers")}
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
                                      {t("settings.delete.successorOption", {
                                        name: memberName(option.name),
                                        role: roleLabel(option.role),
                                      })}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <p className="text-sm text-warning">
                                  {t("settings.delete.noTransferOptions")}
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
                      {t("settings.delete.deleteHeading")}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {teamsToDelete.map((team) => (
                      <div
                        key={
                          getTransferTeamId(team) ?? teamName(team)
                        }
                        className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
                      >
                        <AlertTriangle
                          size={18}
                          className="mt-0.5 flex-shrink-0 text-warning"
                        />
                        <div>
                          <p className="font-medium text-base-content">
                            {teamName(team)}
                          </p>
                          <p className="text-sm text-warning">
                            {t("settings.delete.soloTeamNotice")}
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
                      {t("settings.delete.reopenHeading")}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {rolesToReopen.map((role, index) => (
                      <div
                        key={`${reopenTeamName(role)}-${reopenRoleName(role)}-${index}`}
                        className="rounded-xl border border-base-300 bg-base-200/30 p-4"
                      >
                        <p className="font-medium text-base-content">
                          {reopenRoleName(role)}
                        </p>
                        <p className="text-sm text-base-content/70">
                          {reopenTeamName(role)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Trash2 size={18} />
                  <h3 className="text-base font-semibold">
                    {t("settings.delete.summaryHeading")}
                  </h3>
                </div>

                <div className="space-y-2 text-sm text-base-content/80">
                  <p>
                    {t("settings.delete.summaryBadges", {
                      count: badgeAwardsGivenCount,
                    })}
                  </p>
                  <p>
                    {t("settings.delete.summaryMemberships", {
                      count: teamMembershipsCount,
                    })}
                  </p>
                  <p>
                    {t("settings.delete.summaryMessages", {
                      count: directMessagesCount,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={closeDeleteModal}
                  disabled={deletionStep === DELETE_STEP_EXECUTING}
                >
                  {t("settings.delete.cancel")}
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
                    t("settings.delete.confirm")
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
