import React, { useState } from "react";
import { format } from "date-fns";
import {
  Tag,
  Award,
  Users,
  Calendar,
  Info,
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
  Scale,
  User,
} from "lucide-react";
import Modal from "../common/Modal";
import InlineUserLink from "../users/InlineUserLink";
import TeamDetailsModal from "../teams/TeamDetailsModal";

// Badge category colors
const CATEGORY_COLORS = {
  "Collaboration Skills": "#3B82F6",
  "Technical Expertise": "#10B981",
  "Creative Thinking": "#8B5CF6",
  "Leadership Qualities": "#EF4444",
  "Personal Attributes": "#F59E0B",
};

const CATEGORY_PASTELS = {
  "Collaboration Skills": "#EFF6FF", // blue-50
  "Technical Expertise": "#ECFDF5", // green-50
  "Creative Thinking": "#F5F3FF", // violet-50
  "Leadership Qualities": "#FEF2F2", // red-50
  "Personal Attributes": "#FFFBEB", // amber-50
};

const DEFAULT_PASTEL = "#F9FAFB";
const DEFAULT_COLOR = "#6B7280";

// Focus area green colors (matching TagsDisplaySection)
const FOCUS_GREEN = "#009213";
const FOCUS_GREEN_DARK = "#036b0c";

// Light green background for the whole scrollable area
const TAG_SECTION_BG = "#F0FDF4"; // green-50

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

const getContextMeta = (contextType) => {
  switch (contextType) {
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

// Inline team link (mirrors the “Awarded by …” click affordance style)
const InlineTeamLink = ({ teamId, teamName, onOpenTeam, contextLabel }) => {
  const isClickable = Boolean(teamId && onOpenTeam);

  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      <Users size={12} className="flex-shrink-0" />
      {/* label should NOT be bold */}
      <span className="truncate">{contextLabel}:</span>

      {/* team name bold + clickable */}
      <span
        className={[
          "min-w-0 truncate font-medium text-base-content/80",
          isClickable
            ? "cursor-pointer hover:text-primary transition-colors"
            : "cursor-default",
        ].join(" ")}
        title={isClickable ? "View team" : teamName}
        onClick={() => {
          if (!isClickable) return;
          onOpenTeam(teamId);
        }}
      >
        {teamName}
      </span>
    </span>
  );
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
  // Internal TeamDetailsModal state (so the team click works even if parent doesn’t manage it)
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

  // Group awards by tag name
  const awardsByTag = awards.reduce((acc, award) => {
    const tagName = award.tagName ?? award.tag_name ?? "Unknown";
    if (!acc[tagName]) {
      acc[tagName] = { awards: [], totalCredits: 0 };
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

  const creditedTagCount = sortedTags.length;
  const totalTagCount = tags.length;

  const titleNode = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        {getSupercategoryIcon(supercategory, 20)}
        <span
          className="text-xl font-medium truncate"
          style={{ color: FOCUS_GREEN }}
        >
          Earned badges in the focus area of {supercategory}
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
          className="space-y-4 max-h-[60vh] overflow-y-auto -mx-6 -mb-6 -mt-6 px-6 pb-6 pt-4"
          style={{ backgroundColor: TAG_SECTION_BG }}
        >
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
              <div className="flex items-start justify-between px-1 gap-3">
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-base-content/60 min-w-0">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Award size={14} />
                    <span className="font-medium">{awards.length}</span>
                    <span className="hidden sm:inline">
                      award{awards.length !== 1 ? "s" : ""}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Users size={14} />
                    <span className="font-medium">{awardingUserCount}</span>
                    <span className="hidden sm:inline">
                      {awardingUserCount === 1 ? "person" : "people"}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Tag size={14} />
                    <span className="font-medium">
                      {creditedTagCount}
                      {totalTagCount > 0 ? `/${totalTagCount}` : ""}
                    </span>
                    <span className="hidden sm:inline">
                      focus areas with awards
                    </span>
                  </span>
                </div>

                {Number(totalCredits ?? 0) > 0 && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap text-white flex-shrink-0 self-start"
                    style={{ backgroundColor: FOCUS_GREEN }}
                  >
                    {Number(totalCredits ?? 0)} ct.
                  </span>
                )}
              </div>

              {/* Awards grouped by tag */}
              {sortedTags.map(([tagName, tagData]) => {
                const awardsByCategory = tagData.awards.reduce((acc, award) => {
                  const category =
                    award.badgeCategory || award.badge_category || "Other";
                  if (!acc[category])
                    acc[category] = { awards: [], totalCredits: 0 };
                  acc[category].awards.push(award);
                  acc[category].totalCredits += Number(award.credits ?? 0);
                  return acc;
                }, {});

                const sortedCategories = Object.entries(awardsByCategory).sort(
                  ([, a], [, b]) => b.totalCredits - a.totalCredits,
                );

                const orderedAwards = sortedCategories.flatMap(
                  ([category, catData]) =>
                    catData.awards.map((award) => ({
                      ...award,
                      _category: category,
                    })),
                );

                return (
                  <div
                    key={tagName}
                    className="rounded-xl bg-white border overflow-hidden"
                    style={{ borderColor: `${FOCUS_GREEN_DARK}33` }}
                  >
                    {/* Tag header */}
                    <div className="flex items-center justify-between p-3">
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
                        className="text-sm font-medium px-3 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          backgroundColor: TAG_SECTION_BG,
                          color: FOCUS_GREEN_DARK,
                        }}
                      >
                        {tagData.totalCredits} ct.
                      </span>
                    </div>

                    {/* Badge cards */}
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {orderedAwards.map((award, idx) => {
                          const category = award._category || "Other";
                          const catColor =
                            CATEGORY_COLORS[category] || DEFAULT_COLOR;

                          const badgeName =
                            award.badgeName || award.badge_name || "Badge";
                          const awardedAt = award.awardedAt || award.awarded_at;

                          const awardedByUserId =
                            award.awardedByUserId || award.awarded_by_user_id;
                          const awardedByFirstName =
                            award.awardedByFirstName ||
                            award.awarded_by_first_name;
                          const awardedByLastName =
                            award.awardedByLastName ||
                            award.awarded_by_last_name;
                          const awardedByUsername =
                            award.awardedByUsername ||
                            award.awarded_by_username;
                          const awardedByAvatarUrl =
                            award.awardedByAvatarUrl ||
                            award.awarded_by_avatar_url;

                          const teamName = award.teamName || award.team_name;
                          const teamId = award.teamId || award.team_id;

                          const contextType =
                            award.contextType || award.context_type;
                          const { label: contextLabel, Icon: ContextIcon } =
                            getContextMeta(contextType);

                          return (
                            <div
                              key={award.id || `${awardedAt}-${idx}`}
                              className="rounded-lg p-3 flex flex-col border"
                              style={{
                                backgroundColor:
                                  CATEGORY_PASTELS[category] || DEFAULT_PASTEL,
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

                                  {/* Context line — match “Awarded by” sizing/weight (NOT bold) */}
                                  <div className="flex items-center gap-1 text-xs text-base-content/60 mt-1 min-w-0 leading-tight">
                                    {contextType === "team" && teamName ? (
                                      <InlineTeamLink
                                        teamId={teamId}
                                        teamName={teamName}
                                        contextLabel={contextLabel}
                                        onOpenTeam={(id) =>
                                          handleOpenTeam(id, teamName)
                                        }
                                      />
                                    ) : (
                                      <>
                                        <ContextIcon
                                          size={12}
                                          className="flex-shrink-0"
                                        />
                                        <span className="truncate">
                                          {contextLabel}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap text-white"
                                  style={{ backgroundColor: catColor }}
                                >
                                  +{award.credits} ct.
                                </span>
                              </div>

                              {award.reason && (
                                <p className="mt-2 text-sm text-base-content/80 italic">
                                  &ldquo;{award.reason}&rdquo;
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
                                  <Calendar
                                    size={12}
                                    className="flex-shrink-0"
                                  />
                                  <span>
                                    {awardedAt
                                      ? format(
                                          new Date(awardedAt),
                                          "MMM d, yyyy",
                                        )
                                      : "Unknown date"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </Modal>

      <TeamDetailsModal
        isOpen={isTeamDetailsOpen}
        teamId={selectedTeamForDetails?.id}
        initialTeamData={selectedTeamForDetails}
        onClose={handleTeamDetailsClose}
      />
    </>
  );
};

export default SupercategoryAwardsModal;
