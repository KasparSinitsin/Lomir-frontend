import React, { useState, useEffect } from "react";
import { Send, Save, Users, SendHorizontal, UserSearch, MapPin, Globe, Check, CircleDot } from "lucide-react";
import { vacantRoleService } from "../../services/vacantRoleService";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import TeamDetailsModal from "./TeamDetailsModal";

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

  // Vacant role selection state
  const [vacantRoles, setVacantRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  // Resolve teamId
  const effectiveTeamId =
    teamId ?? team?.id ?? team?.teamId ?? team?.team_id ?? null;

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

  // Pre-select the initial role when roles load
  useEffect(() => {
    if (isOpen && initialRoleId && vacantRoles.length > 0) {
      const exists = vacantRoles.some((r) => r.id === initialRoleId);
      setSelectedRoleId(exists ? initialRoleId : null);
    } else if (isOpen && !initialRoleId) {
      setSelectedRoleId(null);
    }
  }, [isOpen, initialRoleId, vacantRoles]);

  // ============ Helper Functions ============

  const getTeamAvatar = () => {
    return (
      team?.teamavatar_url ||
      team?.teamavatarUrl ||
      team?.avatar_url ||
      team?.avatarUrl ||
      null
    );
  };

  const getMemberCount = () => {
    return (
      team?.current_members_count ??
      team?.currentMembersCount ??
      team?.member_count ??
      team?.memberCount ??
      team?.members?.length ??
      0
    );
  };

  const getMaxMembers = () => {
    const max = team?.max_members ?? team?.maxMembers;
    return max === null || max === undefined ? "∞" : max;
  };

  const getTeamInitials = () => {
    const name = team?.name;
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
    setSelectedRoleId((prev) => (prev === roleId ? null : roleId));
  };

  // ============ Handlers ============

  const handleTeamClick = () => {
    if (team?.id) setIsTeamDetailsOpen(true);
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
          {isInternal ? "Apply to fill a role in your team" : "Apply to join this Team"}
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
        {loading ? "Sending..." : isInternal ? "Send Role Application" : "Send Application"}
      </Button>
    </div>
  );

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
        <div className="space-y-5 bg-transparent">
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}

          {success && (
            <Alert
              type="success"
              message={success}
              onClose={() => setSuccess(null)}
            />
          )}

          {/* Team info (click + hover like TeamInvitationDetailsModal) */}
          <div className="flex items-start justify-between gap-4 mb-5">
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
                      alt={team?.name || "Team"}
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
                  {team?.name || "Unknown Team"}
                </h4>
                <p className="text-sm text-base-content/70 flex items-center">
                  <Users size={14} className="mr-1 text-primary" />
                  {getMemberCount()}/{getMaxMembers()}
                </p>
              </div>
            </div>
          </div>

          {team?.description && (
            <p className="text-sm text-base-content/80">{team.description}</p>
          )}

          {/* Vacant role selection */}
          {(loadingRoles || vacantRoles.length > 0) && (
            <div>
              <p className="text-xs text-base-content/60 mb-2 flex items-center">
                <UserSearch size={12} className="text-amber-500 mr-1" />
                Select a role you want to fill in this team:
              </p>

              {loadingRoles ? (
                <div className="flex justify-center py-6">
                  <div className="loading loading-spinner loading-md text-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {vacantRoles.map((role) => {
                    const roleName = role.roleName ?? role.role_name ?? "Vacant Role";
                    const isSelected = selectedRoleId === role.id;
                    const locationText = getRoleLocation(role);
                    const isRemote = role.isRemote ?? role.is_remote;

                    return (
                      <div
                        key={role.id}
                        onClick={() => handleRoleCardClick(role.id)}
                        className={`relative flex items-center gap-3 p-3 rounded-xl shadow cursor-pointer transition-all duration-200
                          ${
                            isSelected
                              ? "bg-amber-100 ring-2 ring-amber-400 shadow-md"
                              : "bg-amber-50 hover:bg-amber-100 hover:shadow-md"
                          }`}
                      >
                        {/* Selection badge */}
                        <div className="absolute top-2 right-2">
                          <span
                            className={`badge badge-sm gap-1 ${
                              isSelected
                                ? ""
                                : "badge-role-member"
                            }`}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: "var(--color-warning, #F59E0B)",
                                    color: "#ffffff",
                                  }
                                : {}
                            }
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <UserSearch className="w-3 h-3" />
                            )}
                            {isSelected ? "Selected" : "Select"}
                          </span>
                        </div>

                        {/* Role avatar */}
                        <div className="avatar placeholder flex-shrink-0">
                          <div className="bg-amber-200 text-amber-800 rounded-full w-10 h-10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {getRoleInitials(roleName)}
                            </span>
                          </div>
                        </div>

                        {/* Role info */}
                        <div className="flex-1 min-w-0 pr-16">
                          <h4 className="font-medium text-sm text-base-content leading-tight truncate">
                            {roleName}
                          </h4>
                          {locationText && (
                            <p className="text-xs text-base-content/60 flex items-center mt-0.5">
                              {isRemote ? (
                                <Globe size={10} className="mr-1 flex-shrink-0" />
                              ) : (
                                <MapPin size={10} className="mr-1 flex-shrink-0" />
                              )}
                              <span className="truncate">{locationText}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loadingRoles && selectedRoleId === null && vacantRoles.length > 0 && !isInternal && (
                <p className="text-xs text-base-content/40 mt-1.5">
                  No role selected — your application will be sent as a general team application.
                </p>
              )}
              {!loadingRoles && selectedRoleId === null && vacantRoles.length > 0 && isInternal && (
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
        teamId={team?.id}
        initialTeamData={team}
        onClose={() => setIsTeamDetailsOpen(false)}
        isFromSearch={true}
      />
    </>
  );
};

export default TeamApplicationModal;
