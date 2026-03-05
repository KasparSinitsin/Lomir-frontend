import React, { useState } from "react";
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
} from "lucide-react";
import Modal from "../common/Modal";
import AwardCard from "./AwardCard";
import TeamDetailsModal from "../teams/TeamDetailsModal";

/**
 * BadgeCategoryModal Component
 *
 * Shows detailed information about badges in a category including
 * individual awards, who gave them, when, and why.
 */

// Section background pastels for each category (100 shades)
const CATEGORY_PASTELS = {
  "Collaboration Skills": "#DBEAFE",
  "Technical Expertise": "#D1FAE5",
  "Creative Thinking": "#EDE9FE",
  "Leadership Qualities": "#FEE2E2",
  "Personal Attributes": "#FEF3C7",
};

// Lighter pastels for AwardCards (50 shades)
const CATEGORY_CARD_PASTELS = {
  "Collaboration Skills": "#EFF6FF", // blue-50
  "Technical Expertise": "#ECFDF5", // green-50
  "Creative Thinking": "#F5F3FF", // violet-50
  "Leadership Qualities": "#FEF2F2", // red-50
  "Personal Attributes": "#FFFBEB", // amber-50
};

const DEFAULT_PASTEL = "#F3F4F6"; // gray-100
const DEFAULT_CARD_PASTEL = "#F9FAFB"; // gray-50

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
  highlightBadgeName = null,
}) => {
  // Team details modal state (for AwardCard team clicks)
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);

  const handleOpenTeam = (teamId, teamName) => {
    if (!teamId) return;
    setSelectedTeamForDetails({ id: teamId, name: teamName });
    setIsTeamDetailsOpen(true);
  };

  const handleTeamDetailsClose = () => {
    setIsTeamDetailsOpen(false);
    setSelectedTeamForDetails(null);
  };

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
  const cardPastel = CATEGORY_CARD_PASTELS[category] || DEFAULT_CARD_PASTEL;

  // Unique badges in this category
  const badgeCount = Object.keys(awardsByBadge).length;

  // Total awards in this category
  const totalAwards = detailedAwards.length;

  // Unique awarding users (people)
  const peopleCount = new Set(
    detailedAwards.map((a) => a.awardedByUserId).filter(Boolean),
  ).size;

  // Focus areas in this category = distinct tagName that received awards
  const creditedFocusAreaCount = new Set(
    detailedAwards.map((a) => a.tagName).filter(Boolean),
  ).size;

  // Unique teams with awards in this category
  const teamCount = new Set(
    detailedAwards.map((a) => a.teamName).filter(Boolean),
  ).size;

  // Unique projects with awards in this category
  const projectCount = new Set(
    detailedAwards
      .filter((a) => a.contextType === "project")
      .map(
        (a) =>
          a.projectName ||
          a.projectId ||
          a.projectTitle ||
          a.awardId ||
          a.awardedAt,
      )
      .filter(Boolean),
  ).size;

  // Unique personal contributions in this category
  const personalCount = detailedAwards.filter(
    (a) => a.contextType === "personal",
  ).length;

  const titleNode = (
    <div className="min-w-0">
      {/* Line 1: icon + title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">{getCategoryIcon(20)}</span>

        <span className="text-xl font-medium truncate" style={{ color }}>
          {focusedBadgeName
            ? category || "Badge Category"
            : `Earned badges for ${category || "this category"}`}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={titleNode}
        size="large"
        position="center"
      >
        <div
          className={`space-y-4 max-h-[60vh] overflow-y-auto ${focusedBadgeName ? "-mx-6 -mb-6 -mt-6 px-6 pb-6 pt-4" : ""}`}
          style={focusedBadgeName ? { backgroundColor: pastelBg } : {}}
        >
          {!loading && !focusedBadgeName && totalAwards > 0 && (
            <div className="flex items-start justify-between px-1 gap-3">
              {/* left side: responsive stat items */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/60 min-w-0">
                {/* Awards */}
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Award size={14} />
                  <span className="font-medium">{totalAwards}</span>
                  <span className="hidden sm:inline">awards</span>
                </span>

                {/* People */}
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Users size={14} />
                  <span className="font-medium">{peopleCount}</span>
                  <span className="hidden sm:inline">
                    {peopleCount === 1 ? "person" : "people"}
                  </span>
                </span>

                {/* Focus areas */}
                {creditedFocusAreaCount > 0 && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Lightbulb size={14} />
                    <span className="font-medium">
                      {creditedFocusAreaCount}
                    </span>
                    <span className="hidden sm:inline">
                      focus {creditedFocusAreaCount === 1 ? "area" : "areas"}
                    </span>
                  </span>
                )}

                {/* Teams */}
                {teamCount > 0 && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Users size={14} />
                    <span className="font-medium">{teamCount}</span>
                    <span className="hidden sm:inline">
                      {teamCount === 1 ? "team" : "teams"}
                    </span>
                  </span>
                )}
              </div>

              {/* right side: total credits */}
              <span
                className="px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap text-white flex-shrink-0 self-start"
                style={{ backgroundColor: color }}
              >
                {totalCredits} ct.
              </span>
            </div>
          )}

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
                      className="text-sm font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.75)",
                        color,
                        border: `1px solid ${color}33`,
                      }}
                    >
                      {data.totalCredits} ct.
                    </span>
                  </div>
                )}

                {/* Content wrapper */}
                <div>
                  {/* Badge title - only in single badge (focused) view */}
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
                        className="text-sm font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.75)",
                          color,
                          border: `1px solid ${color}33`,
                        }}
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

                  {/* Individual award cards — using shared AwardCard for consistent styling */}
                  <div
                    className={
                      focusedBadgeName
                        ? "grid grid-cols-1 md:grid-cols-2 gap-2"
                        : "px-3 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2"
                    }
                  >
                    {data.awards.map((award, index) => (
                      <AwardCard
                        key={`${award.awardId ?? award.awardedAt}-${index}`}
                        award={award}
                        category={category}
                        categoryColor={color}
                        categoryPastel={cardPastel}
                        onOpenUser={onOpenUser}
                        onOpenTeam={handleOpenTeam}
                        highlighted={
                          !!highlightBadgeName &&
                          (
                            award.badgeName ??
                            award.badge_name ??
                            ""
                          ).toLowerCase() === highlightBadgeName.toLowerCase()
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <TeamDetailsModal
        key={selectedTeamForDetails?.id ?? "none"}
        isOpen={isTeamDetailsOpen}
        teamId={selectedTeamForDetails?.id}
        initialTeamData={selectedTeamForDetails}
        onClose={handleTeamDetailsClose}
      />
    </>
  );
};

export default BadgeCategoryModal;
