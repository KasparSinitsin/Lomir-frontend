import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  User,
  Users,
  MapPin,
  Calendar,
  SendHorizontal,
  FlaskConical,
  Trash2,
  MailOpen,
  XCircle,
} from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Tooltip from "../common/Tooltip";
import InlineUserLink, { InvitedByLink } from "../users/InlineUserLink";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import VacantRoleCard from "./VacantRoleCard";
import { matchingService } from "../../services/matchingService";
import teamService from "../../services/teamService";
import { useAuth } from "../../contexts/AuthContext";
import { useUserModal } from "../../contexts/UserModalContext";
import { useTeamModal } from "../../contexts/TeamModalContext";
import usePolledRequestRoles from "../../hooks/usePolledRequestRoles";
import {
  DEMO_PROFILE_TOOLTIP,
  getUserInitials,
  getDisplayName,
  isSyntheticUser,
} from "../../utils/userHelpers";
import { formatDisplayName } from "../../utils/nameFormatters";
import { format } from "date-fns";
import {
  buildInvitationRoleForCard,
  extractRoleMatchData,
  getRequestRoleId,
} from "../../utils/teamRequestUtils";

const SELF_ROLE_MATCH_FETCH_LIMIT = 1000;

const FitInviteeName = ({ invitee, onUserClick, onNarrowChange, getDateEl, forceNarrow = false }) => {
  const containerRef = useRef(null);
  const probeRef = useRef(null);
  const fullName = getDisplayName(invitee);
  const abbrevName = invitee ? formatDisplayName(invitee) : fullName;
  const [displayedName, setDisplayedName] = useState(fullName);
  const displayedNameRef = useRef(fullName);
  displayedNameRef.current = displayedName;
  const forceNarrowRef = useRef(forceNarrow);
  forceNarrowRef.current = forceNarrow;

  useLayoutEffect(() => {
    if (fullName === abbrevName) { setDisplayedName(fullName); onNarrowChange?.(false); return; }
    const container = containerRef.current;
    const probe = probeRef.current;
    if (!container || !probe) return;
    const update = () => {
      const isDateAbsolute = displayedNameRef.current !== fullName || forceNarrowRef.current;
      const dateEl = getDateEl?.();
      const dateReservedWidth = isDateAbsolute && dateEl ? dateEl.offsetWidth + 12 : 0; // 12 = gap-3
      probe.textContent = fullName;
      const fits = probe.scrollWidth <= container.clientWidth - dateReservedWidth;
      setDisplayedName(fits ? fullName : abbrevName);
      onNarrowChange?.(!fits);
    };
    const ro = new ResizeObserver(update);
    ro.observe(container);
    update();
    return () => ro.disconnect();
  }, [fullName, abbrevName]);

  return (
    <h4 ref={containerRef} className="font-medium text-base-content leading-[120%] mb-[0.2em] truncate relative">
      <Tooltip content="View profile" wrapperClassName="cursor-pointer hover:text-primary transition-colors">
        <span onClick={onUserClick}>{displayedName}</span>
      </Tooltip>
      <span ref={probeRef} className="invisible absolute whitespace-nowrap pointer-events-none left-0 top-0 font-medium" aria-hidden="true" />
    </h4>
  );
};

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
  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selfRoleMatchMap, setSelfRoleMatchMap] = useState({});
  const [pendingCancelInvitationId, setPendingCancelInvitationId] =
    useState(null);
  const [pendingCancelType, setPendingCancelType] = useState("team");
  const [narrowMap, setNarrowMap] = useState({});
  const dateElsRef = useRef({});

  // ============ Refs ============
  const highlightedRef = useRef(null);

  // ============ Context ============
  const { user: currentUser } = useAuth();
  const { openUserModal } = useUserModal();
  const { openTeamModal } = useTeamModal();
  const hydratedRoleMap = usePolledRequestRoles(invitations, {
    isOpen,
    teamId,
  });

  // ============ Scroll to highlighted invitation ============
  useEffect(() => {
    if (!isOpen || (!highlightInvitationId && !highlightUserId)) return;

    let frameId = null;
    const t = setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }, 150);

    return () => {
      clearTimeout(t);
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, [highlightInvitationId, highlightUserId, invitations.length, isOpen]);

  useEffect(() => {
    const selfRoleIds = [
      ...new Set(
        invitations
          .filter((invitation) => {
            const inviteeId =
              invitation?.invitee?.id ??
              invitation?.invitee_id ??
              null;
            return inviteeId != null && String(inviteeId) === String(currentUser?.id);
          })
          .map((invitation) =>
            invitation?.role?.id ??
            invitation?.roleId ??
            invitation?.role_id ??
            null,
          )
          .filter((roleId) => roleId != null)
          .map(String),
      ),
    ];

    if (!isOpen || !teamId || !currentUser?.id || selfRoleIds.length === 0) {
      setSelfRoleMatchMap({});
      return;
    }

    let cancelled = false;

    const fetchSelfRoleMatches = async () => {
      try {
        const response = await matchingService.getMatchingRolesForTeam(teamId, {
          limit: SELF_ROLE_MATCH_FETCH_LIMIT,
        });

        if (cancelled) return;

        const nextMatchMap = {};

        (response?.data || []).forEach((role) => {
          const roleId = role?.id;
          if (roleId == null || !selfRoleIds.includes(String(roleId))) return;

          nextMatchMap[String(roleId)] = {
            matchScore:
              role?.matchScore ??
              role?.match_score ??
              null,
            matchDetails:
              role?.matchDetails ??
              role?.match_details ??
              null,
          };
        });

        setSelfRoleMatchMap(nextMatchMap);
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not fetch self-invitation role match scores:", error);
          setSelfRoleMatchMap({});
        }
      }
    };

    fetchSelfRoleMatches();

    return () => {
      cancelled = true;
    };
  }, [isOpen, teamId, currentUser?.id, invitations]);

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

      setSuccess(
        pendingCancelType === "role"
          ? "Role invitation canceled successfully!"
          : "Team invitation canceled successfully!",
      );
      setPendingCancelInvitationId(null);
      setPendingCancelType("team");

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Failed to cancel invitation");
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

  // Helper to get avatar URL
  const getAvatarUrl = (user) => {
    return user?.avatar_url || user?.avatarUrl || null;
  };

  // Format invitation date
  const getInvitationDate = (invitation) => {
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

  // ============ Render ============
  const anyNarrow = Object.values(narrowMap).some(Boolean);
  const pendingCancelInvitation = invitations.find(
    (invitation) => String(invitation.id) === String(pendingCancelInvitationId),
  );
  const pendingInviteeName =
    pendingCancelInvitation?.invitee
      ? getDisplayName(pendingCancelInvitation.invitee)
      : "this user";
  const pendingCancelIsRole = pendingCancelType === "role";
  const pendingCancelHasRole =
    !pendingCancelIsRole &&
    Boolean(
      pendingCancelInvitation?.role?.id ??
        pendingCancelInvitation?.roleId ??
        pendingCancelInvitation?.role_id,
    );
  const pendingCancelTitle = pendingCancelIsRole
    ? "Cancel Role Invitation"
    : "Cancel Team Invitation";
  const pendingCancelButtonLabel = pendingCancelIsRole
    ? "Cancel Role Invitation"
    : "Cancel Team Invitation";

  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="leading-[100%]">
          <Users size={20} className="inline-block align-middle mr-1.5 shrink-0 text-primary" />
          <Tooltip content="View team" wrapperClassName="inline">
            <span
              className="font-semibold text-success cursor-pointer hover:text-success/70 transition-colors"
              onClick={() => teamId && openTeamModal(teamId, teamName)}
            >{teamName}</span>
          </Tooltip>
          <span>'s Invitations</span>
        </span>
      }
      itemCount={invitations.length}
      itemName="invitation"
      bylineIcon={<SendHorizontal size={14} className="text-violet-500 shrink-0" />}
      footerText="You can cancel invitations that haven't been responded to."
      error={error}
      onErrorClose={() => setError(null)}
      success={success}
      onSuccessClose={() => setSuccess(null)}
      emptyIcon={User}
      emptyTitle="No pending invitations"
      emptyMessage="Invitations you send to users will appear here."
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
                Keep
              </Button>
              <Button
                variant="error"
                onClick={confirmCancelInvitation}
                disabled={loading}
                icon={<Trash2 size={16} />}
              >
                {loading ? "Canceling..." : pendingCancelButtonLabel}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-base-content/80">
            {pendingCancelIsRole
              ? `Cancel the role invitation for ${pendingInviteeName}?`
              : `Cancel the team invitation for ${pendingInviteeName}? They will no longer be able to respond to it.`}
            {pendingCancelHasRole && (
              <span className="block mt-2 text-warning text-xs">
                This will also cancel the associated role invitation.
              </span>
            )}
          </p>
        </Modal>
      }
    >
      {invitations.map((invitation) => {
        // Get invitee ID for highlighting comparison
        const inviteeId =
          invitation?.invitee?.id ?? invitation?.invitee_id ?? null;
        const roleId = getRequestRoleId(invitation);
        const polledRole = roleId ? hydratedRoleMap[String(roleId)] : null;
        const roleForCard = buildInvitationRoleForCard(invitation, polledRole);
        const isSelfInvitation =
          currentUser?.id === (invitation.invitee?.id ?? invitation.invitee_id);
        const inviteeRoleMatch =
          roleId != null && invitation?.role
            ? extractRoleMatchData(invitation.role)
            : null;
        const selfRoleMatch =
          roleId != null && isSelfInvitation
            ? selfRoleMatchMap[String(roleId)] ?? null
            : null;
        const hasRoleInvitation = roleId != null;
        const isInternalInvitation = Boolean(
          invitation?.isInternal ?? invitation?.is_internal ?? false,
        );

        // Normalize types to avoid "1" vs 1 mismatches
        const isHighlighted =
          (highlightInvitationId != null &&
            String(invitation.id) === String(highlightInvitationId)) ||
          (highlightUserId != null &&
            inviteeId != null &&
            String(inviteeId) === String(highlightUserId));
        const showInviteeUsername =
          invitation.invitee?.username &&
          (getDisplayName(invitation.invitee) !== invitation.invitee?.username ||
            isSyntheticUser(invitation.invitee));
        const showInviteeDemoProfile = isSyntheticUser(invitation.invitee);
        return (
          <div
            key={invitation.id}
            ref={isHighlighted ? highlightedRef : null}
            className={`bg-base-200/30 rounded-lg border border-base-300 p-4 transition-all duration-300 ${
              isHighlighted
                ? "ring-2 ring-green-500/70 ring-offset-2 border-green-400 bg-green-50"
                : ""
            }`}
          >
            {/* Top row: Avatar + Name/Username + Date */}
            <div className="flex items-start gap-3 mb-3 relative">
              {/* Invitee Avatar - Clickable */}
              <Tooltip
                content="View profile"
                wrapperClassName="avatar cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              >
                <div
                  className="w-12 h-12 rounded-full relative overflow-hidden"
                  onClick={() => handleInviteeClick(invitation.invitee?.id)}
                >
                  {getAvatarUrl(invitation.invitee) ? (
                    <img
                      src={getAvatarUrl(invitation.invitee)}
                      alt={getDisplayName(invitation.invitee)}
                      className="object-cover w-full h-full rounded-full"
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback =
                          e.target.parentElement.querySelector(
                            ".avatar-fallback"
                          );
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  {/* Fallback initials */}
                  <div
                    className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                    style={{
                      display: getAvatarUrl(invitation.invitee)
                        ? "none"
                        : "flex",
                    }}
                  >
                    <span className="text-xl font-medium">
                      {getUserInitials(invitation.invitee)}
                    </span>
                  </div>
                  {isSyntheticUser(invitation.invitee) && (
                    <DemoAvatarOverlay textClassName="text-[8px]" />
                  )}
                </div>
              </Tooltip>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                {/* Name - Clickable */}
                <FitInviteeName
                  invitee={invitation.invitee}
                  onUserClick={() => handleInviteeClick(invitation.invitee?.id)}
                  onNarrowChange={(narrow) => setNarrowMap((prev) => {
                    if ((prev[String(invitation.id)] ?? false) === narrow) return prev;
                    return { ...prev, [String(invitation.id)]: narrow };
                  })}
                  getDateEl={() => dateElsRef.current[String(invitation.id)]}
                  forceNarrow={anyNarrow}
                />
                {(anyNarrow || showInviteeUsername || invitation.invitee?.city || invitation.invitee?.country || invitation.invitee?.postal_code || invitation.invitee?.location || isInternalInvitation || showInviteeDemoProfile) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs" style={{ maxHeight: "2.1em" }}>
                    {anyNarrow ? (
                      <div className="flex shrink-0 items-center gap-1 text-base-content/60">
                        <Calendar size={10} className="shrink-0" />
                        <span className="leading-[1.05] whitespace-nowrap">{getInvitationDate(invitation)}</span>
                      </div>
                    ) : showInviteeUsername && (
                      <div className="min-w-0 flex-[0_1_auto] overflow-hidden">
                        <Tooltip content="View profile" wrapperClassName="block truncate leading-[1.05] text-base-content/70 cursor-pointer hover:text-primary transition-colors">
                          <span onClick={() => handleInviteeClick(invitation.invitee?.id)}>
                            @{invitation.invitee.username}
                          </span>
                        </Tooltip>
                      </div>
                    )}
                    {(invitation.invitee?.city || invitation.invitee?.country || invitation.invitee?.postal_code || invitation.invitee?.location) && (
                      <div className="flex min-w-0 max-w-[calc(100%-1.5rem)] flex-[0_1_auto] items-center gap-1 overflow-hidden">
                        <MapPin size={10} className="text-base-content/60 shrink-0" />
                        <span className="min-w-0 truncate text-base-content/60 leading-[1.05]">
                          {[invitation.invitee?.city, invitation.invitee?.country].filter(Boolean).join(", ") || invitation.invitee?.location || invitation.invitee?.postal_code}
                        </span>
                      </div>
                    )}
                    {isInternalInvitation && (
                      <Tooltip
                        content="Already a member of this team"
                        wrapperClassName="flex min-w-0 overflow-hidden items-center gap-0.5 text-base-content/70"
                      >
                        <User size={10} className="flex-shrink-0 text-success" />
                        <span className="leading-[1.05] whitespace-nowrap">Team Member</span>
                      </Tooltip>
                    )}
                    {showInviteeDemoProfile && (
                      <Tooltip
                        content={DEMO_PROFILE_TOOLTIP}
                        wrapperClassName="flex shrink-0 items-center gap-0.5 text-base-content/50"
                      >
                        <FlaskConical size={10} className="flex-shrink-0" />
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>

              {/* Date - top right; absolute (out of flow) when narrow so subline gets full width,
                  but still rendered so its width can be measured for stable name-fit calculation */}
              <div
                ref={(el) => {
                  if (el) dateElsRef.current[String(invitation.id)] = el;
                  else delete dateElsRef.current[String(invitation.id)];
                }}
                className={`flex items-center text-xs text-base-content/60 whitespace-nowrap${anyNarrow ? " absolute opacity-0 pointer-events-none" : ""}`}
              >
                <Calendar size={12} className="mr-1" />
                <span>{getInvitationDate(invitation)}</span>
              </div>
            </div>

            {/* Invitee Bio (if available) */}
            {invitation.invitee?.bio && (
              <div className="mb-3 text-sm text-base-content/80">
                <p className="line-clamp-2">{invitation.invitee.bio}</p>
              </div>
            )}

            {/* Invitation message — speech bubble (only when a message exists) */}
            {invitation.message && (
              <div className="mb-3">
                <p className="text-xs text-base-content/60 mb-1 flex items-center">
                  <SendHorizontal size={12} className="text-info mr-1" />
                  {`Invitation message sent to ${invitation.invitee?.first_name || invitation.invitee?.firstName || invitation.invitee?.username || "recipient"}:`}
                </p>
                <div className="w-fit max-w-full bg-base-200 rounded-lg rounded-bl-none p-3">
                  <p className="text-sm text-base-content/90 leading-relaxed">
                    {(() => {
                      const roleName = invitation.current_filled_role_name ?? invitation.currentFilledRoleName;
                      if (isInternalInvitation && roleName) {
                        const suffix = ` ${roleName}.`;
                        return invitation.message.endsWith(suffix)
                          ? invitation.message.slice(0, -suffix.length)
                          : invitation.message;
                      }
                      return invitation.message;
                    })()}
                  </p>
                  {(invitation.role || invitation.roleId || invitation.role_id) && (
                    <div className="mt-3 max-w-[300px]">
                      <VacantRoleCard
                        role={roleForCard}
                        team={{ id: teamId, name: teamName }}
                        matchScore={
                          inviteeRoleMatch?.matchScore ??
                          selfRoleMatch?.matchScore ??
                          null
                        }
                        matchDetails={
                          inviteeRoleMatch?.matchDetails ??
                          selfRoleMatch?.matchDetails ??
                          null
                        }
                        canManage={false}
                        canManageStatus={false}
                        isTeamMember={true}
                        viewAsUserId={invitation.invitee?.id ?? invitation.invitee_id}
                        viewAsUser={invitation.invitee}
                        hideActions={true}
                      />
                    </div>
                  )}
                  {isInternalInvitation && (invitation.current_filled_role_id ?? invitation.currentFilledRoleId) && (
                    <div className="mt-3 max-w-[300px]">
                      <VacantRoleCard
                        role={{
                          id: invitation.current_filled_role_id ?? invitation.currentFilledRoleId,
                          role_name: invitation.current_filled_role_name ?? invitation.currentFilledRoleName,
                          roleName: invitation.current_filled_role_name ?? invitation.currentFilledRoleName,
                          status: "filled",
                          filled_by: invitation.invitee?.id ?? invitation.invitee_id,
                          filled_by_user: invitation.invitee ?? null,
                          is_synthetic: invitation.role_is_synthetic ?? false,
                          isSynthetic: invitation.role_is_synthetic ?? false,
                        }}
                        team={{ id: teamId, name: teamName }}
                        matchScore={null}
                        canManage={false}
                        canManageStatus={false}
                        isTeamMember={true}
                        hideActions={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Role card — shown bare (no bubble) when there's a role but no message */}
            {!invitation.message && (invitation.role || invitation.roleId || invitation.role_id) && (
              <div className="mb-3 max-w-[300px]">
                <VacantRoleCard
                  role={roleForCard}
                  team={{ id: teamId, name: teamName }}
                  matchScore={
                    inviteeRoleMatch?.matchScore ??
                    selfRoleMatch?.matchScore ??
                    null
                  }
                  matchDetails={
                    inviteeRoleMatch?.matchDetails ??
                    selfRoleMatch?.matchDetails ??
                    null
                  }
                  canManage={false}
                  canManageStatus={false}
                  isTeamMember={true}
                  viewAsUserId={invitation.invitee?.id ?? invitation.invitee_id}
                  viewAsUser={invitation.invitee}
                  hideActions={true}
                />
              </div>
            )}


            {/* Bottom row: Inviter info (left) + Action Button (right) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-8 -mx-4 -mb-4 px-4 pb-4 pt-3 border-t border-base-200 bg-base-100/80 rounded-b-lg">
              {/* Inviter info (left) - Using InlineUserLink */}
              {invitation.inviter ? (
                <InvitedByLink
                  user={invitation.inviter}
                  className="min-w-0 flex-[1_1_12rem] overflow-hidden"
                />
              ) : invitation.inviter_username ? (
                <span className="min-w-0 flex-[1_1_12rem] overflow-hidden truncate text-xs text-base-content/50">
                  Invited by {invitation.inviter_username}
                </span>
              ) : (
                <div className="min-w-0 flex-[1_1_12rem] overflow-hidden" />
              )}

              {/* Action Button (right) */}
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                {hasRoleInvitation && (
                  <Tooltip content="Cancel role invitation only">
                    <Button
                      variant="errorOutline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id, "role")}
                      disabled={loading}
                      icon={<XCircle size={14} />}
                    >
                      {loading ? "Canceling..." : "Cancel Role Invite"}
                    </Button>
                  </Tooltip>
                )}
                {(!hasRoleInvitation || !isInternalInvitation) && (
                  <Tooltip content={hasRoleInvitation ? "Cancel team & role invitation" : "Cancel team invitation"}>
                    <Button
                      variant="errorOutline"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id, "team")}
                      disabled={loading}
                      icon={<XCircle size={14} />}
                    >
                      {loading ? "Canceling..." : hasRoleInvitation ? "Cancel Role + Team Invite" : "Cancel Invite"}
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </RequestListModal>
  );
};

export default TeamInvitesModal;
