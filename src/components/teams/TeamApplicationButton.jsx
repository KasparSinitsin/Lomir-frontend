import React, { useCallback, useState } from "react";
import Button from "../common/Button";
import TeamApplicationModal from "./TeamApplicationModal";
import { teamService } from "../../services/teamService";

const isUnsupportedRoleIdError = (error) => {
  const parts = [
    error?.response?.data?.error,
    error?.response?.data?.message,
    error?.message,
  ]
    .filter(Boolean)
    .join(" ");

  return /role_id/i.test(parts) && /(does not exist|unknown column)/i.test(parts);
};

const TeamApplicationButton = ({
  team,
  teamId,
  roleId = null,
  disabled = false,
  className = "w-full",
  onAfterSubmit,
  onSuccess,
  onApplicationModalToggle,
}) => {
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationLoading, setApplicationLoading] = useState(false);

  const effectiveTeamId =
    teamId ?? team?.id ?? team?.teamId ?? team?.team_id ?? null;

  const closeApplicationModal = useCallback(() => {
    setIsApplicationModalOpen(false);
    onApplicationModalToggle?.(false);
  }, [onApplicationModalToggle]);

  const handleApplyToJoin = useCallback(() => {
    setIsApplicationModalOpen(true);
    onApplicationModalToggle?.(true);
  }, [onApplicationModalToggle]);

  const handleApplicationSubmit = useCallback(
    async (applicationData) => {
      if (!effectiveTeamId) {
        throw new Error("Missing team ID for application");
      }

      try {
        setApplicationLoading(true);

        // Use roleId from the modal's selection (user may have changed it)
        const selectedRoleId = applicationData.roleId ?? roleId;

        if (selectedRoleId) {
          try {
            await teamService.applyToJoinTeam(effectiveTeamId, {
              ...applicationData,
              roleId: selectedRoleId,
            });
          } catch (error) {
            if (!isUnsupportedRoleIdError(error)) {
              throw error;
            }

            // Some backend environments still only support generic team
            // applications. Fall back to the existing team-only payload.
            await teamService.applyToJoinTeam(effectiveTeamId, applicationData);
          }
        } else {
          await teamService.applyToJoinTeam(effectiveTeamId, applicationData);
        }

        await onAfterSubmit?.();
        onSuccess?.(applicationData);

        if (!applicationData.isDraft) {
          closeApplicationModal();
        }
      } catch (error) {
        console.error("Error submitting application:", error);
        throw new Error(
          error.response?.data?.message || "Failed to submit application",
        );
      } finally {
        setApplicationLoading(false);
      }
    },
    [closeApplicationModal, effectiveTeamId, onAfterSubmit, onSuccess, roleId],
  );

  if (!effectiveTeamId) return null;

  return (
    <>
      <Button
        variant="primary"
        onClick={handleApplyToJoin}
        disabled={disabled || applicationLoading}
        className={className}
      >
        Apply to Join Team
      </Button>

      <TeamApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={closeApplicationModal}
        team={team}
        teamId={effectiveTeamId}
        initialRoleId={roleId}
        onSubmit={handleApplicationSubmit}
        loading={applicationLoading}
      />
    </>
  );
};

export default TeamApplicationButton;
