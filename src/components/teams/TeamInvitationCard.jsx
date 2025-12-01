import React, { useState } from "react";
import { Check, X, Users, Calendar, MessageSquare, User } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";
import { format } from "date-fns";

const TeamInvitationCard = ({
  invitation,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const [actionLoading, setActionLoading] = useState(null);

  const handleAccept = async () => {
    setActionLoading("accept");
    try {
      await onAccept(invitation.id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async () => {
    setActionLoading("decline");
    try {
      await onDecline(invitation.id);
    } finally {
      setActionLoading(null);
    }
  };

  const formattedDate = invitation.created_at
    ? format(new Date(invitation.created_at), "MMM d, yyyy")
    : "Unknown date";

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="p-4">
        {/* Team info header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Team avatar */}
          <div className="avatar placeholder flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-primary text-primary-content">
              {invitation.team?.teamavatar_url ? (
                <img
                  src={invitation.team.teamavatar_url}
                  alt={invitation.team.name}
                  className="object-cover rounded-xl"
                />
              ) : (
                <span className="text-xl font-medium">
                  {invitation.team?.name?.charAt(0)?.toUpperCase() || "T"}
                </span>
              )}
            </div>
          </div>

          {/* Team details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">
              {invitation.team?.name || "Unknown Team"}
            </h3>
            <p className="text-sm text-base-content/70 line-clamp-2">
              {invitation.team?.description || "No description"}
            </p>
          </div>
        </div>

        {/* Team stats */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm text-base-content/70">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>
              {invitation.team?.current_members_count || 0}/
              {invitation.team?.max_members || "?"} members
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>Invited {formattedDate}</span>
          </div>
        </div>

        {/* Inviter info */}
        {invitation.inviter && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-base-200 rounded-lg">
            <div className="avatar">
              <div className="w-8 h-8 rounded-full">
                {invitation.inviter.avatar_url ? (
                  <img
                    src={invitation.inviter.avatar_url}
                    alt={invitation.inviter.username}
                    className="object-cover"
                  />
                ) : (
                  <div className="bg-secondary text-secondary-content flex items-center justify-center w-full h-full">
                    <User size={14} />
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm">
              <span className="text-base-content/70">Invited by </span>
              <span className="font-medium">
                {invitation.inviter.first_name && invitation.inviter.last_name
                  ? `${invitation.inviter.first_name} ${invitation.inviter.last_name}`
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
      </div>
    </Card>
  );
};

export default TeamInvitationCard;