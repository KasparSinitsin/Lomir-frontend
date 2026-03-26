import React, { useState, useEffect } from "react";
import {
  Calendar,
  MessageSquare,
  Users,
  Check,
  X,
  MailOpen,
  UserPlus,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import UserDetailsModal from "../users/UserDetailsModal";
import TeamDetailsModal from "./TeamDetailsModal";
import VacantRoleCard from "./VacantRoleCard";
import Alert from "../common/Alert";
import { format } from "date-fns";
import InlineUserLink from "../users/InlineUserLink";
import { vacantRoleService } from "../../services/vacantRoleService";

/**
 * TeamInvitationDetailsModal Component
 *
 * Displays invitation details and allows user to accept or decline.
 * Similar structure to TeamApplicationDetailsModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Object} invitation - Invitation data object
 * @param {Function} onClose - Callback to close the modal
 * @param {Function} onAccept - Callback to accept invitation
 * @param {Function} onDecline - Callback to decline invitation
 */
const TeamInvitationDetailsModal = ({
  isOpen,
  invitation,
  onClose,
  onAccept,
  onDecline,
}) => {
  // ============ State ============
  const [loading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // "acceptRole" | "acceptTeam" | "decline" | null
  const [error, setError] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [hydratedRole, setHydratedRole] = useState(null);
  const [roleMatchScore, setRoleMatchScore] = useState(null);
  const [roleMatchDetails, setRoleMatchDetails] = useState(null);

  // ============ Helpers ============

  // Get team data from invitation
  const team = invitation?.team || {};

  // Fetch full role details when modal opens and invitation targets a role
  useEffect(() => {
    const roleId = invitation?.role?.id ?? invitation?.roleId ?? invitation?.role_id ?? null;
    const teamId = team?.id ?? null;

    if (!isOpen || !roleId || !teamId) {
      setHydratedRole(null);
      setRoleMatchScore(null);
      setRoleMatchDetails(null);
      return;
    }

    const fetchRole = async () => {
      try {
        const [detailsRes, listRes] = await Promise.allSettled([
          vacantRoleService.getVacantRoleById(teamId, roleId),
          vacantRoleService.getVacantRoles(teamId, "open"),
        ]);

        if (detailsRes.status === "fulfilled" && detailsRes.value?.data) {
          const roleData = detailsRes.value.data;
          setHydratedRole(roleData);
          const detailScore = roleData.matchScore ?? roleData.match_score ?? null;
          if (detailScore !== null) {
            setRoleMatchScore(detailScore);
            setRoleMatchDetails(
              roleData.matchDetails ?? roleData.match_details ?? roleData.scoreBreakdown ?? null
            );
          }
        }

        if (listRes.status === "fulfilled") {
          const roles = listRes.value?.data || [];
          const matched = roles.find((r) => String(r.id) === String(roleId));
          if (matched) {
            const listScore = matched.matchScore ?? matched.match_score ?? null;
            if (listScore !== null) {
              setRoleMatchScore(listScore);
              setRoleMatchDetails(matched.matchDetails ?? matched.match_details ?? null);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch role details for invitation:", err);
      }
    };

    fetchRole();
  }, [isOpen, invitation?.role?.id, invitation?.roleId, invitation?.role_id, team?.id]);
  const inviter = invitation?.inviter || {};

  // Format invitation date
  const getInvitationDate = () => {
    const date =
      invitation?.created_at ||
      invitation?.createdAt ||
      invitation?.date ||
      invitation?.sent_at;

    if (!date) return "Unknown date";

    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  const getTeamAvatar = () => {
    return (
      team.teamavatar_url ||
      team.teamavatarUrl ||
      team.avatar_url ||
      team.avatarUrl ||
      null
    );
  };

  // Get team initials from name (e.g., "Urban Gardeners Berlin" → "UGB")
  const getTeamInitials = () => {
    const name = team?.name;
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

  const getMemberCount = () => {
    return (
      team.current_members_count ??
      team.currentMembersCount ??
      team.member_count ??
      team.memberCount ??
      team.members?.length ??
      0
    );
  };

  const getMaxMembers = () => {
    const max = team.max_members ?? team.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  const handleTeamClick = () => {
    if (team?.id) setIsTeamDetailsOpen(true);
  };

  // ============ Handlers ============

  const handleAcceptWithRole = async () => {
    try {
      setActionLoading("acceptRole");
      setError(null);
      await onAccept(invitation.id, responseMessage, true);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptTeamOnly = async () => {
    try {
      setActionLoading("acceptTeam");
      setError(null);
      await onAccept(invitation.id, responseMessage, false);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading("decline");
      setError(null);
      await onDecline(invitation.id, responseMessage);
      setResponseMessage("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to decline invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserClick = (userId) => {
    if (userId) {
      setSelectedUserId(userId);
    }
  };

  // ============ Render ============

  const hasRoleInvitation = !!(invitation?.role_id ?? invitation?.roleId ?? invitation?.role?.id);
  const isInternal = invitation?.isInternal ?? invitation?.is_internal ?? false;
  const isAcceptRoleLoading = actionLoading === "acceptRole";
  const isAcceptTeamLoading = actionLoading === "acceptTeam";
  const isDeclineLoading = actionLoading === "decline";
  const isActionPending =
    isAcceptRoleLoading || isAcceptTeamLoading || isDeclineLoading;
  const isControlsDisabled = loading || isActionPending;

  const headerSubtitle = isInternal
    ? "You've been invited to fill a role!"
    : hasRoleInvitation
      ? "You are invited for a role!"
      : "You are invited!";

  // Custom header
  const customHeader = (
    <div>
      <h2 className="text-xl font-medium text-primary leading-[120%] mb-[0.2em]">
        {team.name || "Unknown Team"}
      </h2>
      <p className="text-sm text-base-content/70 flex items-center">
        <MailOpen size={14} className="mr-1.5" />
        {headerSubtitle}
      </p>
    </div>
  );

  // Footer with action buttons + "Sent by" (left)
  const footer = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Sent by (left) */}
        <InlineUserLink
          label="Invite sent by"
          user={inviter}
          onOpenUser={handleUserClick}
        />

        {/* Buttons (right) */}
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="errorOutline"
            size="sm"
            onClick={handleDecline}
            disabled={isControlsDisabled}
            icon={<X size={16} />}
          >
            {isDeclineLoading ? "Declining..." : "Decline"}
          </Button>
          {hasRoleInvitation && isInternal ? (
            // Internal role invite: user is already a member, just accept/fill the role
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptWithRole}
              disabled={isControlsDisabled}
              icon={<Check size={16} />}
            >
              {isAcceptRoleLoading ? "Accepting..." : "Accept Role"}
            </Button>
          ) : hasRoleInvitation ? (
            // External invite with a role: offer team-only or fill-role options
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptTeamOnly}
                disabled={isControlsDisabled}
                icon={<UserPlus size={16} />}
              >
                {isAcceptTeamLoading ? "Joining..." : "Join Team Only"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcceptWithRole}
                disabled={isControlsDisabled}
                icon={<Check size={16} />}
              >
                {isAcceptRoleLoading ? "Joining..." : "Accept & Fill Role"}
              </Button>
            </>
          ) : (
            // No role: simple accept
            <Button
              variant="primary"
              size="sm"
              onClick={handleAcceptTeamOnly}
              disabled={isControlsDisabled}
              icon={<Check size={16} />}
            >
              {isAcceptTeamLoading ? "Joining..." : "Accept"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen && !!invitation}
        onClose={onClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="default"
        maxHeight="max-h-[90vh]"
        closeOnBackdrop={true}
        closeOnEscape={true}
        showCloseButton={true}
      >
        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            className="mb-4"
          />
        )}

        {/* Top row: Team info (left, clickable) + Date (right) */}
        <div className="flex items-start justify-between gap-4 mb-5">
          {/* Team info (hover + onClick like in TeamInvitesModal) */}
          <div
            className="flex items-start space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleTeamClick}
            title="View team details"
          >
            <div className="avatar">
              <div className="w-12 h-12 rounded-full relative">
                {getTeamAvatar() ? (
                  <img
                    src={getTeamAvatar()}
                    alt={team.name || "Team"}
                    className="object-cover w-full h-full rounded-full"
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback =
                        e.target.parentElement.querySelector(
                          ".avatar-fallback",
                        );
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}

                {/* Fallback initials */}
                <div
                  className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                  style={{ display: getTeamAvatar() ? "none" : "flex" }}
                >
                  <span className="text-lg font-medium">
                    {getTeamInitials()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base-content hover:text-primary transition-colors leading-[120%] mb-[0.2em]">
                {team.name || "Unknown Team"}
              </h4>
              <p className="text-sm text-base-content/70 flex items-center">
                <Users size={14} className="mr-1 text-primary" />
                {getMemberCount()}/{getMaxMembers()}
              </p>
            </div>
          </div>

          {/* Date - top right */}
          <div className="flex items-center text-xs text-base-content/60 whitespace-nowrap">
            <Calendar size={12} className="mr-1" />
            <span>{getInvitationDate()}</span>
          </div>
        </div>

        {/* Team description */}
        {team.description && (
          <p className="text-sm text-base-content/80 mb-5">
            {team.description}
          </p>
        )}

        {/* Vacant role card — shown when invitation targets a specific role */}
        {(hydratedRole || invitation?.role || invitation?.roleId || invitation?.role_id) && (
          <div className="mb-5">
            <p className="text-xs text-base-content/60 mb-2 flex items-center">
              <MailOpen size={12} className="text-info mr-1" />
              Invited for this role:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VacantRoleCard
                role={hydratedRole ?? invitation?.role ?? { id: invitation?.roleId ?? invitation?.role_id }}
                team={team}
                matchScore={roleMatchScore}
                matchDetails={roleMatchDetails}
                canManage={false}
                isTeamMember={false}
                hideActions={true}
              />
            </div>
          </div>
        )}

        {/* Invitation Message */}
        {invitation?.message && (
          <div className="mb-4">
            <p className="text-xs text-base-content/60 mb-0.5 flex items-center">
              <MailOpen size={12} className="text-info mr-1" />
              Invitation message:
            </p>

            {/* left-aligned with other content (no extra padding box) */}
            <p className="text-sm text-base-content/90 leading-relaxed">
              {invitation.message}
            </p>
          </div>
        )}

        {/* Response Textarea */}
        <div className="mt-2">
          <p className="text-xs text-base-content/60 mb-1 flex items-center">
            <MessageSquare size={12} className="text-primary mr-1" />
            Your response message (optional):
          </p>
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full h-20 resize-none text-sm"
            placeholder="Add a personal message to your decision. Decline messages will be sent as DM to the inviter only. Acceptance messages will be sent to the team chat."
            disabled={isControlsDisabled}
          />
        </div>
      </Modal>

      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={team?.id}
        initialTeamData={team}
        onClose={() => setIsTeamDetailsOpen(false)}
        isFromSearch={true}
        hasPendingInvitation={true}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUserId}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </>
  );
};

export default TeamInvitationDetailsModal;
