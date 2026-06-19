import React, { useState } from "react";
import { Tag, Award, Users } from "lucide-react";
import {
  CATEGORY_COLORS,
  CATEGORY_CARD_PASTELS,
  DEFAULT_COLOR,
  DEFAULT_CARD_PASTEL,
  FOCUS_GREEN,
  FOCUS_GREEN_DARK,
  TAG_SECTION_BG,
} from "../../constants/badgeConstants";
import {
  getSupercategoryIcon,
} from "../../utils/badgeIconUtils";
import Modal from "../common/Modal";
import TeamDetailsModal from "../teams/TeamDetailsModal";
import AwardCard from "./AwardCard";

const SupercategoryAwardsModal = ({
  isOpen,
  onClose,
  supercategory,
  tags = [],
  totalCredits = 0,
  awards = [],
  loading = false,
  onOpenUser,
  entityType,
  highlightBadgeName = null,
  onHideBadge = null,
  onShowBadge = null,
  onDeleteAward = null,
  badgeActionLoadingKey = null,
  hiddenAwardIds = [],
  showHiddenBadgeAwards = false,
  subjectUserId = null,
  canViewPrivateAwardees = false,
  showAwarderAtBottom = false,
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

  const hiddenAwardIdSet = new Set(
    (Array.isArray(hiddenAwardIds) ? hiddenAwardIds : [])
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value)),
  );

  const isAwardHidden = (award) => {
    const awardId = award?.awardId ?? award?.award_id ?? award?.id;
    return awardId !== undefined && awardId !== null
      ? hiddenAwardIdSet.has(String(awardId))
      : false;
  };

  const visibleAwards = showHiddenBadgeAwards
    ? awards
    : awards.filter((award) => !isAwardHidden(award));

  // Group awards by tag name
  const awardsByTag = visibleAwards.reduce((acc, award) => {
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
  // For team context: count unique awardees (members who received badges)
  // For user context: count unique awarders (people who gave badges)
  const personCount =
    entityType === "team"
      ? new Set(
          visibleAwards
            .map((a) => a.awardedToUserId || a.awarded_to_user_id)
            .filter(Boolean),
        ).size
      : new Set(
          visibleAwards
            .map((a) => a.awardedByUserId || a.awarded_by_user_id)
            .filter(Boolean),
        ).size;

  const creditedTagCount = sortedTags.length;
  const totalTagCount = tags.length;

  const titleNode = (
    <h2
      className="text-xl font-medium leading-[110%] mb-[0.2em]"
      style={{ color: FOCUS_GREEN }}
    >
      <span className="leading-[100%]">
        <span className="hidden md:inline">
          Earned badges in the focus area of{" "}
        </span>
        <span className="md:hidden">Earned Badges in </span>
        <span className="block md:inline">
          <span className="inline-block align-middle mr-1.5 shrink-0">
            {getSupercategoryIcon(supercategory, 20)}
          </span>
          <span className="font-semibold">{supercategory}</span>
        </span>
      </span>
    </h2>
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
                    <span className="font-medium">{visibleAwards.length}</span>
                    <span className="hidden sm:inline">
                      award{visibleAwards.length !== 1 ? "s" : ""}
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Users size={14} />
                    <span className="font-medium">{personCount}</span>
                    <span className="hidden sm:inline">
                      {entityType === "team"
                        ? `team member${personCount !== 1 ? "s" : ""} with badges`
                        : personCount === 1
                          ? "person"
                          : "people"}
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
                          const cardPastel =
                            CATEGORY_CARD_PASTELS[category] ||
                            DEFAULT_CARD_PASTEL;

                          return (
                            <AwardCard
                              key={
                                award.id ||
                                `${award.awardedAt || award.awarded_at}-${idx}`
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
                              onHideBadge={onHideBadge}
                              onShowBadge={onShowBadge}
                              onDeleteAward={onDeleteAward}
                              isBadgeHidden={isAwardHidden(award)}
                              badgeActionLoadingKey={badgeActionLoadingKey}
                              subjectUserId={subjectUserId}
                              canViewPrivateAwardees={canViewPrivateAwardees}
                              showAwarderAtBottom={showAwarderAtBottom}
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

export default SupercategoryAwardsModal;
