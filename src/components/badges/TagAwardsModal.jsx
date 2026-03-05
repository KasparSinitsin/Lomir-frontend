import React, { useState } from "react";
import { format } from "date-fns";
import {
  Tag,
  Award,
  Users,
  Calendar,
} from "lucide-react";
import {
  CATEGORY_COLORS,
  CATEGORY_SECTION_PASTELS,
  CATEGORY_CARD_PASTELS,
  DEFAULT_COLOR,
  DEFAULT_SECTION_PASTEL,
  DEFAULT_CARD_PASTEL,
  FOCUS_GREEN,
} from "../../constants/badgeConstants";
import { getCategoryIcon } from "../../utils/badgeIconUtils";
import Modal from "../common/Modal";
import InlineUserLink from "../users/InlineUserLink";
import AwardCard from "./AwardCard";
import TeamDetailsModal from "../teams/TeamDetailsModal";

/**
 * TagAwardsModal Component
 *
 * Shows all badge awards linked to a specific tag/focus area.
 * Grouped by badge category, styled similarly to BadgeCategoryModal.
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {string} tagName - Name of the tag
 * @param {string} dominantBadgeCategory - The dominant badge category for coloring
 * @param {number} totalCredits - Total badge credits on this tag
 * @param {Array} awards - Array of award objects linked to this tag
 * @param {boolean} loading - Whether awards are still loading
 * @param {Function} onOpenUser - Callback to open a user's profile
 */

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

const TagAwardsModal = ({
  isOpen,
  onClose,
  tagName,
  dominantBadgeCategory,
  totalCredits = 0,
  awards = [],
  loading = false,
  onOpenUser,
  highlightBadgeName = null,
}) => {
  // Internal TeamDetailsModal state (mirrors SupercategoryAwardsModal)
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

  // const dominantColor = CATEGORY_COLORS[dominantBadgeCategory] || DEFAULT_COLOR;

  // Group awards by badge category
  const awardsByCategory = awards.reduce((acc, award) => {
    const category = award.badgeCategory || award.badge_category || "Other";
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

  // Sort categories by total credits
  const sortedCategories = Object.entries(awardsByCategory).sort(
    ([, a], [, b]) => b.totalCredits - a.totalCredits,
  );

  // Unique awarding users
  const awardingUserCount = new Set(
    awards
      .map((a) => a.awardedByUserId || a.awarded_by_user_id)
      .filter(Boolean),
  ).size;

  const creditedCategoryCount = sortedCategories.length;

  const titleNode = (
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Tag
          size={20}
          style={{ color: FOCUS_GREEN }}
          className="flex-shrink-0"
        />
        <span
          className="text-xl font-medium truncate"
          style={{ color: FOCUS_GREEN }}
        >
          {tagName}
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
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
          ) : sortedCategories.length === 0 ? (
            <p className="text-base-content/60 text-center py-8">
              No badge awards linked to this focus area yet.
            </p>
          ) : (
            /* Summary bar */
            <>
              {/* Summary bar (match SupercategoryAwardsModal) */}
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
                    <span className="font-medium">{creditedCategoryCount}</span>
                    <span className="hidden sm:inline">
                      categor{creditedCategoryCount !== 1 ? "ies" : "y"}
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

              {/* Awards grouped by category */}
              {sortedCategories.map(([category, data]) => {
                const catColor = CATEGORY_COLORS[category] || DEFAULT_COLOR;
                const sectionPastel =
                  CATEGORY_SECTION_PASTELS[category] || DEFAULT_SECTION_PASTEL;
                const cardPastel =
                  CATEGORY_CARD_PASTELS[category] || DEFAULT_CARD_PASTEL;

                return (
                  <div
                    key={category}
                    className="rounded-xl overflow-hidden border border-base-200"
                  >
                    {/* Category header */}
                    <div
                      className="flex items-center justify-between p-3"
                      style={{ backgroundColor: sectionPastel }}
                    >
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category, catColor)}
                        <span
                          className="font-medium text-sm"
                          style={{ color: catColor }}
                        >
                          {category}
                        </span>
                      </div>

                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.75)",
                          color: catColor,
                          border: `1px solid ${catColor}33`,
                        }}
                      >
                        {data.totalCredits} ct.
                      </span>
                    </div>

                    {/* Award cards (use shared AwardCard + Supercategory grid) */}
                    <div
                      className="p-3"
                      style={{ backgroundColor: sectionPastel }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.awards.map((award, idx) => {
                          const normalizedAward = {
                            ...award,

                            // make sure AwardCard can find these (covers more possible API shapes)
                            teamId:
                              award.teamId ??
                              award.team_id ??
                              award.contextTeamId ??
                              award.context_team_id ??
                              award.team?.id ??
                              null,

                            teamName:
                              award.teamName ??
                              award.team_name ??
                              award.team?.name ??
                              null,

                            contextType:
                              award.contextType ?? award.context_type,
                          };

                          return (
                            <AwardCard
                              key={
                                (award.awardId || award.award_id || award.id) ??
                                `${category}-${idx}`
                              }
                              award={award}
                              category={category}
                              categoryColor={catColor}
                              categoryPastel={cardPastel}
                              onOpenUser={onOpenUser}
                              onOpenTeam={(teamId, teamName) =>
                                handleOpenTeam(teamId, teamName)
                              }
                              hideTag
                              highlighted={
                                !!highlightBadgeName &&
                                (
                                  award.badgeName ??
                                  award.badge_name ??
                                  ""
                                ).toLowerCase() ===
                                  highlightBadgeName.toLowerCase()
                              }
                            />
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
        key={selectedTeamForDetails?.id ?? "none"}
        isOpen={isTeamDetailsOpen}
        teamId={selectedTeamForDetails?.id}
        initialTeamData={selectedTeamForDetails}
        onClose={handleTeamDetailsClose}
      />
    </>
  );
};

export default TagAwardsModal;
