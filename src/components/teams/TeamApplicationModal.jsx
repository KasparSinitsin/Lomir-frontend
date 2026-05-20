import React, { lazy, Suspense, useState, useEffect } from "react";
import {
  Send,
  Save,
  Users,
  SendHorizontal,
  UserSearch,
  MapPin,
  Globe,
  Check,
  FlaskConical,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { vacantRoleService } from "../../services/vacantRoleService";
import { teamService } from "../../services/teamService";
import Modal from "../common/Modal";
import Button from "../common/Button";
import ScreenAlert from "../common/ScreenAlert";
import TeamDetailsModal from "./TeamDetailsModal";
import CardMetaItem from "../common/CardMetaItem";
import CardMetaRow from "../common/CardMetaRow";
import RoleBadgePill from "../common/RoleBadgePill";
import Tooltip from "../common/Tooltip";
import DemoAvatarOverlay from "../users/DemoAvatarOverlay";
import {
  DEMO_ROLE_TOOLTIP,
  DEMO_TEAM_TOOLTIP,
  isSyntheticRole,
  isSyntheticTeam,
} from "../../utils/userHelpers";

const VacantRoleDetailsModal = lazy(() => import("./VacantRoleDetailsModal"));

const idsMatch = (left, right) =>
  left != null && right != null && String(left) === String(right);

/**
 * TeamApplicationModal Component
 *
 * Modal for a user to apply to join a team.
 * Styled consistently with TeamInviteModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Object} team - Team data object
 * @param {Function} onSubmit - Callback when application is submitted
 * @param {boolean} loading - Whether submission is in progress
 */
const TeamApplicationModal = ({
  isOpen,
  onClose,
  team,
  teamId = null,
  initialRoleId = null,
  onSubmit,
  loading = false,
  isInternal = false,
}) => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [hydratedTeam, setHydratedTeam] = useState(null);

  // Vacant role selection state
  const [vacantRoles, setVacantRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [detailsRole, setDetailsRole] = useState(null);
  const [isRoleSectionExpanded, setIsRoleSectionExpanded] = useState(false);

  // Resolve teamId
  const effectiveTeamId =
    teamId ?? team?.id ?? team?.teamId ?? team?.team_id ?? null;
  const displayTeam = hydratedTeam ? { ...team, ...hydratedTeam } : team;

  // Fetch open vacant roles when modal opens
  useEffect(() => {
    if (!isOpen || !effectiveTeamId) {
      setVacantRoles([]);
      setLoadingRoles(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const response = await vacantRoleService.getVacantRoles(
          effectiveTeamId,
          "open"
        );
        setVacantRoles(response.data || []);
      } catch (err) {
        console.warn("Could not fetch vacant roles:", err);
        setVacantRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [isOpen, effectiveTeamId]);

  useEffect(() => {
    if (!isOpen) {
      setHydratedTeam(null);
      return;
    }

    if (!effectiveTeamId) return;

    const hasMemberCount =
      team?.current_members_count !== undefined ||
      team?.currentMembersCount !== undefined ||
      team?.member_count !== undefined ||
      team?.memberCount !== undefined ||
      team?.members_count !== undefined ||
      team?.membersCount !== undefined ||
      Array.isArray(team?.members);
    const hasMaxMembers =
      team?.max_members !== undefined || team?.maxMembers !== undefined;

    if (hasMemberCount && hasMaxMembers) {
      setHydratedTeam(null);
      return;
    }

    let cancelled = false;

    const fetchTeamDetails = async () => {
      try {
        const response = await teamService.getTeamById(effectiveTeamId);
        if (cancelled) return;
        setHydratedTeam(response?.data ?? response ?? null);
      } catch (err) {
        console.warn("Could not fetch team details for application modal:", err);
        if (!cancelled) setHydratedTeam(null);
      }
    };

    fetchTeamDetails();

    return () => {
      cancelled = true;
    };
  }, [isOpen, effectiveTeamId, team]);

  // Pre-select the initial role when roles load
  useEffect(() => {
    if (isOpen && initialRoleId && vacantRoles.length > 0) {
      const exists = vacantRoles.some((r) => idsMatch(r.id, initialRoleId));
      setSelectedRoleId(exists ? initialRoleId : null);
    } else if (isOpen && !initialRoleId) {
      setSelectedRoleId(null);
    }
  }, [isOpen, initialRoleId, vacantRoles]);

  useEffect(() => {
    if (!isOpen) {
      setIsRoleSectionExpanded(false);
      return;
    }

    setIsRoleSectionExpanded(Boolean(initialRoleId));
  }, [isOpen, initialRoleId, effectiveTeamId]);

  // ============ Helper Functions ============

  const getTeamAvatar = () => {
    return (
      displayTeam?.teamavatar_url ||
      displayTeam?.teamavatarUrl ||
      displayTeam?.avatar_url ||
      displayTeam?.avatarUrl ||
      null
    );
  };

  const getMemberCount = () => {
    return (
      displayTeam?.current_members_count ??
      displayTeam?.currentMembersCount ??
      displayTeam?.member_count ??
      displayTeam?.memberCount ??
      displayTeam?.members_count ??
      displayTeam?.membersCount ??
      displayTeam?.members?.length ??
      0
    );
  };

  const getMaxMembers = () => {
    const max = displayTeam?.max_members ?? displayTeam?.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  const getTeamLocation = () => {
    const isRemote = displayTeam?.isRemote ?? displayTeam?.is_remote;
    if (isRemote) return "Remote";

    const parts = [displayTeam?.city, displayTeam?.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const getTeamInitials = () => {
    const name = displayTeam?.name;
    if (!name || typeof name !== "string") return "?";

    const words = name.trim().split(/\s+/);

    if (words.length === 1) return name.slice(0, 2).toUpperCase();

    return words
      .slice(0, 3)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Get role initials (matching VacantRoleCard pattern)
  const getRoleInitials = (roleName) => {
    const name = roleName || "Vacant Role";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get role location text
  const getRoleLocation = (role) => {
    const isRemote = role.isRemote ?? role.is_remote;
    if (isRemote) return "Remote";
    const parts = [role.city, role.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleRoleCardClick = (roleId) => {
    setSelectedRoleId((prev) => (idsMatch(prev, roleId) ? null : roleId));
  };

  const handleRoleDetailsKeyDown = (event, role) => {
    if (event.target.closest("button")) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    setDetailsRole(role);
  };

  // ============ Handlers ============

  const handleTeamClick = () => {
    if (displayTeam?.id) setIsTeamDetailsOpen(true);
  };

  const handleSubmit = async (saveAsDraft = false) => {
    if (!message.trim() && !saveAsDraft) {
      setError("Please write a message to the team owner");
      return;
    }

    try {
      setError(null);
      await onSubmit({
        message: message.trim(),
        isDraft: saveAsDraft,
        roleId: selectedRoleId || null,
      });

      if (saveAsDraft) {
        setSuccess("Draft saved successfully");
        setIsDraft(true);
      } else {
        setSuccess(
          isInternal
            ? "Role application sent to the team owner and admins!"
            : "Application sent successfully!"
        );
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to process application");
    }
  };

  const handleClose = () => {
    setMessage("");
    setError(null);
    setSuccess(null);
    setIsDraft(false);
    setSelectedRoleId(null);
    setDetailsRole(null);
    setIsRoleSectionExpanded(false);
    onClose();
  };

  // ============ Render ============

  const customHeader = (
    <div className="flex items-center gap-3">
      {isInternal ? (
        <UserSearch className="text-primary" size={24} />
      ) : (
        <SendHorizontal className="text-primary" size={24} />
      )}
      <div>
        <h2 className="text-xl font-medium text-primary">
          {isInternal ? "Apply to fill this role within your team" : "Apply to join this Team"}
        </h2>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        variant="ghost"
        onClick={() => handleSubmit(true)}
        disabled={loading} // draft can be saved even if empty, if you want it strict: loading || !message.trim()
        icon={<Save size={16} />}
      >
        Save Draft
      </Button>

      <Button variant="errorOutline" onClick={handleClose} disabled={loading}>
        Cancel
      </Button>

      <Button
        variant="successOutline"
        onClick={() => handleSubmit(false)}
        disabled={loading || !message.trim() || (isInternal && !selectedRoleId)}
        icon={<Send size={16} />}
      >
        {loading ? "Sending..." : isInternal ? "Apply to fill this role within your team" : "Send Application"}
      </Button>
    </div>
  );

  const teamLocation = getTeamLocation();
  const teamIsRemote = displayTeam?.isRemote ?? displayTeam?.is_remote;
  const showDemoTeam = isSyntheticTeam(displayTeam);
  const shouldShowRolePicker =
    loadingRoles || vacantRoles.length > 0 || isRoleSectionExpanded;
  const roleAvailabilityLabel =
    vacantRoles.length === 1
      ? "1 open role available"
      : `${vacantRoles.length} open roles available`;
  const selectedRole =
    vacantRoles.find((role) => idsMatch(role.id, selectedRoleId)) ?? null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={customHeader}
        footer={footer}
        position="center"
        size="default"
        closeOnBackdrop={!loading}
        closeOnEscape={!loading}
        showCloseButton={true}
      >
        <ScreenAlert
          alerts={[
            error && {
              type: "error",
              message: error,
              onClose: () => setError(null),
            },
            success && {
              type: "success",
              message: success,
              onClose: () => setSuccess(null),
            },
          ]}
        />

        <div className="space-y-5 bg-transparent">
          {/* Team info (click + hover like TeamInvitationDetailsModal) */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div
              className="flex items-start space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleTeamClick}
              title="View team details"
            >
              <div className="avatar">
                <div className="w-14 h-14 rounded-full relative overflow-hidden">
                  {getTeamAvatar() ? (
                    <img
                      src={getTeamAvatar()}
                      alt={displayTeam?.name || "Team"}
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

                  <div
                    className="avatar-fallback bg-[var(--color-primary-focus)] text-primary-content flex items-center justify-center w-full h-full rounded-full absolute inset-0"
                    style={{ display: getTeamAvatar() ? "none" : "flex" }}
                  >
                    <span className="text-xl font-medium">
                      {getTeamInitials()}
                    </span>
                  </div>
                  {showDemoTeam && (
                    <DemoAvatarOverlay
                      textClassName="text-[7px]"
                      textTranslateClassName="-translate-y-[3px]"
                    />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-base-content hover:text-primary transition-colors leading-[120%] mb-[0.2em]">
                  {displayTeam?.name || "Unknown Team"}
                </h4>
                <CardMetaRow className="text-sm">
                  <CardMetaItem icon={Users}>
                    {getMemberCount()}/{getMaxMembers()}
                  </CardMetaItem>
                  {teamLocation && (
                    <CardMetaItem icon={teamIsRemote ? Globe : MapPin}>
                      {teamLocation}
                    </CardMetaItem>
                  )}
                  {showDemoTeam && (
                    <Tooltip
                      content={DEMO_TEAM_TOOLTIP}
                      wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                    >
                      <FlaskConical
                        size={10}
                        className="text-base-content/50 shrink-0"
                      />
                    </Tooltip>
                  )}
                </CardMetaRow>
              </div>
            </div>
          </div>

          {displayTeam?.description && (
            <p className="text-sm text-base-content/80">{displayTeam.description}</p>
          )}

          {/* Vacant role selection */}
          {shouldShowRolePicker && (
            <div>
              <button
                type="button"
                className="flex w-full items-center justify-between text-xs text-base-content/60 mb-2 hover:text-base-content/80 transition-colors"
                onClick={() => setIsRoleSectionExpanded((value) => !value)}
                aria-expanded={isRoleSectionExpanded}
              >
                <span className="flex min-w-0 items-center">
                  <UserSearch size={12} className="text-orange-500 mr-1" />
                  <span className="truncate">
                    Select a role you want to fill in this team:
                  </span>
                </span>
                <span className="ml-2 flex items-center gap-1 text-base-content/40">
                  {!isRoleSectionExpanded && vacantRoles.length > 0 && (
                    <span className="whitespace-nowrap">
                      {roleAvailabilityLabel}
                    </span>
                  )}
                  {isRoleSectionExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </span>
              </button>

              {!isRoleSectionExpanded ? (
                selectedRole ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailsRole(selectedRole)}
                    onKeyDown={(event) =>
                      handleRoleDetailsKeyDown(event, selectedRole)
                    }
                    className="flex items-start gap-3 rounded-xl bg-amber-100 p-3 text-left shadow ring-2 ring-amber-400 transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full relative overflow-hidden">
                        <div className="avatar-fallback bg-amber-500 text-white flex items-center justify-center w-full h-full rounded-full absolute inset-0">
                          <span className="text-sm font-medium">
                            {getRoleInitials(
                              selectedRole.roleName ??
                                selectedRole.role_name ??
                                "Vacant Role",
                            )}
                          </span>
                        </div>
                        {isSyntheticRole(selectedRole) && (
                          <DemoAvatarOverlay
                            textClassName="text-[6px]"
                            textTranslateClassName="-translate-y-[3px]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-[1px]">
                      <div className="flex min-w-0 items-center gap-1">
                        <h3 className="min-w-0 flex-1 truncate font-medium text-sm leading-[120%]">
                          {selectedRole.roleName ??
                            selectedRole.role_name ??
                            "Vacant Role"}
                        </h3>
                        <div className="shrink-0 ml-1">
                          <RoleBadgePill
                            icon={Check}
                            label="Selected"
                            badgeColorClass="bg-amber-800 text-white"
                            interactive
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRoleCardClick(selectedRole.id);
                            }}
                            className="shrink-0"
                          />
                        </div>
                      </div>

                      {(getRoleLocation(selectedRole) ||
                        isSyntheticRole(selectedRole)) && (
                        <CardMetaRow>
                          {getRoleLocation(selectedRole) && (
                            <CardMetaItem
                              icon={
                                (selectedRole.isRemote ??
                                  selectedRole.is_remote)
                                  ? Globe
                                  : MapPin
                              }
                            >
                              {getRoleLocation(selectedRole)}
                            </CardMetaItem>
                          )}
                          {isSyntheticRole(selectedRole) && (
                            <Tooltip
                              content={DEMO_ROLE_TOOLTIP}
                              wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                            >
                              <FlaskConical
                                size={10}
                                className="text-base-content/50 shrink-0"
                              />
                            </Tooltip>
                          )}
                        </CardMetaRow>
                      )}
                    </div>
                  </div>
                ) : null
              ) : loadingRoles ? (
                <div className="flex justify-center py-6">
                  <div className="loading loading-spinner loading-md text-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto p-1">
                  {vacantRoles.map((role) => {
                    const roleName =
                      role.roleName ?? role.role_name ?? "Vacant Role";
                    const isSelected = idsMatch(selectedRoleId, role.id);
                    const locationText = getRoleLocation(role);
                    const isRemote = role.isRemote ?? role.is_remote;
                    const showDemoRole = isSyntheticRole(role);

                    return (
                      <div
                        role="button"
                        tabIndex={0}
                        key={role.id}
                        onClick={() => setDetailsRole(role)}
                        onKeyDown={(event) =>
                          handleRoleDetailsKeyDown(event, role)
                        }
                        className={`flex items-start gap-4 p-4 rounded-xl text-left shadow cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                          ${
                            isSelected
                              ? "bg-amber-100 ring-2 ring-amber-400 shadow-md"
                              : "bg-amber-50 hover:bg-amber-100/70 hover:shadow-md"
                          }`}
                      >
                        <div className="avatar">
                          <div className="w-14 h-14 rounded-full relative overflow-hidden">
                            <div className="avatar-fallback bg-amber-500 text-white flex items-center justify-center w-full h-full rounded-full absolute inset-0">
                              <span className="text-xl">
                                {getRoleInitials(roleName)}
                              </span>
                            </div>
                            {showDemoRole && (
                              <DemoAvatarOverlay
                                textClassName="text-[7px]"
                                textTranslateClassName="-translate-y-[3px]"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 pt-[1px]">
                          <div className="flex flex-col">
                            <div className="flex min-w-0 items-center gap-1">
                              <h3 className="min-w-0 flex-1 truncate font-medium text-base leading-[120%]">
                                {roleName}
                              </h3>
                              <div className="shrink-0 ml-1">
                                <RoleBadgePill
                                  icon={isSelected ? Check : UserSearch}
                                  label={isSelected ? "Selected" : "Select"}
                                  badgeColorClass={
                                    isSelected
                                      ? "bg-amber-800 text-white"
                                      : "badge-role-vacant"
                                  }
                                  interactive
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleRoleCardClick(role.id);
                                  }}
                                  className="shrink-0"
                                />
                              </div>
                            </div>

                            {locationText && (
                              <CardMetaRow>
                                <CardMetaItem icon={isRemote ? Globe : MapPin}>
                                  {locationText}
                                </CardMetaItem>
                                {showDemoRole && (
                                  <Tooltip
                                    content={DEMO_ROLE_TOOLTIP}
                                    wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                                  >
                                    <FlaskConical
                                      size={10}
                                      className="text-base-content/50 shrink-0"
                                    />
                                  </Tooltip>
                                )}
                              </CardMetaRow>
                            )}
                            {!locationText && showDemoRole && (
                              <CardMetaRow>
                                <Tooltip
                                  content={DEMO_ROLE_TOOLTIP}
                                  wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                                >
                                  <FlaskConical
                                    size={10}
                                    className="text-base-content/50 shrink-0"
                                  />
                                </Tooltip>
                              </CardMetaRow>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {isRoleSectionExpanded && !loadingRoles && selectedRoleId === null && vacantRoles.length > 0 && !isInternal && (
                <p className="text-xs text-base-content/40 mt-1.5">
                  No role selected — your application will be sent as a general team application.
                </p>
              )}
              {isRoleSectionExpanded && !loadingRoles && selectedRoleId === null && vacantRoles.length > 0 && isInternal && (
                <p className="text-xs text-warning/70 mt-1.5">
                  Please select a role to apply for.
                </p>
              )}
            </div>
          )}

          {/* Application message textarea */}
          <div>
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              <Send size={12} className="text-info mr-1" />
              {isInternal ? "Your message to the owner and admins:" : "Your message to the team:"}
            </p>

            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isInternal
                  ? "Tell the owner and admins why you'd like to fill this role and what relevant experience you bring..."
                  : "Tell the team why you'd like to join, what skills you bring, and what you hope to contribute..."}
                className="textarea textarea-bordered w-full h-32 resize-none text-sm pb-6"
                disabled={loading}
                maxLength={500}
              />

              <span className="absolute bottom-2 left-3 text-sm text-base-content/40 pointer-events-none">
                {message.length}/500 characters
                {isDraft && (
                  <span className="ml-2 text-warning">• Draft saved</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Optional: Team Details Modal (same pattern as TeamInvitationDetailsModal) */}
      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={displayTeam?.id}
        initialTeamData={displayTeam}
        onClose={() => setIsTeamDetailsOpen(false)}
        isFromSearch={true}
      />

      <Suspense fallback={null}>
        {detailsRole && (
          <VacantRoleDetailsModal
            isOpen={Boolean(detailsRole)}
            onClose={() => setDetailsRole(null)}
            team={displayTeam}
            role={detailsRole}
            isTeamMember={isInternal}
            hideActions={true}
          />
        )}
      </Suspense>
    </>
  );
};

export default TeamApplicationModal;
