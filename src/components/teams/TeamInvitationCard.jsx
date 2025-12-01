import React, { useState } from "react";
import { Check, X, Users, Calendar, MessageSquare, User } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import TeamDetailsModal from "./TeamDetailsModal";
import { format } from "date-fns";

const TeamInvitationCard = ({
  invitation,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const [actionLoading, setActionLoading] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAccept = async (e) => {
    e.stopPropagation(); // Prevent card click
    setActionLoading("accept");
    try {
      await onAccept(invitation.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (e) => {
    e.stopPropagation(); // Prevent card click
    setActionLoading("decline");
    try {
      await onDecline(invitation.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const formattedDate = invitation.created_at || invitation.createdAt
    ? format(new Date(invitation.created_at || invitation.createdAt), "MMM d, yyyy")
    : "Unknown date";

  // Get the team image or initial for the avatar - matches TeamCard pattern
  const getTeamImage = () => {
    if (invitation.team?.teamavatar_url) {
      return invitation.team.teamavatar_url;
    }
    if (invitation.team?.teamavatarUrl) {
      return invitation.team.teamavatarUrl;
    }
    return invitation.team?.name?.charAt(0) || "T";
  };

  // Get team ID, handling both snake_case and camelCase
  const getTeamId = () => {
    return invitation.team?.id || invitation.teamId || invitation.team_id;
  };

  return (
    <>
      <Card
        title={invitation.team?.name || "Unknown Team"}
        subtitle={
          <span className="flex items-center space-x-1 text-sm">
            <Users size={16} className="text-primary" />
            <span>
              {invitation.team?.current_members_count || invitation.team?.currentMembersCount || 0} /{" "}
              {invitation.team?.max_members || invitation.team?.maxMembers || "?"} Members
            </span>
          </span>
        }
        hoverable
        image={getTeamImage()}
        imageAlt={`${invitation.team?.name} team`}
        imageSize="medium"
        imageShape="circle"
        onClick={handleCardClick}
      >
        {/* Team description */}
        <p className="text-base-content/80 mb-4 -mt-4 line-clamp-2">
          {invitation.team?.description || "No description"}
        </p>

        {/* Invitation date badge */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center text-sm text-base-content/70 bg-base-200/50 py-1 px-2 rounded-full">
            <Calendar size={14} className="mr-1" />
            <span>Invited {formattedDate}</span>
          </div>
        </div>

        {/* Inviter info */}
        {invitation.inviter && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-base-200 rounded-lg">
            <div className="avatar">
              <div className="w-8 h-8 rounded-full">
                {invitation.inviter.avatar_url || invitation.inviter.avatarUrl ? (
                  <img
                    src={invitation.inviter.avatar_url || invitation.inviter.avatarUrl}
                    alt={invitation.inviter.username}
                    className="object-cover w-full h-full rounded-full"
                  />
                ) : (
                  <div className="bg-secondary text-secondary-content flex items-center justify-center w-full h-full rounded-full">
                    <User size={14} />
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm">
              <span className="text-base-content/70">Invited by </span>
              <span className="font-medium">
                {(invitation.inviter.first_name || invitation.inviter.firstName) && 
                 (invitation.inviter.last_name || invitation.inviter.lastName)
                  ? `${invitation.inviter.first_name || invitation.inviter.firstName} ${invitation.inviter.last_name || invitation.inviter.lastName}`
                  : invitation.inviter.username}
              </span>
            </div>
          </div>
        )}

        {/* Invitation message */}
        {invitation.message && (
          <div className="mb-4 p-3 bg-base-100 border border-base-300 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare
                size={14}
                className="text-base-content/50 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-base-content/80 italic">
                "{invitation.message}"
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleAccept}
            disabled={loading || actionLoading !== null}
            icon={<Check size={16} />}
          >
            {actionLoading === "accept" ? "Accepting..." : "Accept"}
          </Button>
          <Button
            variant="ghost"
            className="flex-1 hover:bg-red-100 hover:text-red-700"
            onClick={handleDecline}
            disabled={loading || actionLoading !== null}
            icon={<X size={16} />}
          >
            {actionLoading === "decline" ? "Declining..." : "Decline"}
          </Button>
        </div>
      </Card>

      {/* Team Details Modal */}
      <TeamDetailsModal
        isOpen={isModalOpen}
        teamId={getTeamId()}
        onClose={handleModalClose}
        isFromSearch={true}
      />
    </>
  );
};

export default TeamInvitationCard;