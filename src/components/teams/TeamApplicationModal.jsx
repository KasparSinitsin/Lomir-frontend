import React, { useState } from "react";
import { Send, Save, Users, SendHorizontal } from "lucide-react";
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
  onSubmit,
  loading = false,
}) => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);

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
      });

      if (saveAsDraft) {
        setSuccess("Draft saved successfully");
        setIsDraft(true);
      } else {
        setSuccess("Application sent successfully!");
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
    onClose();
  };

  // ============ Render ============

  const customHeader = (
    <div className="flex items-center gap-3">
      <SendHorizontal className="text-primary" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary">
          Apply to join this Team
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
        disabled={loading || !message.trim()}
        icon={<Send size={16} />}
      >
        {loading ? "Sending..." : "Send Application"}
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

          {/* Application message textarea */}
          <div>
            <p className="text-xs text-base-content/60 mb-1 flex items-center">
              <Send size={12} className="text-info mr-1" />
              Your message to the team:
            </p>

            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the team why you'd like to join, what skills you bring, and what you hope to contribute..."
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
