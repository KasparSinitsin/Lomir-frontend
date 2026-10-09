import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import useTeamRequestLists from "../../hooks/useTeamRequestLists";
import { useAuth } from "../../contexts/AuthContext";
import { getDisplayName } from "../../utils/userHelpers";

// Mirrors MAX_PERSONAL_MESSAGE_LENGTH in the backend's teamDeletionRequests.js,
// which refuses anything longer.
const MAX_MESSAGE_LENGTH = 2000;

/**
 * "Delete team" confirmation, shared by the team modal and the team card.
 *
 * Page 1 is the existing confirmation. When the team has open applications or
 * invitations (STATUS item 40b) a second page follows: they are about to be
 * voided and each person gets a DM from the owner, which the owner may add a
 * personal message to. Without any, it stays the single page it always was.
 *
 * `onConfirm(message)` gets the trimmed message, "" when there is none.
 *
 * ⚠️ The lists come from the owner-only endpoints. If they cannot be read the
 * dialog falls back to page 1 alone: the backend notifies those people
 * regardless, so a missed page only loses the chance to add a note.
 */
const TeamDeleteDialog = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  teamId,
  teamName,
  willBeDeletedAtOnce = false,
  title,
  confirmLabel,
  loadingLabel,
  deleteBody,
}) => {
  const { t } = useTranslation(["teams", "common"]);
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [messageExpanded, setMessageExpanded] = useState(false);

  const { applications, invitations, applicationsQuery, invitationsQuery } =
    useTeamRequestLists(teamId, {
      enabled: Boolean(isOpen),
      applicationsEnabled: true,
      invitationsEnabled: true,
      staleTime: 0,
    });

  useEffect(() => {
    if (!isOpen) {
      setPage(1);
      setMessage("");
      setMessageExpanded(false);
    }
  }, [isOpen]);

  // Internal role applications (the applicant is already a member) get no DM,
  // so they do not count.
  const applicationCount = applications.filter(
    (application) =>
      !(application.isInternalRoleApplication ?? application.is_internal_role_application),
  ).length;
  const invitationCount = invitations.length;
  const hasRequests = applicationCount + invitationCount > 0;
  const requestsLoading =
    Boolean(isOpen) && (applicationsQuery.isLoading || invitationsQuery.isLoading);

  const resolvedConfirmLabel = confirmLabel ?? t("teams:teamDetails.deleteConfirm");
  const resolvedLoadingLabel = loadingLabel ?? t("teams:teamDetails.deleteLoading");
  const showSecondPage = page === 2 && hasRequests;

  const requestSummary =
    applicationCount > 0 && invitationCount > 0
      ? t("teams:teamDeleteDialog.requestsBoth", {
          applications: applicationCount,
          invitations: invitationCount,
        })
      : applicationCount > 0
        ? t("teams:teamDeleteDialog.requestsApplications", {
            applications: applicationCount,
          })
        : t("teams:teamDeleteDialog.requestsInvitations", {
            invitations: invitationCount,
          });

  // The preview is the sentence the recipient reads, so it names the owner.
  const ownerName = user ? getDisplayName(user) : "";

  const noticeText = willBeDeletedAtOnce
    ? t("teams:teamDeleteDialog.noticeDeleted", { teamName: teamName ?? "", ownerName })
    : t("teams:teamDeleteDialog.noticeArchived", { teamName: teamName ?? "", ownerName });

  const deleteButton = (
    <Button
      variant="error"
      onClick={() => onConfirm(message.trim())}
      disabled={loading}
      icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />}
    >
      {loading ? resolvedLoadingLabel : resolvedConfirmLabel}
    </Button>
  );

  const footer = showSecondPage ? (
    <div className="flex justify-end gap-3">
      <Button
        variant="ghost"
        onClick={() => setPage(1)}
        disabled={loading}
        icon={<ChevronLeft size={16} />}
      >
        {t("teams:teamDeleteDialog.back")}
      </Button>
      {deleteButton}
    </div>
  ) : (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        {t("common:confirmModal.cancel")}
      </Button>
      {hasRequests ? (
        <Button
          variant="primary"
          onClick={() => setPage(2)}
          disabled={loading}
          icon={<ChevronRight size={16} />}
        >
          {t("teams:teamDeleteDialog.next")}
        </Button>
      ) : (
        <Button
          variant="error"
          onClick={() => onConfirm("")}
          disabled={loading || requestsLoading}
          icon={
            loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={16} />
          }
        >
          {loading ? resolvedLoadingLabel : resolvedConfirmLabel}
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? t("teams:teamDetails.deleteTitle")}
      position="center"
      size="small"
      bodyClassName="p-6"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      showCloseButton={!loading}
      footer={footer}
    >
      {showSecondPage ? (
        <div className="space-y-4">
          <h3 className="text-base font-medium text-primary">
            {t("teams:teamDeleteDialog.requestsTitle")}
          </h3>
          <p className="text-sm text-base-content/60">{requestSummary}</p>
          <div className="space-y-1">
            <p className="text-sm text-base-content/60">
              {t("teams:teamDeleteDialog.noticeIntro")}
            </p>
            <p className="text-sm text-base-content/90 italic">{noticeText}</p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setMessageExpanded((open) => !open)}
              className="w-full text-xs text-base-content/60 flex items-center text-left cursor-pointer hover:text-base-content/80 transition-colors mb-1"
            >
              {messageExpanded || message ? (
                <MessageSquare size={12} className="text-primary mr-1" />
              ) : (
                <Pencil size={12} className="text-primary mr-1" />
              )}
              {messageExpanded
                ? t("teams:teamDeleteDialog.messageLabel")
                : t("teams:teamDeleteDialog.messageAdd")}
              <span className="ml-auto pl-3 text-base-content/40">
                {messageExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
            </button>
            {messageExpanded && (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="textarea textarea-bordered textarea-sm w-full h-24 resize-none text-sm"
                  placeholder={t("teams:teamDeleteDialog.messagePlaceholder")}
                  disabled={loading}
                />
                <p className="text-xs text-base-content/50 mt-1">
                  {t("teams:teamDeleteDialog.messageHint")}
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-base-content/80">
          {deleteBody ?? t("teams:teamDetails.deleteBody")}
        </p>
      )}
    </Modal>
  );
};

export default TeamDeleteDialog;
