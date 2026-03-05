import React from "react";
import { format } from "date-fns";
import { Users, Calendar, Info, Briefcase, User, Tag } from "lucide-react";
import InlineUserLink from "../users/InlineUserLink";
import { useTeamModal } from "../../contexts/TeamModalContext";

/**
 * AwardCard
 *
 * Canonical badge-award card UI (used across badge-related modals).
 * Matches the layout/design used in SupercategoryAwardsModal.
 *
 * Props:
 * - award: award object (supports camelCase + snake_case)
 * - category: string (badge category, for title tooltip or fallbacks)
 * - categoryColor: string (e.g. "#F59E0B")
 * - categoryPastel: string (optional; used as card background if provided)
 * - onOpenUser: function(userId)
 * - onOpenTeam: optional function(teamId, teamName)
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
    // sometimes generic context_id is used for team awards
    (contextType === "team" ? (award?.contextId ?? award?.context_id) : null) ??
    null;

  const tagName = award?.tagName ?? award?.tag_name ?? null;

  const awardedByUserId = award?.awardedByUserId || award?.awarded_by_user_id;
  const awardedByFirstName =
    award?.awardedByFirstName || award?.awarded_by_first_name;
  const awardedByLastName =
    award?.awardedByLastName || award?.awarded_by_last_name;
  const awardedByUsername =
    award?.awardedByUsername || award?.awarded_by_username;
  const awardedByAvatarUrl =
    award?.awardedByAvatarUrl || award?.awarded_by_avatar_url;

  // --- Team modal integration (global fallback) ---
  let teamModal = null;
  try {
    teamModal = useTeamModal();
  } catch (e) {
    teamModal = null;
  }

  // Prefer explicit prop, otherwise fall back to global TeamModalContext
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
      {/* Top row: context type (title) + credits pill */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Title: context icon + context label — same typography as badge name was */}
          <div className="flex items-center gap-2 min-w-0">
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
          </div>

          {/* Sub-row: team name + linked tag — single line */}
          {(contextType === "team" && teamName) || (tagName && !hideTag) ? (
            <div className="flex items-center gap-2 text-xs text-base-content/60 mt-1 min-w-0 leading-tight">
              {contextType === "team" && teamName && (
                <span className="flex items-center gap-1 min-w-0 flex-shrink-0">
                  <span>Team:</span>
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
              {tagName && !hideTag && (
                <span className="flex items-center gap-1 min-w-0">
                  <Tag size={11} className="flex-shrink-0" />
                  <span className="truncate">{tagName}</span>
                </span>
              )}
            </div>
          ) : null}
        </div>

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
        <InlineUserLink
          label="Awarded by"
          user={{
            id: awardedByUserId,
            first_name: awardedByFirstName,
            last_name: awardedByLastName,
            username: awardedByUsername,
            avatar_url: awardedByAvatarUrl,
          }}
          onOpenUser={onOpenUser}
        />

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
