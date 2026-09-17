import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import {
  User,
  Users,
  SendHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import PersonRequestCard from "../common/PersonRequestCard";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Tooltip from "../common/Tooltip";
import { InvitedByLink } from "../users/InlineUserLink";
import RequestRoleCard from "./RequestRoleCard";
import teamService from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import { useUserModal } from "../../contexts/UserModalContext";
import { useTeamModal } from "../../contexts/TeamModalContext";
import usePolledRequestRoles from "../../hooks/usePolledRequestRoles";
import useSelfRoleMatchMap from "../../hooks/useSelfRoleMatchMap";
import { getDisplayName } from "../../utils/userHelpers";
import { splitEventSentence } from "../../utils/eventSentences";
import {
  buildCurrentFilledRoleForCard,
  buildInvitationRoleForCard,
  extractRoleMatchData,
  getRequestDateValue,
  getRequestUserLabel,
  getRequestUserId,
  getRequestRoleId,
  isPrivateProfileUser,
  isRequestForUser,
} from "../../utils/teamRequestUtils";

/**
 * TeamInvitesModal Component
 *
 * Displays pending invitations sent by a team.
 * Allows team owners and admins to view and cancel pending invitations.
 * Consistent design with TeamApplicationsModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Array} invitations - Array of pending invitation objects
 * @param {Function} onCancelInvitation - Callback to cancel an invitation
 * @param {string} teamName - Name of the team (for display)
 * @param {string|number|null} highlightInvitationId - Invitation ID to scroll to + highlight (optional)
 * @param {string|number|null} highlightUserId - User ID to scroll to + highlight (optional)
 */
const TeamInvitesModal = ({
  isOpen,
  onClose,
  teamId = null,
  invitations = [],
  onCancelInvitation,
  onCancelRoleInvitation,
  teamName,
  highlightInvitationId = null,
  highlightUserId = null,
}) => {
  // `common` stays first, so unprefixed keys are unaffected; `teams` is named
  // so it loads with the modal.
  const { t } = useTranslation(["common", "teams"]);

  // ============ State ============
  const showToast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const showSuccess = (message) => showToast(message, "success");
  const [pendingCancelInvitationId, setPendingCancelInvitationId] =
    useState(null);
  const [pendingCancelType, setPendingCancelType] = useState("team");
  const [narrowMap, setNarrowMap] = useState({});

  // ============ Refs ============
  const highlightedRef = useRef(null);

  // ============ Context ============
  const { user: currentUser, blockedRelationshipIds } = useAuth();
  const isBlockedUser = (id) =>
    id != null && blockedRelationshipIds?.has?.(String(id));
  const { openUserModal } = useUserModal();
  const { openTeamModal } = useTeamModal();
  const hydratedRoleMap = usePolledRequestRoles(invitations, {
    isOpen,
    teamId,
  });
  const selfRoleMatchMap = useSelfRoleMatchMap(invitations, {
    isOpen,
    teamId,
    currentUserId: currentUser?.id,
    userKey: "invitee",
    warningLabel: "invitation",
  });

  // ============ Scroll to highlighted invitation ============
  useEffect(() => {
    if (!isOpen || (!highlightInvitationId && !highlightUserId)) return;

    let frameId = null;
    const timeoutId = setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, [highlightInvitationId, highlightUserId, invitations.length, isOpen]);

  // ============ Handlers ============

  const handleCancelInvitation = (invitationId, type = "team") => {
    if (!invitationId) return;
    setPendingCancelType(type);
    setPendingCancelInvitationId(invitationId);
  };

  const closeCancelInvitationModal = () => {
    if (loading) return;
    setPendingCancelInvitationId(null);
    setPendingCancelType("team");
  };

  const confirmCancelInvitation = async () => {
    if (!pendingCancelInvitationId) return;

    try {
      setLoading(true);
      setError(null);

      if (pendingCancelType === "role") {
        if (onCancelRoleInvitation) {
          await onCancelRoleInvitation(pendingCancelInvitationId);
        } else {
          await teamService.cancelRoleInvitation(pendingCancelInvitationId);
        }
      } else {
        await onCancelInvitation(pendingCancelInvitationId);
      }

      showSuccess(
        pendingCancelType === "role"
          ? t("teams:invitationsList.toast.roleCanceled")
          : t("teams:invitationsList.toast.teamCanceled"),
      );
      setPendingCancelInvitationId(null);
      setPendingCancelType("team");
    } catch (err) {
      // `err.message` is the backend's prose; coding it is T4.
      setError(err.message || t("teams:invitationsList.errors.cancelFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Handler for clicking on invitee avatar/name
  const handleInviteeClick = (userId) => {
    if (userId) {
      openUserModal(userId);
    }
  };

  // ============ Helpers ============

  // ============ Render ============
  const anyNarrow = Object.values(narrowMap).some(Boolean);
  const pendingCancelInvitation = invitations.find(
    (invitation) => String(invitation.id) === String(pendingCancelInvitationId),
  );
  // `getDisplayName` answers the English marker "Unknown" when there is no
  // name; that selects the unnamed sentence rather than being shown.
  const pendingInviteeDisplayName = pendingCancelInvitation?.invitee
    ? getDisplayName(pendingCancelInvitation.invitee)
    : null;
  const pendingInviteeName =
    pendingInviteeDisplayName && pendingInviteeDisplayName !== "Unknown"
      ? pendingInviteeDisplayName
      : null;
  const pendingCancelIsRole = pendingCancelType === "role";
  const pendingCancelHasRole =
    !pendingCancelIsRole &&
    Boolean(
      pendingCancelInvitation?.role?.id ??
        pendingCancelInvitation?.roleId ??
        pendingCancelInvitation?.role_id,
    );
  const pendingCancelTitle = pendingCancelIsRole
    ? t("teams:invitationsList.cancelDialog.titleRole")
    : t("teams:invitationsList.cancelDialog.titleTeam");
  const pendingCancelButtonLabel = pendingCancelTitle;
  const titleParts = splitEventSentence({
    text: t("teams:invitationsList.title"),
    slots: { team: true },
  });

  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="leading-[100%]">
          <Users size={20} className="inline-block align-middle mr-1.5 shrink-0 text-primary" />
          {titleParts.map((part, index) =>
            "text" in part ? (
              <span key={index}>{part.text}</span>
            ) : (
              <Tooltip key={index} content={t("teams:applicationsList.viewTeam")} wrapperClassName="inline">
                <span
                  className="font-semibold text-success cursor-pointer hover:text-success/70 transition-colors"
                  onClick={() => teamId && openTeamModal(teamId, teamName)}
                >{teamName}</span>
              </Tooltip>
            ),
          )}
        </span>
      }
      itemCount={invitations.length}
      itemName="invitation"
      bylineIcon={<SendHorizontal size={14} className="text-violet-500 shrink-0" />}
      footerText={t("teams:invitationsList.footer")}
      error={error}
      onErrorClose={() => setError(null)}
      emptyIcon={User}
      emptyMessage={t("teams:invitationsList.emptyMessage")}
      extraModals={
        <Modal
          isOpen={Boolean(pendingCancelInvitationId)}
          onClose={closeCancelInvitationModal}
          title={pendingCancelTitle}
          position="center"
          size="small"
          bodyClassName="p-4"
          closeOnBackdrop={!loading}
          closeOnEscape={!loading}
          showCloseButton={!loading}
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={closeCancelInvitationModal}
                disabled={loading}
              >
                {t("teams:applicationDetails.keep")}
              </Button>
              <Button
                variant="error"
                onClick={confirmCancelInvitation}
                disabled={loading}
                icon={<Trash2 size={16} />}
              >
                {loading ? t("teams:applicationDetails.canceling") : pendingCancelButtonLabel}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-base-content/80">
            {pendingCancelIsRole
              ? t("teams:invitationsList.cancelDialog.bodyRole", {
                  named: pendingInviteeName ? "yes" : "no",
                  name: pendingInviteeName ?? "",
                })
              : t("teams:invitationsList.cancelDialog.bodyTeam", {
                  named: pendingInviteeName ? "yes" : "no",
                  name: pendingInviteeName ?? "",
                })}
            {pendingCancelHasRole && (
              <span className="block mt-2 text-warning text-xs">
                {t("teams:invitationsList.cancelDialog.alsoRole")}
              </span>
            )}
          </p>
        </Modal>
      }
    >
      {invitations.map((invitation) => {
        // Get invitee ID for highlighting comparison
        const inviteeId = getRequestUserId(invitation, "invitee");
        const roleId = getRequestRoleId(invitation);
        const polledRole = roleId ? hydratedRoleMap[String(roleId)] : null;
        const roleForCard = buildInvitationRoleForCard(invitation, polledRole);
        const currentFilledRoleForCard = buildCurrentFilledRoleForCard(
          invitation,
          invitation.invitee ?? null,
        );
        const isSelfInvitation = isRequestForUser(
          invitation,
          "invitee",
          currentUser?.id,
        );
        const inviteeIsPrivate =
          (isPrivateProfileUser(invitation.invitee) ||
            isBlockedUser(inviteeId)) &&
          !isSelfInvitation;
        const inviteeRoleMatch =
          roleId != null && invitation?.role && !inviteeIsPrivate
            ? extractRoleMatchData(invitation.role)
            : null;
        const selfRoleMatch =
          roleId != null && isSelfInvitation
            ? selfRoleMatchMap[String(roleId)] ?? null
            : null;
        const hasRoleInvitation = roleId != null;
        // No name for a private profile: its stand-in label is not a name.
        const inviteeName = isPrivateProfileUser(invitation.invitee)
          ? null
          : getRequestUserLabel(invitation, "invitee", null);
        const isInternalInvitation = Boolean(
          invitation?.isInternal ?? invitation?.is_internal ?? false,
        );

        // Strip the " <roleName>." suffix the backend appends to internal invitation messages
        const displayedMessage = invitation.message
          ? (() => {
              const roleName =
                invitation.current_filled_role_name ??
                invitation.currentFilledRoleName;
              if (isInternalInvitation && roleName) {
                const suffix = ` ${roleName}.`;
                return invitation.message.endsWith(suffix)
                  ? invitation.message.slice(0, -suffix.length)
                  : invitation.message;
              }
              return invitation.message;
            })()
          : null;

        // Normalize types to avoid "1" vs 1 mismatches
        const isHighlighted =
          (highlightInvitationId != null &&
            String(invitation.id) === String(highlightInvitationId)) ||
          (highlightUserId != null &&
            inviteeId != null &&
            String(inviteeId) === String(highlightUserId));

        const inviteeRoleCard = hasRoleInvitation ? (
          <RequestRoleCard
            role={roleForCard}
            teamId={teamId}
            teamName={teamName}
            primaryMatch={inviteeRoleMatch}
            secondaryMatch={selfRoleMatch}
            canManageStatus={false}
            viewAsUserId={inviteeIsPrivate ? null : inviteeId}
            viewAsUser={inviteeIsPrivate ? null : invitation.invitee}
            hideActions={true}
          />
        ) : null;
        const currentFilledRoleCard =
          isInternalInvitation && currentFilledRoleForCard ? (
            <RequestRoleCard
              role={currentFilledRoleForCard}
              teamId={teamId}
              teamName={teamName}
              canManageStatus={false}
              hideActions={true}
            />
          ) : null;

        return (
          <div
            key={invitation.id}
            ref={isHighlighted ? highlightedRef : null}
            className={`transition-all duration-300 ${
              isHighlighted
                ? "ring-2 ring-green-500/70 ring-offset-2 rounded-xl bg-green-50"
                : ""
            }`}
          >
            <PersonRequestCard
              user={invitation.invitee}
              privateProfile={inviteeIsPrivate}
              date={getRequestDateValue(invitation)}
              onNarrowChange={(narrow) =>
                setNarrowMap((prev) => {
                  if ((prev[String(invitation.id)] ?? false) === narrow) return prev;
                  return { ...prev, [String(invitation.id)]: narrow };
                })
              }
              forceNarrow={anyNarrow}
              message={displayedMessage || undefined}
              messageLabel={
                inviteeName
                  ? t("teams:invitationsList.messageLabelNamed", { name: inviteeName })
                  : t("teams:invitationsList.messageLabel")
              }
              messageIcon={<SendHorizontal size={12} className="text-info mr-1" />}
              onUserClick={handleInviteeClick}
              showLocation={true}
              sublineExtra={
                isInternalInvitation ? (
                  <Tooltip
                    content={t("teams:applicationsList.alreadyMember")}
                    wrapperClassName="flex min-w-0 overflow-hidden items-center gap-0.5 text-base-content/70"
                  >
                    <User size={10} className="flex-shrink-0 text-success" />
                    <span className="leading-[1.05] whitespace-nowrap">{t("teams:applicationDetails.teamMember")}</span>
                  </Tooltip>
                ) : null
              }
              messageBubbleExtra={
                displayedMessage ? (
                  <>
                    {inviteeRoleCard}
                    {currentFilledRoleCard && (
                      <div className={inviteeRoleCard ? "mt-3" : ""}>
                        {currentFilledRoleCard}
                      </div>
                    )}
                  </>
                ) : null
              }
              extraContent={
                !displayedMessage && inviteeRoleCard ? (
                  <div className="mb-3 max-w-[300px]">{inviteeRoleCard}</div>
                ) : null
              }
              footerLeft={
                invitation.inviter ? (
                  <InvitedByLink
                    user={invitation.inviter}
                    className="min-w-0 flex-[1_1_12rem] overflow-hidden"
                  />
                ) : invitation.inviter_username ? (
                  <span className="min-w-0 flex-[1_1_12rem] overflow-hidden truncate text-xs text-base-content/50">
                    {t("userLink.invitedByName", { name: invitation.inviter_username })}
                  </span>
                ) : null
              }
              actions={
                <div className="ml-auto flex flex-wrap justify-end gap-2">
                  {hasRoleInvitation && (
                    <Tooltip content={t("teams:invitationsList.actions.cancelRoleOnlyTooltip")}>
                      <Button
                        variant="errorOutline"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id, "role")}
                        disabled={loading}
                        icon={<XCircle size={14} />}
                      >
                        {loading
                          ? t("teams:applicationDetails.canceling")
                          : t("teams:invitationsList.actions.cancelRole")}
                      </Button>
                    </Tooltip>
                  )}
                  {(!hasRoleInvitation || !isInternalInvitation) && (
                    <Tooltip
                      content={
                        hasRoleInvitation
                          ? t("teams:invitationsList.actions.cancelTeamAndRoleTooltip")
                          : t("teams:invitationsList.actions.cancelTeamTooltip")
                      }
                    >
                      <Button
                        variant="errorOutline"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id, "team")}
                        disabled={loading}
                        icon={<XCircle size={14} />}
                      >
                        {loading
                          ? t("teams:applicationDetails.canceling")
                          : hasRoleInvitation
                            ? t("teams:invitationsList.actions.cancelTeamAndRole")
                            : t("teams:invitationsList.actions.cancelInvite")}
                      </Button>
                    </Tooltip>
                  )}
                </div>
              }
            />
          </div>
        );
      })}
    </RequestListModal>
  );
};

export default TeamInvitesModal;
