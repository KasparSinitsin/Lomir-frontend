import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button";
import Tooltip from "../common/Tooltip";
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
  size = "md",
  variant = "primary",
  onAfterSubmit,
  onSuccess,
  buttonLabel,
  buttonIcon = null,
  ariaLabel = null,
  onApplicationModalToggle,
  // A full team takes no applications: the button stays visible, greyed out,
  // and says why. The backend refuses anyway (TEAM_FULL).
  teamIsFull = false,
  // Off where the caller's own tooltip already wraps the button.
  showFullTooltip = true,
}) => {
  const { t } = useTranslation("teams");
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

        let submitResponse = null;

        if (selectedRoleId) {
          try {
            submitResponse = await teamService.applyToJoinTeam(effectiveTeamId, {
              ...applicationData,
              roleId: selectedRoleId,
            });
          } catch (error) {
            if (!isUnsupportedRoleIdError(error)) {
              throw error;
            }

            // Some backend environments still only support generic team
            // applications. Fall back to the existing team-only payload.
            submitResponse = await teamService.applyToJoinTeam(effectiveTeamId, applicationData);
          }
        } else {
          submitResponse = await teamService.applyToJoinTeam(effectiveTeamId, applicationData);
        }

        onSuccess?.(applicationData, submitResponse);
        await onAfterSubmit?.();

        if (!applicationData.isDraft) {
          closeApplicationModal();
        }
      } catch (error) {
        console.error("Error submitting application:", error);
        // Re-thrown as is: `TeamApplicationModal` words it from the code.
        throw error;
      } finally {
        setApplicationLoading(false);
      }
    },
    [closeApplicationModal, effectiveTeamId, onAfterSubmit, onSuccess, roleId],
  );

  if (!effectiveTeamId) return null;

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleApplyToJoin}
      disabled={disabled || applicationLoading || teamIsFull}
      className={className}
      icon={buttonIcon}
      aria-label={ariaLabel}
    >
      {buttonLabel ?? t("applicationButton.defaultLabel")}
    </Button>
  );

  return (
    <>
      {teamIsFull && showFullTooltip ? (
        <Tooltip
          content={t("applicationButton.teamFull")}
          position="top"
          wrapperClassName={className.includes("w-full") ? "flex w-full" : undefined}
        >
          {button}
        </Tooltip>
      ) : (
        button
      )}

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
