import React, { useState, useEffect, useRef } from "react";
import { User, MapPin, Calendar, SendHorizontal } from "lucide-react";
import RequestListModal from "../common/RequestListModal";
import Button from "../common/Button";
import InlineUserLink, { InvitedByLink } from "../users/InlineUserLink";
import VacantRoleCard from "./VacantRoleCard";
import { matchingService } from "../../services/matchingService";
import { useAuth } from "../../contexts/AuthContext";
import { useUserModal } from "../../contexts/UserModalContext";
import { getUserInitials, getDisplayName } from "../../utils/userHelpers";
import { format } from "date-fns";

const ROLE_CANDIDATE_FETCH_MIN_LIMIT = 20;
const SELF_ROLE_MATCH_FETCH_LIMIT = 1000;

const extractCandidateMatchData = (candidateLike) => {
  const rawScore =
    candidateLike?.matchScore ??
    candidateLike?.match_score ??
    candidateLike?.bestMatchScore ??
    candidateLike?.best_match_score ??
    null;
  const numericScore = Number(rawScore);

  return {
    matchScore: Number.isFinite(numericScore) ? numericScore : null,
    matchDetails:
      candidateLike?.matchDetails ??
      candidateLike?.match_details ??
      null,
  };
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
 * @param {string|number|null} highlightUserId - User ID to scroll to + highlight (optional)
 */
const TeamInvitesModal = ({
  isOpen,
  onClose,
  teamId = null,
  invitations = [],
  onCancelInvitation,
  teamName,
  highlightUserId = null,
}) => {
  // ============ State ============
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [roleCandidateMatchMap, setRoleCandidateMatchMap] = useState({});
  const [selfRoleMatchMap, setSelfRoleMatchMap] = useState({});

  // ============ Refs ============
  const highlightedRef = useRef(null);

  // ============ Context ============
  const { user: currentUser } = useAuth();
  // Get global user modal opener (for clicking on invitee avatar/name)
  const { openUserModal } = useUserModal();

  // ============ Debug Logging ============
  useEffect(() => {
    if (invitations && invitations.length > 0) {
      console.log("TeamInvitesModal - Invitations data:", invitations);
      console.log("First invitation date fields:", {
        created_at: invitations[0]?.created_at,
        createdAt: invitations[0]?.createdAt,
        date: invitations[0]?.date,
        sent_at: invitations[0]?.sent_at,
      });
      console.log("First invitation invitee avatar fields:", {
        avatar_url: invitations[0]?.invitee?.avatar_url,
        avatarUrl: invitations[0]?.invitee?.avatarUrl,
        first_name: invitations[0]?.invitee?.first_name,
        last_name: invitations[0]?.invitee?.last_name,
      });
      console.log("First invitation inviter fields:", {
        inviter: invitations[0]?.inviter,
        inviter_username: invitations[0]?.inviter_username,
      });
    }
  }, [invitations]);

  // ============ Scroll to highlighted invitation ============
  useEffect(() => {
    if (isOpen && highlightUserId && highlightedRef.current) {
      // Small delay to ensure modal is rendered
      const t = setTimeout(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      return () => clearTimeout(t);
    }
  }, [isOpen, highlightUserId]);

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

  useEffect(() => {
    if (!isOpen || invitations.length === 0) {
      setRoleCandidateMatchMap({});
      return;
    }

    const inviteesByRole = invitations.reduce((acc, invitation) => {
      const roleId =
        invitation?.role?.id ??
        invitation?.roleId ??
        invitation?.role_id ??
        null;
      const inviteeId =
        invitation?.invitee?.id ??
        invitation?.invitee_id ??
        null;

      if (roleId == null || inviteeId == null) {
        return acc;
      }

      const roleKey = String(roleId);
      if (!acc.has(roleKey)) {
        acc.set(roleKey, new Set());
      }
      acc.get(roleKey).add(String(inviteeId));
      return acc;
    }, new Map());

    if (inviteesByRole.size === 0) {
      setRoleCandidateMatchMap({});
      return;
    }

    let cancelled = false;

    const fetchCandidateMatches = async () => {
      const roleEntries = [...inviteesByRole.entries()];

      try {
        const results = await Promise.allSettled(
          roleEntries.map(([roleId, inviteeIds]) =>
            matchingService.getMatchingCandidates(roleId, {
              limit: Math.max(inviteeIds.size, ROLE_CANDIDATE_FETCH_MIN_LIMIT),
            }),
          ),
        );

        if (cancelled) return;

        const nextMatchMap = {};

        results.forEach((result, index) => {
          if (result.status !== "fulfilled") return;

          const [roleId] = roleEntries[index];
          const roleMatches = {};

          (result.value?.data || []).forEach((candidate) => {
            const candidateId =
              candidate?.id ??
              candidate?.userId ??
              candidate?.user_id ??
              null;
            if (candidateId == null) return;

            roleMatches[String(candidateId)] = extractCandidateMatchData(candidate);
          });

          nextMatchMap[String(roleId)] = roleMatches;
        });

        setRoleCandidateMatchMap(nextMatchMap);
      } catch (error) {
        if (!cancelled) {
          console.warn("Could not fetch invitation role match scores:", error);
          setRoleCandidateMatchMap({});
        }
      }
    };

    fetchCandidateMatches();

    return () => {
      cancelled = true;
    };
  }, [isOpen, invitations]);

  // ============ Handlers ============

  const handleCancelInvitation = async (invitationId) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onCancelInvitation(invitationId);

      setSuccess("Invitation canceled successfully!");

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
  return (
    <RequestListModal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitations sent out to"
      subtitle={teamName}
      itemCount={invitations.length}
      itemName="invitation"
      footerText="You can cancel invitations that haven't been responded to."
      error={error}
      onErrorClose={() => setError(null)}
      success={success}
      onSuccessClose={() => setSuccess(null)}
      emptyIcon={User}
      emptyTitle="No pending invitations"
      emptyMessage="Invitations you send to users will appear here."
      // No extraModals needed - UserModalContext handles it globally
    >
      {invitations.map((invitation) => {
        // Get invitee ID for highlighting comparison
        const inviteeId =
          invitation?.invitee?.id ?? invitation?.invitee_id ?? null;
        const roleId =
          invitation?.role?.id ??
          invitation?.roleId ??
          invitation?.role_id ??
          null;
        const isSelfInvitation =
          currentUser?.id === (invitation.invitee?.id ?? invitation.invitee_id);
        const inviteeRoleMatch =
          roleId != null && inviteeId != null
            ? roleCandidateMatchMap[String(roleId)]?.[String(inviteeId)] ?? null
            : null;
        const selfRoleMatch =
          roleId != null && isSelfInvitation
            ? selfRoleMatchMap[String(roleId)] ?? null
            : null;

        // Normalize types to avoid "1" vs 1 mismatches
        const isHighlighted =
          highlightUserId != null &&
          inviteeId != null &&
          String(inviteeId) === String(highlightUserId);

        return (
          <div
            key={invitation.id}
            ref={isHighlighted ? highlightedRef : null}
            className={`bg-base-200/30 rounded-lg border border-base-300 p-4 transition-all duration-300 ${
              isHighlighted
                ? "ring-2 ring-primary ring-offset-2 bg-primary/5"
                : ""
            }`}
          >
            {/* Top row: Avatar + Name/Username + Date */}
            <div className="flex items-start gap-3 mb-3">
              {/* Invitee Avatar - Clickable */}
              <div
                className="avatar cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                onClick={() => handleInviteeClick(invitation.invitee?.id)}
                title="View profile"
              >
                <div className="w-10 h-10 rounded-full relative">
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
                    className="avatar-fallback bg-primary text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                    style={{
                      display: getAvatarUrl(invitation.invitee)
                        ? "none"
                        : "flex",
                    }}
                  >
                    <span className="text-sm font-medium">
                      {getUserInitials(invitation.invitee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                {/* Name - Clickable */}
                <h4
                  className="font-medium text-base-content cursor-pointer hover:text-primary transition-colors leading-[120%] mb-[0.2em]"
                  onClick={() => handleInviteeClick(invitation.invitee?.id)}
                  title="View profile"
                >
                  {getDisplayName(invitation.invitee)}
                </h4>
                {/* Username */}
                {invitation.invitee?.username && (
                  <p className="text-sm text-base-content/70">
                    @{invitation.invitee.username}
                  </p>
                )}
              </div>

              {/* Date - top right */}
              <div className="flex items-center text-xs text-base-content/60 whitespace-nowrap">
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

            {/* Invitation Message (if any) */}
            {invitation.message && (
              <div className="mb-3">
                <p className="text-xs text-base-content/60 mb-0.5 flex items-center">
                  <SendHorizontal size={12} className="text-info mr-1" />
                  Invitation message:
                </p>
                <p className="text-sm text-base-content/90 leading-relaxed">
                  {invitation.message}
                </p>
              </div>
            )}

            {/* Vacant role card — shown when invitation targets a specific role */}
            {(invitation.role || invitation.roleId || invitation.role_id) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <VacantRoleCard
                  role={invitation.role || { id: invitation.roleId ?? invitation.role_id, roleName: invitation.roleName ?? invitation.role_name }}
                  team={{ id: teamId, name: teamName }}
                  matchScore={
                    inviteeRoleMatch?.matchScore ??
                    selfRoleMatch?.matchScore ??
                    invitation.role?.matchScore ??
                    invitation.role?.match_score ??
                    null
                  }
                  matchDetails={
                    inviteeRoleMatch?.matchDetails ??
                    selfRoleMatch?.matchDetails ??
                    invitation.role?.matchDetails ??
                    invitation.role?.match_details ??
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

            {/* Location (if available) */}
            {(invitation.invitee?.location ||
              invitation.invitee?.postal_code) && (
              <div className="flex items-center text-xs text-base-content/60 mb-3">
                <MapPin size={12} className="mr-1" />
                <span>
                  {invitation.invitee?.location ||
                    invitation.invitee?.postal_code}
                </span>
              </div>
            )}

            {/* Bottom row: Inviter info (left) + Action Button (right) */}
            <div className="flex items-center justify-between gap-3">
              {/* Inviter info (left) - Using InlineUserLink */}
              {invitation.inviter ? (
                <InvitedByLink user={invitation.inviter} />
              ) : invitation.inviter_username ? (
                <span className="text-xs text-base-content/50">
                  Invited by {invitation.inviter_username}
                </span>
              ) : (
                <div />
              )}

              {/* Action Button (right) */}
              <div className="flex justify-end">
                <Button
                  variant="errorOutline"
                  size="sm"
                  onClick={() => handleCancelInvitation(invitation.id)}
                  disabled={loading}
                >
                  {loading ? "Canceling..." : "Cancel Invitation"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </RequestListModal>
  );
};

export default TeamInvitesModal;
