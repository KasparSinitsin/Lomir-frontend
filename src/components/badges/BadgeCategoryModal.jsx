import React from "react";
import { format } from "date-fns";
import {
  Users,
  Settings,
  Lightbulb,
  Compass,
  Heart,
  Award,
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
  Mountain,
  Search,
  Shuffle,
  Share2,
  Calendar,
} from "lucide-react";
import Modal from "../common/Modal";
import InlineUserLink from "../users/InlineUserLink";

/**
 * BadgeCategoryModal Component
 *
 * Shows detailed information about badges in a category including
 * individual awards, who gave them, when, and why.
 */

// Pastel background colors for each category
const CATEGORY_PASTELS = {
  "Collaboration Skills": "#DBEAFE",
  "Technical Expertise": "#D1FAE5",
  "Creative Thinking": "#EDE9FE",
  "Leadership Qualities": "#FEE2E2",
  "Personal Attributes": "#FEF3C7",
};

const DEFAULT_PASTEL = "#F3F4F6";

const BadgeCategoryModal = ({
  isOpen,
  onClose,
  category,
  color,
  badges = [],
  detailedAwards = [],
  totalCredits = 0,
  loading = false,
  onOpenUser,
  focusedBadgeName = null,
}) => {
  // Get category icon
  const getCategoryIcon = (size = 24) => {
    const iconProps = { size, style: { color } };
    const categoryLower = category?.toLowerCase() || "";

    if (categoryLower.includes("collaboration"))
      return <Users {...iconProps} />;
    if (categoryLower.includes("technical")) return <Settings {...iconProps} />;
    if (categoryLower.includes("creative")) return <Lightbulb {...iconProps} />;
    if (categoryLower.includes("leadership")) return <Compass {...iconProps} />;
    if (categoryLower.includes("personal")) return <Heart {...iconProps} />;

    return <Award {...iconProps} />;
  };

  // Get badge icon based on name
  const getBadgeIcon = (badgeName, size = 18) => {
    const iconProps = { size, style: { color } };

    switch (badgeName) {
      // Collaboration Skills
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
      // Technical Expertise
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
      // Creative Thinking
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
      // Leadership Qualities
      case "Decision Maker":
        return <Compass {...iconProps} />;
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
      // Personal Attributes
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

  // Human-readable labels for award contexts
  const CONTEXT_LABELS = {
    profile: "Personal contribution",
    team: "Team contribution",
    project: "Project contribution",
    chat: "Conversation contribution",
  };

  const formatContextType = (contextType) => {
    if (!contextType) return null;
    return CONTEXT_LABELS[contextType] ?? "Contribution";
  };

  // Group detailed awards by badge name
  const awardsByBadge = detailedAwards.reduce((acc, award) => {
    const badgeName = award.badgeName;
    if (!badgeName) return acc;

    if (!acc[badgeName]) {
      acc[badgeName] = {
        badge: {
          name: award.badgeName,
          description: award.badgeDescription,
        },
        awards: [],
        totalCredits: 0,
      };
    }

    acc[badgeName].awards.push(award);
    acc[badgeName].totalCredits += Number(award.credits ?? 0);
    return acc;
  }, {});

  // Sort badges by total credits
  const allSortedBadges = Object.entries(awardsByBadge).sort(
    ([, a], [, b]) => b.totalCredits - a.totalCredits,
  );

  // Filter to focused badge if specified
  const sortedBadges = focusedBadgeName
    ? allSortedBadges.filter(([badgeName]) => badgeName === focusedBadgeName)
    : allSortedBadges;

  const pastelBg = CATEGORY_PASTELS[category] || DEFAULT_PASTEL;

  // Unique badges in this category
  const badgeCount = Object.keys(awardsByBadge).length;

  // Unique awarding users in this category
  const awardingUserCount = new Set(
    detailedAwards.map((award) => award.awardedByUserId).filter(Boolean),
  ).size;

  const titleNode = (
    <div className="min-w-0">
      {/* Line 1: icon + title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">{getCategoryIcon(20)}</span>

        <span className="text-xl font-medium truncate" style={{ color }}>
          {focusedBadgeName
            ? category
            : `Earned badges for ${category || "this category"}`}
        </span>
      </div>

      {/* Line 2: subtitle (flush left)
      <div
        className="text-sm font-medium truncate"
        style={{ color, opacity: 0.6 }}
      >
        {focusedBadgeName ? (
          <>
            {awardingUserCount} {awardingUserCount === 1 ? "person" : "people"}{" "}
            awarded {totalCredits} ct.
          </>
        ) : (
          <>
            {badgeCount} badge{badgeCount !== 1 ? "s" : ""} awarded by{" "}
            {awardingUserCount} {awardingUserCount === 1 ? "person" : "people"}{" "}
            | {totalCredits} ct. total
          </>
        )}
      </div> */}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      size="large"
      position="center"
      zIndexClass="z-[1000]"
      boxZIndexClass="z-[1001]"
    >
      <div
        className={`space-y-4 max-h-[60vh] overflow-y-auto ${focusedBadgeName ? "-mx-6 -mb-6 -mt-6 px-6 pb-6 pt-4" : ""}`}
        style={focusedBadgeName ? { backgroundColor: pastelBg } : {}}
      >
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : sortedBadges.length === 0 ? (
          <p className="text-base-content/60 text-center py-8">
            No detailed award information available.
          </p>
        ) : (
          sortedBadges.map(([badgeName, data]) => (
            <div
              key={badgeName}
              className={focusedBadgeName ? "" : "rounded-lg overflow-hidden"}
              style={focusedBadgeName ? {} : { backgroundColor: pastelBg }}
            >
              {/* Badge header - only show when viewing multiple badges */}
              {!focusedBadgeName && (
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {getBadgeIcon(badgeName)}
                    <span className="font-medium truncate" style={{ color }}>
                      {badgeName}
                    </span>
                  </div>

                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded-full bg-white/70 whitespace-nowrap"
                    style={{ color }}
                  >
                    {data.totalCredits} ct.
                  </span>
                </div>
              )}

              {/* Content wrapper */}
              <div>
                {/* Badge title - only in single badge view */}
                {focusedBadgeName && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getBadgeIcon(badgeName, 24)}
                      <span
                        className="text-2xl font-bold truncate"
                        style={{ color }}
                      >
                        {badgeName} Badge
                      </span>
                    </div>

                    <span
                      className="text-sm font-medium px-2 py-0.5 rounded-full bg-white/70 whitespace-nowrap"
                      style={{ color }}
                    >
                      {data.totalCredits} ct.
                    </span>
                  </div>
                )}

                {/* Badge description */}
                {data.badge?.description && (
                  <p
                    className={
                      focusedBadgeName
                        ? "pb-4 text-sm"
                        : "px-3 -mt-1 pb-3 text-sm"
                    }
                    style={{ color, opacity: 0.8 }}
                  >
                    {data.badge.description}
                  </p>
                )}

                {/* Individual awards - responsive grid */}
                <div
                  className={
                    focusedBadgeName
                      ? "grid grid-cols-1 md:grid-cols-2 gap-2"
                      : "px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2"
                  }
                >
                  {data.awards.map((award, index) => (
                    <div
                      key={`${award.awardId ?? award.awardedAt}-${index}`}
                      className="bg-white/60 rounded-lg p-3 flex flex-col"
                    >
                      {/* Top row: context title + date (left) + credits pill (right) */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {award.contextType && (
                            <div
                              className="font-medium leading-tight truncate"
                              style={{ color }}
                            >
                              {formatContextType(award.contextType)}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-base-content/50 leading-tight">
                            <Calendar size={12} />
                            <span>
                              {award.awardedAt
                                ? format(
                                    new Date(award.awardedAt),
                                    "MMM d, yyyy",
                                  )
                                : "Unknown date"}
                            </span>
                          </div>
                        </div>

                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap text-white"
                          style={{ backgroundColor: color }}
                        >
                          +{award.credits} ct.
                        </span>
                      </div>

                      {/* Reason */}
                      {award.reason && (
                        <p className="mt-2 text-sm text-base-content/80 italic">
                          "{award.reason}"
                        </p>
                      )}

                      {/* Bottom row: Awarded by (left) + Team name (right) */}
                      <div className="flex items-center justify-between mt-2">
                        {/* Awarded by */}
                        <InlineUserLink
                          label="Awarded by"
                          user={{
                            id: award.awardedByUserId,
                            first_name: award.awardedByFirstName,
                            last_name: award.awardedByLastName,
                            username: award.awardedByUsername,
                            avatar_url: award.awardedByAvatarUrl,
                          }}
                          onOpenUser={onOpenUser}
                        />

                        {/* Team name if present */}
                        {award.teamName && (
                          <div className="flex items-center gap-1 text-xs text-base-content/50">
                            <Users size={12} />
                            {award.teamName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default BadgeCategoryModal;
