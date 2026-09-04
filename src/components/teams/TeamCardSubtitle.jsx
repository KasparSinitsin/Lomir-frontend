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
  Globe,
  MapPin,
} from "lucide-react";
import Tooltip from "../common/Tooltip";
import { normalizeLocationData } from "../../utils/locationUtils";
import {
  OpenRolesIndicator,
  VisibilityIndicator,
  DemoIndicator,
} from "./TeamCardIndicators";

/**
 * Presentational subtitle indicator row for the card/mini TeamCard views.
 *
 * Renders the horizontal strip of match-score / invitation / application /
 * open-role / visibility / user-role / location / demo indicators. All values
 * are precomputed by the parent and passed as primitive props (pure getters
 * resolved once) so the surrounding React.memo can bail out when nothing
 * relevant changed. Extracted verbatim from TeamCard.jsx (card/mini branch).
 */
const TeamCardSubtitle = ({
  viewMode,
  scoreSubtitleItem,
  isRoleVariant,
  isRoleInvitationVariant,
  hasInternalRoleInvitation,
  formattedDate,
  roleStatusTooltip,
  internalRoleInvitationTooltip,
  shouldShowMemberCountInSubtitle,
  memberCount,
  maxMembers,
  effectiveVariant,
  pendingInvitationForTeam,
  pendingApplicationForTeam,
  isPendingRoleApplicationForTeam,
  normalizedData,
  teamInvitationRoleName,
  teamApplicationRoleName,
  isCombinedApplication,
  teamData,
  setIsModalOpen,
  shouldMoveSearchResultRoleApplicationIndicator,
  isPendingCombinedApplicationForTeam,
  shouldShowOpenRoleCount,
  openRoleCount,
  showVisibilityIcon,
  userRole,
  hideMemberRoleIcon,
  activeFilters,
  isSearchResult,
  showDemoIndicator,
  demoTooltip,
}) => {
  return (
    <span
      className={`mt-0.5 flex max-h-[2.75em] overflow-hidden items-center flex-wrap leading-[110%] text-base-content/70 ${viewMode === "mini" ? "text-xs gap-x-1 gap-y-px w-full" : "text-sm gap-x-1.5 gap-y-px"}`}
    >
      {scoreSubtitleItem}
      {isRoleVariant && formattedDate && (
        <Tooltip content={roleStatusTooltip}>
          <span className="flex items-center gap-0.5 whitespace-nowrap">
            {isRoleInvitationVariant ? (
              <Mail
                size={viewMode === "mini" ? 10 : 13}
                className={`flex-shrink-0 ${hasInternalRoleInvitation ? "text-orange-500" : "text-pink-500"}`}
              />
            ) : (
              <SendHorizontal size={viewMode === "mini" ? 10 : 13} className="flex-shrink-0 text-orange-500" />
            )}
            <span>{formattedDate}</span>
          </span>
        </Tooltip>
      )}

      {/* Members count for member search results */}
      {!isRoleVariant && shouldShowMemberCountInSubtitle && (
        <span className="flex items-center">
          <Users
            size={viewMode === "mini" ? 10 : 13}
            className="text-primary mr-0.5"
          />
          <span>
            {memberCount}/{maxMembers}
          </span>
        </span>
      )}

      {/* Pending invitation indicator with date */}
      {(effectiveVariant === "invitation" ||
        pendingInvitationForTeam) && (
        <Tooltip
          content={
            hasInternalRoleInvitation
              ? internalRoleInvitationTooltip
              : `You were invited to this team${
                  formattedDate
                    ? `\non ${formatDateMedium(
                        new Date(normalizedData.date),
                      )}`
                    : ""
                }`
          }
        >
          <span className="flex items-center gap-0.5 whitespace-nowrap">
            <Mail
              size={viewMode === "mini" ? 10 : 13}
              className={
                hasInternalRoleInvitation
                  ? "text-orange-500"
                  : "text-pink-500"
              }
            />
            {formattedDate && (
              <span>{formattedDate}</span>
            )}
          </span>
        </Tooltip>
      )}
      {teamInvitationRoleName && (
        <Tooltip content={teamInvitationRoleName}>
          {viewMode === "card" ? (
            <span className="flex items-center">
              <UserSearch
                size={13}
                className="text-orange-500"
              />
            </span>
          ) : (
            <span className="flex items-start gap-1">
              <UserSearch
                size={viewMode === "mini" ? 10 : 13}
                className="text-orange-500 flex-shrink-0 mt-0.5"
              />
              <span className="leading-[1.05]">{teamInvitationRoleName}</span>
            </span>
          )}
        </Tooltip>
      )}

      {/* Pending team application indicator (team-only = blue, combined = violet) */}
      {(effectiveVariant === "application" ||
        (pendingApplicationForTeam && !isPendingRoleApplicationForTeam)) && (
        <Tooltip
          content={
            isCombinedApplication
              ? `You applied to join this team and fill a role${formattedDate ? `\non ${formatDateMedium(new Date(normalizedData.date))}` : ""}`
              : `You applied to join this team${formattedDate ? `\non ${formatDateMedium(new Date(normalizedData.date))}` : ""}`
          }
        >
          <span className="flex items-center gap-0.5 whitespace-nowrap">
            <SendHorizontal
              size={viewMode === "mini" ? 10 : 13}
              className={isCombinedApplication ? "text-violet-500" : "text-info"}
            />
            {formattedDate && (
              <span>{formattedDate}</span>
            )}
          </span>
        </Tooltip>
      )}
      {teamApplicationRoleName && (
        <Tooltip content={teamApplicationRoleName}>
          {viewMode === "card" ? (
            <span className="flex items-center">
              <UserSearch
                size={13}
                className="text-orange-500"
              />
            </span>
          ) : (
            <span className="flex items-start gap-1">
              <UserSearch
                size={viewMode === "mini" ? 10 : 13}
                className="text-orange-500 flex-shrink-0 mt-0.5"
              />
              <span className="leading-[1.05]">{teamApplicationRoleName}</span>
            </span>
          )}
        </Tooltip>
      )}

      {/* Team name for role variants */}
      {isRoleVariant && teamData._teamName && (
        <Tooltip content={teamData._teamName}>
          {viewMode === "card" ? (
            <span
              className="flex items-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <Users
                size={13}
                className="text-primary"
              />
            </span>
          ) : (
            <span
              className="flex items-start gap-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <Users
                size={viewMode === "mini" ? 10 : 13}
                className="text-primary flex-shrink-0 mt-0.5"
              />
              <span className="leading-[1.05]">{teamData._teamName}</span>
            </span>
          )}
        </Tooltip>
      )}

      {shouldMoveSearchResultRoleApplicationIndicator &&
        isPendingRoleApplicationForTeam && (
          <Tooltip content={isPendingCombinedApplicationForTeam ? "You applied to join this team and fill a role" : "You applied for a role within this team"}>
            <span className="flex items-center">
              <SendHorizontal
                size={viewMode === "mini" ? 10 : 13}
                className={isPendingCombinedApplicationForTeam ? "text-violet-500" : "text-orange-500"}
              />
            </span>
          </Tooltip>
        )}

      {/* Open roles count */}
      <OpenRolesIndicator
        size={viewMode === "mini" ? 10 : 13}
        shouldShow={shouldShowOpenRoleCount}
        openRoleCount={openRoleCount}
      />

      {/* Privacy status */}
      <VisibilityIndicator
        size={viewMode === "mini" ? 10 : 13}
        show={showVisibilityIcon}
        isPublic={teamData.is_public === true || teamData.isPublic === true}
      />

      {/* Pending role application indicator */}
      {!shouldMoveSearchResultRoleApplicationIndicator &&
        isPendingRoleApplicationForTeam && (
        <Tooltip content="You applied for a role within this team">
          <span className="flex items-center">
            <SendHorizontal
              size={viewMode === "mini" ? 10 : 13}
              className="text-orange-500"
            />
          </span>
        </Tooltip>
        )}

      {/* User role - show for member variant when user has a role */}
      {userRole && effectiveVariant === "member" &&
        (userRole === "owner" || userRole === "admin" || (userRole === "member" && !hideMemberRoleIcon)) && (
        <span className="flex items-center text-base-content/70">
          {userRole === "owner" && (
            <Tooltip content="You are the owner of this team">
              <Crown
                size={viewMode === "mini" ? 10 : 13}
                className="text-[var(--color-role-owner-bg)]"
              />
            </Tooltip>
          )}
          {userRole === "admin" && (
            <Tooltip content="You are an admin of this team">
              <ShieldCheck
                size={viewMode === "mini" ? 10 : 13}
                className="text-[var(--color-role-admin-bg)]"
              />
            </Tooltip>
          )}
          {userRole === "member" && !hideMemberRoleIcon && (
            <Tooltip content="You are a member of this team">
              <User
                size={viewMode === "mini" ? 10 : 13}
                className="text-[var(--color-role-member-bg)]"
              />
            </Tooltip>
          )}
        </span>
      )}

      {/* Compact location in subtitle for mini cards — search results only (My Teams always shows location in body) */}
      {viewMode === "mini" &&
        !activeFilters.showLocation &&
        isSearchResult &&
        (teamData.city ||
          teamData.country ||
          teamData.is_remote ||
          teamData.isRemote) && (
          <span className="flex items-center gap-1">
            {teamData.is_remote || teamData.isRemote ? (
              <>
                <Globe size={10} className="flex-shrink-0" />
                <span>Remote</span>
              </>
            ) : (
              <>
                <MapPin size={10} className="flex-shrink-0" />
                <span>
                  {[teamData.city, normalizeLocationData(teamData).countryName]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </>
            )}
          </span>
        )}
      <DemoIndicator
        size={viewMode === "mini" ? 10 : 13}
        show={showDemoIndicator}
        tooltip={demoTooltip}
        wrapperClassName="flex items-center gap-1 text-base-content/50"
      />
    </span>
  );
};

export default React.memo(TeamCardSubtitle);
