import React from "react";
import { format } from "date-fns";
import {
  Users,
  Calendar,
  Info,
  Briefcase,
  User,
  Tag,
  Award,
} from "lucide-react";
import InlineUserLink from "../users/InlineUserLink";
import { useTeamModal } from "../../contexts/TeamModalContext";
import { useUserModalSafe } from "../../contexts/UserModalContext";
import { getBadgeIcon } from "../../utils/badgeIconUtils";

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
 */
const AwardCard = ({
  award,
  category = "Other",
  categoryColor = "#6B7280",
  categoryPastel,
  onOpenUser,
  onOpenTeam,
  hideTag = false,
  highlighted = false,
  showBadgeTitle = true,
}) => {
  const catColor = categoryColor;

  // --- Normalize fields (camelCase + snake_case) ---
  const badgeName = award?.badgeName || award?.badge_name || "Badge";
  const credits = Number(award?.credits ?? 0);

  const awardedAt = award?.awardedAt || award?.awarded_at;
  const reason = award?.reason;

  const contextType = award?.contextType || award?.context_type;

  const teamName =
    award?.teamName ??
    award?.team_name ??
    award?.team?.name ??
    award?.contextTeamName ??
    award?.context_team_name ??
    null;

  const teamId =
    award?.teamId ??
    award?.team_id ??
    award?.team?.id ??
    award?.contextTeamId ??
    award?.context_team_id ??
    (contextType === "team" ? (award?.contextId ?? award?.context_id) : null) ??
    null;

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

  const hasAwardeeInfo = Boolean(awardedToUserId);

  const awardeeName = awardedToFirstName
    ? `${awardedToFirstName}${awardedToLastName ? ` ${awardedToLastName}` : ""}`
    : awardedToUsername || null;

  const awarderName = awardedByFirstName
    ? `${awardedByFirstName}${awardedByLastName ? ` ${awardedByLastName}` : ""}`
    : awardedByUsername || "Someone";

  // --- Team modal integration (global fallback) ---
  let teamModal = null;
  try {
    teamModal = useTeamModal();
  } catch (e) {
    teamModal = null;
  }

  const openTeam = onOpenTeam || teamModal?.openTeamModal;
  const isTeamClickable = Boolean(contextType === "team" && teamId && openTeam);

  const handleOpenTeam = () => {
    if (!isTeamClickable) return;
    try {
      openTeam(teamId, teamName);
    } catch (e) {
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

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={`rounded-lg p-3 flex flex-col border ${highlighted ? "animate-badge-highlight" : ""}`}
      style={{
        backgroundColor: highlighted
          ? `${catColor}20`
          : categoryPastel || "#F9FAFB",
        borderColor: highlighted ? catColor : `${catColor}33`,
        ...(highlighted
          ? {
              borderWidth: "2px",
              boxShadow: `0 0 12px ${catColor}66`,
            }
          : {}),
      }}
      title={category}
    >
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
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-base-content/60 mt-1 min-w-0 leading-tight">
            {/* Awarded by (team context only — awarder name, clickable) */}
            {hasAwardeeInfo && (
              <span className="flex items-center gap-1 min-w-0">
                <Award
                  size={11}
                  className="flex-shrink-0 text-base-content/70"
                />
                <span className="flex-shrink-0">awarded by</span>
                <span
                  className={[
                    "truncate font-medium text-base-content/70",
                    awardedByUserId && canOpenUser
                      ? "cursor-pointer hover:text-primary transition-colors"
                      : "",
                  ].join(" ")}
                  title={
                    awardedByUserId && canOpenUser
                      ? "View profile"
                      : awarderName
                  }
                  onClick={
                    awardedByUserId && canOpenUser
                      ? () => openUser(awardedByUserId)
                      : undefined
                  }
                >
                  {awarderName}
                </span>
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
                      <span
                        className={[
                          "truncate font-medium text-base-content/70",
                          isTeamClickable
                            ? "cursor-pointer hover:text-primary transition-colors"
                            : "cursor-default",
                        ].join(" ")}
                        title={isTeamClickable ? "View team" : teamName}
                        onClick={handleOpenTeam}
                      >
                        {teamName}
                      </span>
                    </>
                  ) : (
                    <span className="truncate">Team</span>
                  )
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
                <span
                  className={[
                    "truncate font-medium text-base-content/70",
                    isTeamClickable
                      ? "cursor-pointer hover:text-primary transition-colors"
                      : "cursor-default",
                  ].join(" ")}
                  title={isTeamClickable ? "View team" : teamName}
                  onClick={handleOpenTeam}
                >
                  {teamName}
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

        {/* Credits pill */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap text-white"
          style={{ backgroundColor: catColor }}
        >
          +{credits} ct.
        </span>
      </div>

      {/* Reason */}
      {reason && (
        <p className="mt-2 text-sm text-base-content/80 italic">
          &ldquo;{reason}&rdquo;
        </p>
      )}

      {/* Bottom row pinned to bottom */}
      <div className="flex items-end justify-between mt-auto pt-3 gap-2">
        {hasAwardeeInfo ? (
          <InlineUserLink
            label="Awarded to"
            user={{
              id: awardedToUserId,
              first_name: awardedToFirstName,
              last_name: awardedToLastName,
              username: awardedToUsername,
              avatar_url: awardedToAvatarUrl,
            }}
            onOpenUser={openUser}
          />
        ) : (
          <InlineUserLink
            label="Awarded by"
            user={{
              id: awardedByUserId,
              first_name: awardedByFirstName,
              last_name: awardedByLastName,
              username: awardedByUsername,
              avatar_url: awardedByAvatarUrl,
            }}
            onOpenUser={openUser}
          />
        )}

        <div className="flex items-center gap-1 text-xs text-base-content/60 leading-tight">
          <Calendar size={12} className="flex-shrink-0" />
          <span>
            {awardedAt ? format(new Date(awardedAt), "MMM d, yyyy") : "Unknown"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AwardCard;
