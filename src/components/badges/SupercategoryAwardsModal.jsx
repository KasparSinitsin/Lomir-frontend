import React from "react";
import { format } from "date-fns";
import {
  Tag,
  Award,
  Users,
  Calendar,
  // Supercategory icons
  Monitor,
  Briefcase,
  Palette,
  GraduationCap,
  HeartHandshake,
  Dumbbell,
  Mountain,
  Leaf,
  Globe,
  Scissors,
  Gamepad2,
  PawPrint,
  Plane,
  Layers,
  // Badge icons
  Scale,
  MessageCircle,
  Flame,
  ClipboardList,
  Anchor,
  Code,
  BarChart2,
  Wrench,
  Network,
  FileText,
  Key,
  Telescope,
  BookOpen,
  Paintbrush,
  PackageOpen,
  Flag,
  UserPlus,
  Map,
  MessageSquare,
  Zap,
  Heart,
  Search,
  Shuffle,
  Share2,
  Settings,
  Lightbulb,
  Compass,
} from "lucide-react";
import Modal from "../common/Modal";
import InlineUserLink from "../users/InlineUserLink";

/**
 * SupercategoryAwardsModal Component
 *
 * Shows all badge awards linked to tags within a focus area supercategory.
 * Grouped by tag, then by badge category within each tag.
 * Analogous to BadgeCategoryModal but for focus area supercategories.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {string} supercategory - Name of the focus area supercategory
 * @param {Array} tags - Array of tag objects in this supercategory (from getDisplayTags)
 * @param {number} totalCredits - Total badge credits across all tags in this supercategory
 * @param {Array} awards - Array of all award objects linked to tags in this supercategory
 * @param {boolean} loading - Whether awards are still loading
 * @param {Function} onOpenUser - Callback to open a user's profile
 */

// Badge category colors
const CATEGORY_COLORS = {
  "Collaboration Skills": "#3B82F6",
  "Technical Expertise": "#10B981",
  "Creative Thinking": "#8B5CF6",
  "Leadership Qualities": "#EF4444",
  "Personal Attributes": "#F59E0B",
};

const CATEGORY_PASTELS = {
  "Collaboration Skills": "#DBEAFE",
  "Technical Expertise": "#D1FAE5",
  "Creative Thinking": "#EDE9FE",
  "Leadership Qualities": "#FEE2E2",
  "Personal Attributes": "#FEF3C7",
};

const DEFAULT_COLOR = "#6B7280";
const DEFAULT_PASTEL = "#F3F4F6";

// Focus area green colors (matching TagsDisplaySection)
const FOCUS_GREEN = "#009213";
const FOCUS_GREEN_DARK = "#036b0c";
const FOCUS_GREEN_PASTEL = "#DCFCE7";

// Supercategory icon map (matching TagsDisplaySection)
const SUPERCATEGORY_ICONS = {
  "Technology & Development": Monitor,
  "Business & Entrepreneurship": Briefcase,
  "Creative Arts & Design": Palette,
  "Learning, Knowledge & Personal Growth": GraduationCap,
  "Social, Community & Volunteering": HeartHandshake,
  "Sports & Fitness": Dumbbell,
  "Outdoor & Adventure": Mountain,
  "Wellness & Lifestyle": Leaf,
  Languages: Globe,
  "Hobbies & Crafts": Scissors,
  Leisure: Gamepad2,
  Pets: PawPrint,
  Travels: Plane,
};

// Get supercategory icon
const getSupercategoryIcon = (supercategory, size = 20) => {
  const IconComponent = SUPERCATEGORY_ICONS[supercategory] || Layers;
  return (
    <IconComponent
      size={size}
      style={{ color: FOCUS_GREEN }}
      className="flex-shrink-0"
    />
  );
};

// Get badge category icon
const getCategoryIcon = (category, color, size = 16) => {
  const iconProps = { size, style: { color } };
  const categoryLower = category?.toLowerCase() || "";

  if (categoryLower.includes("collaboration")) return <Users {...iconProps} />;
  if (categoryLower.includes("technical")) return <Settings {...iconProps} />;
  if (categoryLower.includes("creative")) return <Lightbulb {...iconProps} />;
  if (categoryLower.includes("leadership")) return <Compass {...iconProps} />;
  if (categoryLower.includes("personal")) return <Heart {...iconProps} />;

  return <Award {...iconProps} />;
};

// Get badge icon based on name
const getBadgeIcon = (badgeName, color, size = 16) => {
  const iconProps = { size, style: { color } };

  switch (badgeName) {
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
      return <GraduationCap {...iconProps} />;
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

// Get context label
const getContextLabel = (contextType) => {
  switch (contextType) {
    case "team":
      return "Teamwork";
    case "project":
      return "Project";
    case "personal":
      return "Personal";
    default:
      return "Contribution";
  }
};

const SupercategoryAwardsModal = ({
  isOpen,
  onClose,
  supercategory,
  tags = [],
  totalCredits = 0,
  awards = [],
  loading = false,
  onOpenUser,
}) => {
  // Group awards by tag name
  const awardsByTag = awards.reduce((acc, award) => {
    const tagName = award.tagName ?? award.tag_name ?? "Unknown";
    if (!acc[tagName]) {
      acc[tagName] = {
        awards: [],
        totalCredits: 0,
      };
    }
    acc[tagName].awards.push(award);
    acc[tagName].totalCredits += Number(award.credits ?? 0);
    return acc;
  }, {});

  // Sort tags by total credits (highest first)
  const sortedTags = Object.entries(awardsByTag).sort(
    ([, a], [, b]) => b.totalCredits - a.totalCredits,
  );

  // Count unique awarding users across all tags
  const awardingUserCount = new Set(
    awards
      .map((a) => a.awardedByUserId || a.awarded_by_user_id)
      .filter(Boolean),
  ).size;

  // Count tags that have awards
  const creditedTagCount = sortedTags.length;

  // Total tags in this supercategory (including those without awards)
  const totalTagCount = tags.length;

  const titleNode = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {getSupercategoryIcon(supercategory, 20)}
        <span
          className="text-xl font-medium truncate"
          style={{ color: FOCUS_GREEN }}
        >
          {supercategory}
        </span>
        {totalCredits > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap flex-shrink-0"
            style={{ backgroundColor: FOCUS_GREEN }}
          >
            {totalCredits} ct.
          </span>
        )}
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
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : sortedTags.length === 0 ? (
          <p className="text-base-content/60 text-center py-8">
            No badge awards linked to focus areas in this category yet.
          </p>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-3 text-sm text-base-content/60 px-1">
              <span className="flex items-center gap-1">
                <Tag size={14} />
                {creditedTagCount} of {totalTagCount} focus area
                {totalTagCount !== 1 ? "s" : ""} with awards
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Award size={14} />
                {awards.length} award{awards.length !== 1 ? "s" : ""}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={14} />
                {awardingUserCount}{" "}
                {awardingUserCount === 1 ? "person" : "people"}
              </span>
            </div>

            {/* Awards grouped by tag */}
            {sortedTags.map(([tagName, tagData]) => {
              // Group this tag's awards by badge category
              const awardsByCategory = tagData.awards.reduce((acc, award) => {
                const category =
                  award.badgeCategory || award.badge_category || "Other";
                if (!acc[category]) {
                  acc[category] = {
                    awards: [],
                    totalCredits: 0,
                  };
                }
                acc[category].awards.push(award);
                acc[category].totalCredits += Number(award.credits ?? 0);
                return acc;
              }, {});

              // Sort badge categories by credits
              const sortedCategories = Object.entries(awardsByCategory).sort(
                ([, a], [, b]) => b.totalCredits - a.totalCredits,
              );

              return (
                <div
                  key={tagName}
                  className="rounded-xl overflow-hidden border border-base-200"
                >
                  {/* Tag header */}
                  <div
                    className="flex items-center justify-between p-3"
                    style={{ backgroundColor: FOCUS_GREEN_PASTEL }}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={14} style={{ color: FOCUS_GREEN }} />
                      <span
                        className="font-medium text-sm"
                        style={{ color: FOCUS_GREEN_DARK }}
                      >
                        {tagName}
                      </span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: FOCUS_GREEN }}
                    >
                      {tagData.totalCredits} ct.
                    </span>
                  </div>

                  {/* Awards within this tag, grouped by badge category */}
                  <div className="p-3 space-y-3">
                    {sortedCategories.map(([category, catData]) => {
                      const catColor =
                        CATEGORY_COLORS[category] || DEFAULT_COLOR;

                      return (
                        <div key={category} className="space-y-2">
                          {/* Badge category sub-header */}
                          <div className="flex items-center gap-1.5">
                            {getCategoryIcon(category, catColor, 14)}
                            <span
                              className="text-xs font-medium"
                              style={{ color: catColor }}
                            >
                              {category}
                            </span>
                            <span className="text-xs text-base-content/40">
                              · {catData.totalCredits} ct.
                            </span>
                          </div>

                          {/* Individual awards */}
                          {catData.awards.map((award, idx) => {
                            const badgeName =
                              award.badgeName || award.badge_name || "Badge";

                            return (
                              <div
                                key={award.id || idx}
                                className="pl-5 py-2 border-l-2 ml-1"
                                style={{ borderColor: catColor }}
                              >
                                {/* Top row: badge name + date + credits */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {getBadgeIcon(badgeName, catColor, 16)}
                                    <span
                                      className="font-medium text-sm"
                                      style={{ color: catColor }}
                                    >
                                      {badgeName}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs text-base-content/40">
                                      <Calendar size={10} />
                                      <span>
                                        {award.awardedAt || award.awarded_at
                                          ? format(
                                              new Date(
                                                award.awardedAt ||
                                                  award.awarded_at,
                                              ),
                                              "MMM d, yyyy",
                                            )
                                          : "Unknown date"}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-base-200/50 text-base-content/50">
                                        {getContextLabel(
                                          award.contextType ||
                                            award.context_type,
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <span
                                    className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap text-white"
                                    style={{ backgroundColor: catColor }}
                                  >
                                    +{award.credits} ct.
                                  </span>
                                </div>

                                {/* Reason */}
                                {award.reason && (
                                  <p className="mt-2 text-sm text-base-content/80 italic">
                                    &ldquo;{award.reason}&rdquo;
                                  </p>
                                )}

                                {/* Bottom row: Awarded by + Team */}
                                <div className="flex items-center justify-between mt-2 gap-2">
                                  <InlineUserLink
                                    label="Awarded by"
                                    user={{
                                      id:
                                        award.awardedByUserId ||
                                        award.awarded_by_user_id,
                                      first_name:
                                        award.awardedByFirstName ||
                                        award.awarded_by_first_name,
                                      last_name:
                                        award.awardedByLastName ||
                                        award.awarded_by_last_name,
                                      username:
                                        award.awardedByUsername ||
                                        award.awarded_by_username,
                                      avatar_url:
                                        award.awardedByAvatarUrl ||
                                        award.awarded_by_avatar_url,
                                    }}
                                    onOpenUser={onOpenUser}
                                  />

                                  {(award.teamName || award.team_name) && (
                                    <div className="flex items-center gap-1 text-xs text-base-content/50">
                                      <Users size={12} />
                                      {award.teamName || award.team_name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </Modal>
  );
};

export default SupercategoryAwardsModal;
