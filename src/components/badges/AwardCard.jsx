import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Users,
  Calendar,
  Info,
  Briefcase,
  User,
  Tag,
  Award,
  FlaskConical,
  Eye,
  EyeClosed,
  Loader2,
  Trash2,
} from "lucide-react";
import Tooltip from "../common/Tooltip";
import InlineUserLink from "../users/InlineUserLink";
import { useTeamModalSafe } from "../../contexts/TeamModalContext";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { getBadgeIcon } from "../../utils/badgeIconUtils";
import {
  getCachedChatTeamProfile,
  mergeResolvedTeamData,
} from "../../utils/chatEntityResolvers";
import { useChildModalZIndex } from "../../contexts/ModalLayerContext";
import { isSyntheticTeam, DEMO_TEAM_TOOLTIP } from "../../utils/userHelpers";
import {
  getDisplayName as getDeletedUserDisplayName,
  isDeletedUser,
} from "../../utils/deletedUser";
import { formatDisplayName } from "../../utils/nameFormatters";
import { getDisplayName } from "../../utils/userHelpers";

/**
 * AwardCard
 *
 * Canonical badge-award card UI (used across badge-related modals).
 *
 * When awardee info is available (team context), the card shows:
 *   Title row:  [Awardee Avatar] Awardee Name (category color)  ... [+N ct.]
 *   Subline:    (icon) Context label  ·  (icon) Team: Name  ·  (icon) Tag
 *
 * When no awardee info (user context), falls back to:
 *   Title row:  (icon) Context label  ... [+N ct.]
 *   Subline:    Team: Name  ·  Tag
 *
 * Props:
 * - award: award object (supports camelCase + snake_case)
 * - category: string (badge category, for title tooltip or fallbacks)
 * - categoryColor: string (e.g. "#F59E0B")
 * - categoryPastel: string (optional; used as card background if provided)
 * - onOpenUser: function(userId)
 * - onOpenTeam: optional function(teamId, teamName)
 * - hideTag: boolean
 * - highlighted: boolean
 * - onHideBadge: optional function(award)
 * - onShowBadge: optional function(award)
 * - onDeleteAward: optional function(award)
 * - isBadgeHidden: boolean
 * - badgeActionLoadingKey: optional string used to show per-action loading
 */
const AwardCard = ({
  award,
  categoryColor = "#6B7280",
  categoryPastel,
  onOpenUser,
  onOpenTeam,
  hideTag = false,
  highlighted = false,
  showBadgeTitle = true,
  onHideBadge = null,
  onShowBadge = null,
  onDeleteAward = null,
  isBadgeHidden = false,
  badgeActionLoadingKey = null,
}) => {
  const mutedBadgeColor = "#6B7280";
  const mutedCardBackground = "#F3F4F6";
  const mutedHighlightBackground = "#E5E7EB";
  const mutedBorderColor = "#D1D5DB";
  const catColor = isBadgeHidden ? mutedBadgeColor : categoryColor;
  const cardBackgroundColor = isBadgeHidden
    ? highlighted
      ? mutedHighlightBackground
      : mutedCardBackground
    : highlighted
      ? `${catColor}20`
      : categoryPastel || "#F9FAFB";
  const cardBorderColor = isBadgeHidden
    ? mutedBorderColor
    : highlighted
      ? catColor
      : `${catColor}33`;
  const cardBoxShadow = highlighted
    ? `0 0 12px ${isBadgeHidden ? "#9CA3AF66" : `${catColor}66`}`
    : undefined;
  const childTeamModalZIndex = useChildModalZIndex();

  // --- Normalize fields (camelCase + snake_case) ---
  const awardId = award?.awardId || award?.award_id || award?.id || null;
  const badgeName = award?.badgeName || award?.badge_name || "Badge";
  const credits = Number(award?.credits ?? 0);
  const hideActionKey = `hide-${awardId}`;
  const showActionKey = `show-${awardId}`;
  const deleteActionKey = `delete-${awardId}`;
  const isAnyBadgeActionLoading = Boolean(badgeActionLoadingKey);
  const isHideLoading = badgeActionLoadingKey === hideActionKey;
  const isShowLoading = badgeActionLoadingKey === showActionKey;
  const isDeleteLoading = badgeActionLoadingKey === deleteActionKey;
  const showBadgeActions = Boolean(
    (onHideBadge && !isBadgeHidden) || onDeleteAward,
  );

  const awardedAt = award?.awardedAt || award?.awarded_at;
  const reason = award?.reason;

  const contextType = award?.contextType || award?.context_type;

  const teamName =
    award?.teamName ??
    award?.team_name ??
    award?.team?.name ??
    award?.contextTeamName ??
    award?.context_team_name ??
    award?.customTeamName ??
    award?.custom_team_name ??
    null;

  const projectName = award?.projectName ?? award?.project_name ?? null;

  const teamId =
    award?.teamId ??
    award?.team_id ??
    award?.team?.id ??
    award?.contextTeamId ??
    award?.context_team_id ??
    (contextType === "team" ? (award?.contextId ?? award?.context_id) : null) ??
    null;
  const baseTeam = award?.team ?? award?.contextTeam ?? award?.context_team ?? {};
  const syntheticTeamFlag =
    baseTeam?.is_synthetic ??
    baseTeam?.isSynthetic ??
    award?.teamIsSynthetic ??
    award?.team_is_synthetic ??
    award?.contextTeamIsSynthetic ??
    award?.context_team_is_synthetic;
  const teamObj = {
    ...baseTeam,
    id: baseTeam?.id ?? teamId,
    name: baseTeam?.name ?? teamName,
    is_synthetic:
      baseTeam?.is_synthetic ?? baseTeam?.isSynthetic ?? syntheticTeamFlag,
    isSynthetic:
      baseTeam?.isSynthetic ?? baseTeam?.is_synthetic ?? syntheticTeamFlag,
  };
  const hasDirectTeamSyntheticFlag =
    teamObj?.is_synthetic != null || teamObj?.isSynthetic != null;

  const tagName = award?.tagName ?? award?.tag_name ?? null;

  // --- Awarded BY (bottom row) ---
  const awardedByUserId = award?.awardedByUserId || award?.awarded_by_user_id;
  const awardedByFirstName =
    award?.awardedByFirstName || award?.awarded_by_first_name;
  const awardedByLastName =
    award?.awardedByLastName || award?.awarded_by_last_name;
  const awardedByUsername =
    award?.awardedByUsername || award?.awarded_by_username;
  const awardedByAvatarUrl =
    award?.awardedByAvatarUrl || award?.awarded_by_avatar_url;
  const awardedByIsSynthetic =
    award?.awardedByIsSynthetic ?? award?.awarded_by_is_synthetic ?? false;

  const awardedByUser = {
    id: awardedByUserId,
    first_name: awardedByFirstName,
    last_name: awardedByLastName,
    username: awardedByUsername,
    avatar_url: awardedByAvatarUrl,
    is_synthetic: awardedByIsSynthetic,
  };

  // --- Awarded TO / Awardee (title row — team context) ---
  const awardedToUserId =
    award?.awardedToUserId || award?.awarded_to_user_id || null;
  const awardedToFirstName =
    award?.awardedToFirstName || award?.awarded_to_first_name || null;
  const awardedToLastName =
    award?.awardedToLastName || award?.awarded_to_last_name || null;
  const awardedToUsername =
    award?.awardedToUsername || award?.awarded_to_username || null;
  const awardedToAvatarUrl =
    award?.awardedToAvatarUrl || award?.awarded_to_avatar_url || null;
  const awardedToIsSynthetic =
    award?.awardedToIsSynthetic ?? award?.awarded_to_is_synthetic ?? false;

  const hasAwardeeInfo = Boolean(awardedToUserId);

  const awarderName = awardedByFirstName
    ? `${awardedByFirstName}${awardedByLastName ? ` ${awardedByLastName}` : ""}`
    : awardedByUsername || getDeletedUserDisplayName(awardedByUser);
  const isDeletedAwarder = !awardedByUserId || isDeletedUser(awardedByUser);

  // --- Team modal integration (global fallback) ---
  const teamModal = useTeamModalSafe();
  const openTeam = onOpenTeam || teamModal?.openTeamModal;
  const isTeamClickable = Boolean(contextType === "team" && teamId && openTeam);

  const handleOpenTeam = () => {
    if (!isTeamClickable) return;
    try {
      openTeam(teamId, teamName, { zIndex: childTeamModalZIndex });
    } catch {
      openTeam(teamId);
    }
  };

  // --- Unified user-open handler (prop → global context fallback) ---
  const userModalContext = useUserModalSafe();

  const openUser = (userId) => {
    if (!userId) return;
    if (onOpenUser) {
      onOpenUser(userId);
    } else if (userModalContext) {
      userModalContext.openUserModal(userId);
    }
  };

  const canOpenUser = Boolean(onOpenUser || userModalContext);

  // --- Context meta ---
  const getContextMeta = (type) => {
    switch (type) {
      case "team":
        return { label: "Team contribution", Icon: Users };
      case "project":
        return { label: "Project contribution", Icon: Briefcase };
      case "personal":
      case "profile":
      case "chat":
        return { label: "Personal contribution", Icon: User };
      default:
        return { label: "Contribution", Icon: Info };
    }
  };

  const { label: contextLabel, Icon: ContextIcon } =
    getContextMeta(contextType);
  const [resolvedTeamProfile, setResolvedTeamProfile] = useState(null);

  useEffect(() => {
    if (!teamId || hasDirectTeamSyntheticFlag) {
      setResolvedTeamProfile(null);
      return;
    }

    let cancelled = false;

    getCachedChatTeamProfile(teamId)
      .then((profile) => {
        if (!cancelled) {
          setResolvedTeamProfile(profile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedTeamProfile(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasDirectTeamSyntheticFlag, teamId]);

  const resolvedTeam = mergeResolvedTeamData(teamObj, resolvedTeamProfile);
  const isTeamSynthetic = isSyntheticTeam(resolvedTeam);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={`group relative rounded-lg p-3 flex flex-col border ${showBadgeActions ? "hover:shadow-md transition-shadow" : ""} ${highlighted ? "animate-badge-highlight" : ""}`}
      style={{
        backgroundColor: cardBackgroundColor,
        borderColor: cardBorderColor,
        ...(highlighted
          ? {
              borderWidth: "2px",
              boxShadow: cardBoxShadow,
            }
          : {}),
      }}
    >
      {showBadgeActions && (
        <div className="absolute -top-2 -right-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity inline-flex items-center gap-1">
          {onHideBadge && !isBadgeHidden && (
            <Tooltip
              content="Hide badge from others"
              position="top"
              wrapperClassName="inline-flex"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onHideBadge(award);
                }}
                disabled={isAnyBadgeActionLoading || !awardId}
                className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Hide badge from others"
              >
                {isHideLoading ? (
                  <Loader2
                    size={14}
                    className="text-base-content/50 animate-spin"
                  />
                ) : (
                  <EyeClosed
                    size={14}
                    className="text-base-content/50 hover:text-primary"
                  />
                )}
              </button>
            </Tooltip>
          )}

          {onDeleteAward && (
            <Tooltip
              content="Delete badge award"
              position="top"
              wrapperClassName="inline-flex"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteAward(award);
                }}
                disabled={isAnyBadgeActionLoading || !awardId}
                className="bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Delete badge award"
              >
                {isDeleteLoading ? (
                  <Loader2
                    size={14}
                    className="text-base-content/50 animate-spin"
                  />
                ) : (
                  <Trash2
                    size={14}
                    className="text-base-content/50 hover:text-error"
                  />
                )}
              </button>
            </Tooltip>
          )}
        </div>
      )}

      {/* ── Title row + credits pill ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Badge icon + badge name as title, or context icon + label */}
          <div className="flex items-center gap-2 min-w-0">
            {showBadgeTitle ? (
              <>
                {getBadgeIcon(badgeName, catColor, 16)}
                <span
                  className="font-medium leading-tight truncate"
                  style={{ color: catColor }}
                >
                  {badgeName}
                </span>
              </>
            ) : (
              <>
                <ContextIcon
                  size={16}
                  className="flex-shrink-0"
                  style={{ color: catColor }}
                />
                <span
                  className="font-medium leading-tight truncate"
                  style={{ color: catColor }}
                >
                  {contextLabel}
                </span>
              </>
            )}
          </div>

          {/* ── Subline ── */}
          <div className="mt-1 flex max-h-[2.5em] min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 overflow-hidden text-xs leading-tight text-base-content/60">
            {/* Awarded by (team context only — awarder name, clickable) */}
            {hasAwardeeInfo && (
              <span className="flex items-center gap-1 min-w-0">
                <Award
                  size={11}
                  className="flex-shrink-0 text-base-content/70"
                />
                <span className="flex-shrink-0">awarded by</span>
                <Tooltip
                  content={
                    awardedByUserId && canOpenUser && !isDeletedAwarder
                      ? "View profile"
                      : null
                  }
                  wrapperClassName="inline-flex min-w-0"
                >
                  <span
                    className={[
                      "truncate font-medium",
                      isDeletedAwarder
                        ? "text-base-content/50"
                        : "text-base-content/70",
                      awardedByUserId && canOpenUser && !isDeletedAwarder
                        ? "cursor-pointer hover:text-primary transition-colors"
                        : "",
                    ].join(" ")}
                    onClick={
                      awardedByUserId && canOpenUser && !isDeletedAwarder
                        ? () => openUser(awardedByUserId)
                        : undefined
                    }
                  >
                    {awarderName}
                  </span>
                </Tooltip>
              </span>
            )}

            {/* Context type — shown when badge title is displayed (context not in title) */}
            {showBadgeTitle && (
              <span className="flex items-center gap-1 min-w-0">
                <ContextIcon
                  size={11}
                  className="flex-shrink-0 text-base-content/70"
                />
                {contextType === "team" ? (
                  teamName ? (
                    <>
                      <span className="flex-shrink-0">Team:</span>
                      <Tooltip
                        content={isTeamClickable ? "View team" : teamName}
                        wrapperClassName="inline-flex min-w-0"
                      >
                        <span
                          className={[
                            "truncate text-base-content/70",
                            isTeamClickable
                              ? "font-medium cursor-pointer hover:text-primary transition-colors"
                              : "cursor-default",
                          ].join(" ")}
                          onClick={handleOpenTeam}
                        >
                          {teamName}
                        </span>
                      </Tooltip>
                      {isTeamSynthetic && (
                        <Tooltip
                          content={DEMO_TEAM_TOOLTIP}
                          wrapperClassName="flex items-center text-base-content/50 ml-0.5"
                        >
                          <FlaskConical size={11} className="flex-shrink-0" />
                        </Tooltip>
                      )}
                    </>
                  ) : (
                    <span className="truncate">Team</span>
                  )
                ) : contextType === "project" && projectName ? (
                  <>
                    <span className="flex-shrink-0">Project:</span>
                    <span className="truncate text-base-content/70">
                      {projectName}
                    </span>
                  </>
                ) : (
                  <span className="truncate">
                    {contextType === "project" ? "Project" : "Personal"}
                  </span>
                )}
              </span>
            )}

            {/* Team name only — when context is already the title */}
            {!showBadgeTitle && contextType === "team" && teamName && (
              <span className="flex items-center gap-1 min-w-0">
                <Users
                  size={11}
                  className="flex-shrink-0 text-base-content/70"
                />
                <span className="flex-shrink-0">Team:</span>
                <Tooltip
                  content={isTeamClickable ? "View team" : teamName}
                  wrapperClassName="inline-flex min-w-0"
                >
                  <span
                    className={[
                      "truncate text-base-content/70",
                      isTeamClickable
                        ? "font-medium cursor-pointer hover:text-primary transition-colors"
                        : "cursor-default",
                    ].join(" ")}
                    onClick={handleOpenTeam}
                  >
                    {teamName}
                  </span>
                </Tooltip>
                {isTeamSynthetic && (
                  <Tooltip
                    content={DEMO_TEAM_TOOLTIP}
                    wrapperClassName="flex items-center text-base-content/50 ml-0.5"
                  >
                    <FlaskConical size={11} className="flex-shrink-0" />
                  </Tooltip>
                )}
              </span>
            )}

            {/* Project name — when context is already the title */}
            {!showBadgeTitle && contextType === "project" && projectName && (
              <span className="flex items-center gap-1 min-w-0">
                <Briefcase
                  size={11}
                  className="flex-shrink-0 text-base-content/70"
                />
                <span className="flex-shrink-0">Project:</span>
                <span className="truncate text-base-content/70">
                  {projectName}
                </span>
              </span>
            )}

            {/* Tag */}
            {tagName && !hideTag && (
              <span className="flex items-center gap-1 min-w-0">
                <Tag size={11} className="flex-shrink-0" />
                <span className="truncate">{tagName}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isBadgeHidden && (
            <div className="group/visibility relative h-5 w-5">
              <EyeClosed
                size={14}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base-content/40 group-hover/visibility:opacity-0"
                aria-hidden="true"
              />
              {onShowBadge && (
                <Tooltip
                  content="Make badge visible for others"
                  position="top"
                  wrapperClassName="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onShowBadge(award);
                    }}
                    disabled={isAnyBadgeActionLoading || !awardId}
                    className="opacity-0 group-hover/visibility:opacity-100 bg-base-100 border border-base-300 rounded-full p-1 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    aria-label="Make badge visible for others"
                  >
                    {isShowLoading ? (
                      <Loader2
                        size={14}
                        className="text-base-content/50 animate-spin"
                      />
                    ) : (
                      <Eye
                        size={14}
                        className="text-base-content/50 hover:text-primary"
                      />
                    )}
                  </button>
                </Tooltip>
              )}
            </div>
          )}

          {/* Credits pill */}
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap text-white"
            style={{ backgroundColor: catColor }}
          >
            +{credits} ct.
          </span>
        </div>
      </div>

      {/* Reason */}
      {reason && (
        <p
          className={`mt-2 text-sm italic ${
            isBadgeHidden ? "text-base-content/55" : "text-base-content/80"
          }`}
        >
          &ldquo;{reason}&rdquo;
        </p>
      )}

      {/* Bottom row pinned to bottom */}
      <div className="flex items-end justify-between mt-auto pt-3 gap-2">
        {hasAwardeeInfo ? (
          <InlineUserLink
            label={
              <>
                <span className="hidden sm:inline">Awarded </span>to
              </>
            }
            user={{
              id: awardedToUserId,
              first_name: awardedToFirstName,
              last_name: awardedToLastName,
              username: awardedToUsername,
              avatar_url: awardedToAvatarUrl,
              is_synthetic: awardedToIsSynthetic,
            }}
            displayName={
              <>
                <span className="hidden sm:inline">
                  {getDisplayName({
                    first_name: awardedToFirstName,
                    last_name: awardedToLastName,
                    username: awardedToUsername,
                  })}
                </span>
                <span className="sm:hidden">
                  {formatDisplayName({
                    first_name: awardedToFirstName,
                    last_name: awardedToLastName,
                    username: awardedToUsername,
                  })}
                </span>
              </>
            }
            onOpenUser={openUser}
          />
        ) : (
          <InlineUserLink
            label={
              <>
                <span className="hidden sm:inline">Awarded </span>by
              </>
            }
            user={awardedByUser}
            displayName={
              <>
                <span className="hidden sm:inline">
                  {getDisplayName(awardedByUser)}
                </span>
                <span className="sm:hidden">
                  {formatDisplayName(awardedByUser)}
                </span>
              </>
            }
            onOpenUser={openUser}
          />
        )}

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-xs text-base-content/60 leading-tight">
            <Calendar size={12} className="flex-shrink-0" />
            {awardedAt ? (
              <>
                <span className="hidden sm:inline">
                  {format(new Date(awardedAt), "MMM d, yyyy")}
                </span>
                <span className="sm:hidden">
                  {format(new Date(awardedAt), "MM/dd/yy")}
                </span>
              </>
            ) : (
              <span>Unknown</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwardCard;
