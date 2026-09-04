import React from "react";
import { formatDateMedium } from "../../utils/dateHelpers";
import {
  Users,
  UserSearch,
  User,
  Crown,
  ShieldCheck,
  SendHorizontal,
  Mail,
} from "lucide-react";
import Tooltip from "../common/Tooltip";
import {
  OpenRolesIndicator,
  VisibilityIndicator,
  DemoIndicator,
} from "./TeamCardIndicators";

/**
 * Presentational subtitle indicator row for the list TeamCard view.
 *
 * Mirrors TeamCardSubtitle but for the compact list layout (all icons size 9,
 * inline-flex spacing, plus the invitation/application click affordances).
 * Pure getters are resolved once by the parent and passed as primitive props
 * so the surrounding React.memo can bail out. Extracted verbatim from
 * TeamCard.jsx (list branch). Unified with TeamCardSubtitle in a later phase.
 */
const TeamCardListSubtitle = ({
  scoreSubtitleItem,
  memberCountListItem,
  effectiveVariant,
  isRoleInvitationVariant,
  isRoleApplicationVariant,
  isRoleVariant,
  pendingInvitationForTeam,
  pendingApplicationForTeam,
  hasInternalRoleInvitation,
  internalRoleInvitationTooltip,
  formattedDate,
  normalizedData,
  setIsInvitationDetailsModalOpen,
  setIsApplicationModalOpen,
  setIsModalOpen,
  teamInvitationRoleName,
  teamApplicationRoleName,
  isCombinedApplication,
  isPendingCombinedApplicationForTeam,
  isPendingInternalRoleApplicationForTeam,
  shouldShowOpenRoleCount,
  openRoleCount,
  teamData,
  userRole,
  hideMemberRoleIcon,
  showVisibilityIcon,
  showDemoIndicator,
  demoTooltip,
}) => {
  return (
    <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base-content/60 space-x-1">
      {scoreSubtitleItem}
      {memberCountListItem}
      {(effectiveVariant === "invitation" || isRoleInvitationVariant || pendingInvitationForTeam) && (
        <Tooltip
          content={
            hasInternalRoleInvitation
              ? internalRoleInvitationTooltip
              : `You were invited to this team${
                  formattedDate
                    ? `\non ${formatDateMedium(new Date(normalizedData.date))}`
                    : ""
                }`
          }
        >
          <span
            className={`flex items-center gap-0.5 ${isRoleInvitationVariant ? "cursor-pointer" : ""}`}
            onClick={
              isRoleInvitationVariant
                ? (e) => {
                    e.stopPropagation();
                    setIsInvitationDetailsModalOpen(true);
                  }
                : undefined
            }
          >
            <Mail
              size={9}
              className={hasInternalRoleInvitation ? "text-orange-500" : "text-pink-500"}
            />
            {formattedDate && <span>{formattedDate}</span>}
          </span>
        </Tooltip>
      )}
      {teamInvitationRoleName && (
        <Tooltip
          content={teamInvitationRoleName}
          wrapperClassName="inline-flex items-center gap-0.5"
        >
          <UserSearch size={9} className="flex-shrink-0 text-orange-500" />
          <span>{teamInvitationRoleName}</span>
        </Tooltip>
      )}
      {(effectiveVariant === "application" || isRoleApplicationVariant || pendingApplicationForTeam) && (
        <Tooltip
          content={
            isCombinedApplication || isPendingCombinedApplicationForTeam
              ? `You applied to join this team and fill a role${formattedDate ? `\non ${formatDateMedium(new Date(normalizedData.date))}` : ""}`
              : isPendingInternalRoleApplicationForTeam
                ? "You applied for a role within this team"
                : `You applied${isRoleApplicationVariant ? " for this role" : " to join this team"}${
                    formattedDate
                      ? `\non ${formatDateMedium(new Date(normalizedData.date))}`
                      : ""
                  }`
          }
        >
          <span
            className="flex items-center gap-0.5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsApplicationModalOpen(true);
            }}
          >
            <SendHorizontal size={9} className={
              (isCombinedApplication || isPendingCombinedApplicationForTeam) ? "text-violet-500" :
              (isRoleApplicationVariant || isPendingInternalRoleApplicationForTeam) ? "text-orange-500" :
              "text-info"
            } />
            {formattedDate && <span>{formattedDate}</span>}
          </span>
        </Tooltip>
      )}
      {teamApplicationRoleName && (
        <Tooltip
          content={teamApplicationRoleName}
          wrapperClassName="inline-flex items-center gap-0.5"
        >
          <UserSearch size={9} className="flex-shrink-0 text-orange-500" />
          <span>{teamApplicationRoleName}</span>
        </Tooltip>
      )}
      <OpenRolesIndicator
        size={9}
        shouldShow={shouldShowOpenRoleCount}
        openRoleCount={openRoleCount}
      />
      {isRoleVariant && teamData._teamName && (
        <Tooltip content="Click to view team details" wrapperClassName="inline-flex items-center gap-0.5">
          <span
            className="inline-flex items-center gap-0.5 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
          >
            <Users size={9} className="flex-shrink-0 text-primary" />
            <span>{teamData._teamName}</span>
          </span>
        </Tooltip>
      )}
      {userRole && effectiveVariant === "member" && (
        <>
          {userRole === "owner" && (
            <Tooltip content="You are the owner of this team">
              <Crown size={9} className="text-[var(--color-role-owner-bg)]" />
            </Tooltip>
          )}
          {userRole === "admin" && (
            <Tooltip content="You are an admin of this team">
              <ShieldCheck size={9} className="text-[var(--color-role-admin-bg)]" />
            </Tooltip>
          )}
          {userRole === "member" && !hideMemberRoleIcon && (
            <Tooltip content="You are a member of this team">
              <User size={9} className="text-[var(--color-role-member-bg)]" />
            </Tooltip>
          )}
        </>
      )}
      <VisibilityIndicator
        size={9}
        show={showVisibilityIcon}
        isPublic={teamData.is_public === true || teamData.isPublic === true}
      />
      <DemoIndicator
        size={9}
        show={showDemoIndicator}
        tooltip={demoTooltip}
        wrapperClassName="inline-flex items-center whitespace-nowrap text-base-content/50"
      />
    </span>
  );
};

export default React.memo(TeamCardListSubtitle);
