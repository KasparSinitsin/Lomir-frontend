import React, { useState, useEffect } from "react";
import { Users, Send, UserPlus, AlertCircle } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Alert from "../common/Alert";
import { teamService } from "../../services/teamService";

const TeamInviteModal = ({
  isOpen,
  onClose,
  inviteeId,
  inviteeName,
  inviteeAvatar,
}) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch teams where user can invite
  useEffect(() => {
    const fetchTeams = async () => {
      if (!isOpen) return;

      try {
        setLoading(true);
        setError(null);
        const response = await teamService.getTeamsWhereUserCanInvite();
        setTeams(response.data || []);
      } catch (err) {
        console.error("Error fetching teams:", err);
        setError("Failed to load your teams. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTeamId(null);
      setMessage("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSendInvitation = async () => {
    if (!selectedTeamId) {
      setError("Please select a team");
      return;
    }

    try {
      setSending(true);
      setError(null);

      await teamService.sendInvitation(selectedTeamId, inviteeId, message);

      setSuccess(`Invitation sent to ${inviteeName}!`);

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error sending invitation:", err);
      setError(
        err.response?.data?.message ||
          "Failed to send invitation. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const handleTeamSelect = (teamId) => {
    setSelectedTeamId(teamId);
    setError(null);
  };

  // Custom header
  const customHeader = (
    <div className="flex items-center gap-3">
      <UserPlus className="text-primary" size={24} />
      <div>
        <h2 className="text-xl font-medium text-primary">Invite to Team</h2>
        <p className="text-sm text-base-content/70">
          Invite {inviteeName} to join your team
        </p>
      </div>
    </div>
  );

  // Footer with action buttons
  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="ghost" onClick={onClose} disabled={sending}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSendInvitation}
        disabled={!selectedTeamId || sending || success}
        icon={<Send size={16} />}
      >
        {sending ? "Sending..." : "Send Invitation"}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      footer={footer}
      position="center"
      size="default"
      closeOnBackdrop={!sending}
      closeOnEscape={!sending}
      showCloseButton={true}
    >
      <div className="space-y-6">
        {/* Success message */}
        {success && <Alert type="success" message={success} />}

        {/* Error message */}
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {/* Invitee info */}
        <div className="flex items-center gap-3 p-4 bg-base-200 rounded-xl">
          <div className="avatar">
            <div className="w-12 h-12 rounded-full">
              {inviteeAvatar ? (
                <img
                  src={inviteeAvatar}
                  alt={inviteeName}
                  className="object-cover"
                />
              ) : (
                <div className="bg-primary text-primary-content flex items-center justify-center w-full h-full">
                  <span className="text-lg font-medium">
                    {inviteeName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="font-medium">{inviteeName}</p>
            <p className="text-sm text-base-content/70">
              Will receive your invitation
            </p>
          </div>
        </div>

        {/* Team selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select a team to invite them to:
          </label>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="loading loading-spinner loading-md text-primary"></div>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 bg-base-200 rounded-xl">
              <AlertCircle className="mx-auto mb-2 text-warning" size={32} />
              <p className="text-base-content/70">
                You don't have any teams where you can invite members.
              </p>
              <p className="text-sm text-base-content/50 mt-1">
                Create a team or become an admin to send invitations.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teams.map((team) => (
                <div
                  key={team.id}
                  onClick={() => handleTeamSelect(team.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 
                    ${
                      selectedTeamId === team.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-base-100 border-2 border-transparent hover:bg-base-200"
                    }`}
                >
                  {/* Team avatar */}
                  <div className="avatar placeholder">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-content">
                      {team.teamavatar_url ? (
                        <img
                          src={team.teamavatar_url}
                          alt={team.name}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-sm">
                          {team.name?.charAt(0)?.toUpperCase() || "T"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Team info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-base-content/70">
                      <Users size={12} className="inline mr-1" />
                      {team.current_members_count}/{team.max_members} members
                      {team.available_spots && (
                        <span className="ml-2 text-success">
                          ({team.available_spots} spots available)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Selection indicator */}
                  {selectedTeamId === team.id && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-primary-content"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional message */}
        {teams.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Add a message (optional):
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${inviteeName}, I'd like to invite you to join our team...`}
              className="textarea textarea-bordered w-full h-24 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-base-content/50 mt-1 text-right">
              {message.length}/500 characters
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TeamInviteModal;