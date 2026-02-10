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
import { getUserInitials } from "../../utils/userHelpers";

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
  badges = [], // kept for future use (e.g. show badge pills)
  detailedAwards = [],
  totalCredits = 0,
  loading = false,
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

  // Format context type for display
  const formatContextType = (contextType) => {
    if (!contextType) return null;
    return contextType.charAt(0).toUpperCase() + contextType.slice(1);
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
  const sortedBadges = Object.entries(awardsByBadge).sort(
    ([, a], [, b]) => b.totalCredits - a.totalCredits,
  );

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
      <span className="flex-shrink-0">
        {getCategoryIcon(20)}
      </span>

      <span
        className="text-lg font-medium truncate"
        style={{ color }}
      >
        Earned badges for {category || "this category"}
      </span>
    </div>

    {/* Line 2: subtitle (flush left) */}
    <div
      className="text-sm font-medium truncate"
      style={{ color, opacity: 0.6 }}
    >
      {badgeCount} badge{badgeCount !== 1 ? "s" : ""} awarded by{" "}
      {awardingUserCount} {awardingUserCount === 1 ? "person" : "people"} |{" "}
      {totalCredits} ct. total
    </div>
  </div>
);



  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      size="large"
      position="center"
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
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
              className="border border-base-200 rounded-lg overflow-hidden"
            >
              {/* Badge header */}
              <div
                className="flex items-center justify-between p-3"
                style={{ backgroundColor: pastelBg }}
              >
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

              {/* Badge description */}
              {data.badge?.description && (
                <p className="px-3 py-2 text-sm text-base-content/70 bg-base-100 border-b border-base-200">
                  {data.badge.description}
                </p>
              )}

              {/* Individual awards */}
              <div className="bg-base-100">
                {data.awards.map((award, index) => (
                  <div
                    key={`${award.awardId ?? award.awardedAt}-${index}`}
                    className={`p-3 ${
                      index !== data.awards.length - 1
                        ? "border-b border-base-200"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Awarder avatar */}
                      <div className="flex-shrink-0">
                        {award.awardedByAvatarUrl ? (
                          <img
                            src={award.awardedByAvatarUrl}
                            alt={award.awardedByUsername || "Awarder"}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: color }}
                          >
                            {getUserInitials({
                              first_name: award.awardedByFirstName,
                              last_name: award.awardedByLastName,
                              username: award.awardedByUsername,
                            })}
                          </div>
                        )}
                      </div>

                      {/* Award details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-medium text-base-content truncate">
                            {award.awardedByFirstName && award.awardedByLastName
                              ? `${award.awardedByFirstName} ${award.awardedByLastName}`
                              : award.awardedByUsername || "Unknown user"}
                          </span>

                          <span
                            className="text-sm font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: pastelBg,
                              color,
                            }}
                          >
                            +{award.credits} ct.
                          </span>
                        </div>

                        {/* When and context */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-base-content/60 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {award.awardedAt
                              ? format(new Date(award.awardedAt), "MMM d, yyyy")
                              : "Unknown date"}
                          </span>

                          {award.contextType && (
                            <span className="badge badge-ghost badge-xs">
                              {formatContextType(award.contextType)}
                            </span>
                          )}

                          {award.teamName && (
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {award.teamName}
                            </span>
                          )}
                        </div>

                        {/* Reason */}
                        {award.reason && (
                          <p className="mt-2 text-sm text-base-content/80 italic">
                            "{award.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default BadgeCategoryModal;
