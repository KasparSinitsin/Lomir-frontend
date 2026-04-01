import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Alert from "../components/common/Alert";
import FormSectionDivider from "../components/common/FormSectionDivider";
import VisibilityToggle from "../components/common/VisibilityToggle";
import Modal from "../components/common/Modal";
import { userService } from "../services/userService";
import { Eye, Mail, KeyRound, Trash2 } from "lucide-react";

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
    } catch (err) {
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
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      const result = await userService.deleteUser(user.id);
      if (result.success) {
        setIsDeleteModalOpen(false);
        logout();
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete account. Please try again.",
      );
      setIsDeleteModalOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Shared helpers ───────────────────────────────────────────
  const inputClass = (hasError) =>
    `input input-bordered w-full ${hasError ? "input-error" : ""}`;

  const FieldError = ({ msg }) =>
    msg ? (
      <label className="label">
        <span className="label-text-alt text-error">{msg}</span>
      </label>
    ) : null;

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
                  onClick={() => setIsDeleteModalOpen(true)}
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => !deleteLoading && setIsDeleteModalOpen(false)}
          title="Delete Account"
          position="center"
          size="small"
          closeOnBackdrop={!deleteLoading}
          closeOnEscape={!deleteLoading}
          showCloseButton={!deleteLoading}
        >
          <div className="py-4">
            <p className="text-base-content">
              You are about to permanently delete your account. This action
              cannot be reversed.
            </p>
            <p className="text-warning text-sm mt-2">
              This includes your messages, team memberships, badges, and all
              other associated data.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="errorOutline"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Settings;
