import React from "react";
import { format } from "date-fns";
import {
  Award,
  Users,
  Calendar,
  Info,
  Briefcase,
  User,
  // Badge icons
  Scale,
  MessageCircle,
  Flame,
  ClipboardList,
  Anchor,
  Code,
  Palette,
  BarChart2,
  Wrench,
  Network,
  FileText,
  Key,
  Telescope,
  BookOpen,
  Paintbrush,
  PackageOpen,
  GraduationCap,
  Flag,
  UserPlus,
  Map,
  MessageSquare,
  Zap,
  Heart,
  Mountain,
  Search,
  Shuffle,
  Share2,
  Settings,
  Lightbulb,
  Compass,
} from "lucide-react";
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

  const handleOpenTeam = () => {
    if (!isTeamClickable) return;
    // support handlers that accept (id) or (id, name)
    try {
      openTeam(teamId, teamName);
    } catch (e) {
      openTeam(teamId);
    }
  };

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

  // --- Helpers (from SupercategoryAwardsModal) ---
  const getBadgeIcon = (name, color, size = 16) => {
    const iconProps = { size, style: { color } };

    switch (name) {
      case "Team Player":
        return <Users {...iconProps} />;
      case "Mediator":
        return <Scale {...iconProps} />;
      case "Communicator":
        return <MessageCircle {...iconProps} />;
      case "Motivator":
        return <Flame {...iconProps} />;
      case "Organizer":
        return <ClipboardList {...iconProps} />;
      case "Reliable":
        return <Anchor {...iconProps} />;
      case "Coder":
        return <Code {...iconProps} />;
      case "Designer":
        return <Palette {...iconProps} />;
      case "Data Whiz":
        return <BarChart2 {...iconProps} />;
      case "Tech Support":
        return <Wrench {...iconProps} />;
      case "Systems Thinker":
        return <Network {...iconProps} />;
      case "Documentation Master":
        return <FileText {...iconProps} />;
      case "Innovator":
        return <Lightbulb {...iconProps} />;
      case "Problem Solver":
        return <Key {...iconProps} />;
      case "Visionary":
        return <Telescope {...iconProps} />;
      case "Storyteller":
        return <BookOpen {...iconProps} />;
      case "Artisan":
        return <Paintbrush {...iconProps} />;
      case "Outside-the-Box":
        return <PackageOpen {...iconProps} />;
      case "Decision Maker":
      case "Mentor":
        return <GraduationCap {...iconProps} />;
      case "Initiative Taker":
        return <Flag {...iconProps} />;
      case "Delegator":
        return <UserPlus {...iconProps} />;
      case "Strategic Planner":
        return <Map {...iconProps} />;
      case "Feedback Provider":
        return <MessageSquare {...iconProps} />;
      case "Quick Learner":
        return <Zap {...iconProps} />;
      case "Empathetic":
        return <Heart {...iconProps} />;
      case "Persistent":
        return <Mountain {...iconProps} />;
      case "Detail-Oriented":
        return <Search {...iconProps} />;
      case "Adaptable":
        return <Shuffle {...iconProps} />;
      case "Knowledge Sharer":
        return <Share2 {...iconProps} />;
      default:
        return <Award {...iconProps} />;
    }
  };

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
      className="rounded-lg p-3 flex flex-col border"
      style={{
        backgroundColor: categoryPastel || "#F9FAFB",
        borderColor: `${catColor}33`,
      }}
      title={category}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {getBadgeIcon(badgeName, catColor, 16)}
            <span
              className="font-medium leading-tight truncate"
              style={{ color: catColor }}
            >
              {badgeName}
            </span>
          </div>

          {/* Context line — NOT bold */}
          <div className="flex items-center gap-1 text-xs text-base-content/60 mt-1 min-w-0 leading-tight">
            {contextType === "team" && teamName ? (
              <span className="inline-flex items-center gap-1 min-w-0">
                <Users size={12} className="flex-shrink-0" />
                <span className="truncate">{contextLabel}:</span>

                <span
                  className={[
                    "min-w-0 truncate font-medium text-base-content/80",
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
            ) : (
              <>
                <ContextIcon size={12} className="flex-shrink-0" />
                <span className="truncate">{contextLabel}</span>
              </>
            )}
          </div>
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
