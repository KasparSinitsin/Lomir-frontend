import { useState, useCallback } from "react";
import { teamService } from "../services/teamService";

/**
 * useTeamAwardModals
 *
 * Team-scoped parallel of useAwardModals.
 * Fetches badge awards for ALL team members (restricted to team focus-area tags)
 * and feeds them to TagAwardsModal / SupercategoryAwardsModal / BadgeCategoryModal.
 *
 * @param {string|number} teamId - The team whose focus-area awards to fetch
 * @returns {Object} Modal state, handlers, closers, and props-spreaders
 */

/**
 * Robustly unwrap an API response to get the data rows array.
 */
const unwrapRows = (response) => {
  const payload =
    response?.success !== undefined
      ? response
      : response?.data?.success !== undefined
        ? response.data
        : (response?.data ?? response);

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  return rows;
};

const useTeamAwardModals = (teamId) => {
  // ========= Tag Awards Modal state =========
  const [tagAwardsModal, setTagAwardsModal] = useState({
    isOpen: false,
    tagName: null,
    dominantBadgeCategory: null,
    totalCredits: 0,
  });
  const [tagAwards, setTagAwards] = useState([]);
  const [tagAwardsLoading, setTagAwardsLoading] = useState(false);

  // ========= Supercategory Awards Modal state =========
  const [supercategoryModal, setSupercategoryModal] = useState({
    isOpen: false,
    supercategory: null,
    tags: [],
    totalCredits: 0,
  });
  const [supercategoryAwards, setSupercategoryAwards] = useState([]);
  const [supercategoryLoading, setSupercategoryLoading] = useState(false);

  // ========= Badge Category Modal state (NEW) =========
  const [badgeCategoryModal, setBadgeCategoryModal] = useState({
    isOpen: false,
    category: null,
    color: null,
    badges: [],
    totalCredits: 0,
    focusedBadgeName: null,
  });
  const [detailedBadgeAwards, setDetailedBadgeAwards] = useState([]);
  const [badgeModalLoading, setBadgeModalLoading] = useState(false);

  // ========= Shared fetch helper (focus-area filtered awards) =========

  const fetchTeamAwards = useCallback(async () => {
    if (!teamId) return [];
    try {
      const response = await teamService.getTeamBadgeAwards(teamId);
      return unwrapRows(response);
    } catch (error) {
      console.error("Error fetching team badge awards:", error);
      return [];
    }
  }, [teamId]);

  /** Fetch ALL badge awards for team members (not filtered by focus areas).
   *  Used by badge category / badge pill drill-downs. */
  const fetchAllTeamBadgeAwards = useCallback(async () => {
    if (!teamId) return [];
    try {
      const response = await teamService.getTeamMemberBadgeAwards(teamId);
      return unwrapRows(response);
    } catch (error) {
      console.error("Error fetching all team member badge awards:", error);
      return [];
    }
  }, [teamId]);

  // ========= Tag & Supercategory Handlers (unchanged) =========

  /** Click a credited tag pill → open TagAwardsModal */
  const handleTagClick = useCallback(
    async (tag) => {
      setTagAwardsModal({
        isOpen: true,
        tagName: tag.name,
        dominantBadgeCategory:
          tag.dominantBadgeCategory || tag.dominant_badge_category,
        totalCredits: tag.badgeCredits || tag.badge_credits || 0,
      });
      setTagAwardsLoading(true);

      try {
        const rows = await fetchTeamAwards();

        const filtered = rows.filter((award) => {
          const awardTagName = award.tagName ?? award.tag_name;
          return awardTagName === tag.name;
        });

        setTagAwards(filtered);
      } catch (error) {
        console.error("Error filtering tag awards:", error);
        setTagAwards([]);
      } finally {
        setTagAwardsLoading(false);
      }
    },
    [fetchTeamAwards],
  );

  /** Click a supercategory icon → open SupercategoryAwardsModal */
  const handleSupercategoryClick = useCallback(
    async (supercategory, groupTags) => {
      const totalCredits = groupTags.reduce(
        (sum, t) => sum + (t.badgeCredits || t.badge_credits || 0),
        0,
      );

      setSupercategoryModal({
        isOpen: true,
        supercategory,
        tags: groupTags,
        totalCredits,
      });
      setSupercategoryLoading(true);

      try {
        const rows = await fetchTeamAwards();

        const tagNames = new Set(groupTags.map((t) => t.name));

        const filtered = rows.filter((award) => {
          const awardTagName = award.tagName ?? award.tag_name;
          return awardTagName && tagNames.has(awardTagName);
        });

        setSupercategoryAwards(filtered);
      } catch (error) {
        console.error("Error filtering supercategory awards:", error);
        setSupercategoryAwards([]);
      } finally {
        setSupercategoryLoading(false);
      }
    },
    [fetchTeamAwards],
  );

  // ========= Badge Category & Badge Pill Handlers (NEW) =========

  /** Click a badge category icon → open BadgeCategoryModal for entire category */
  const handleBadgeCategoryClick = useCallback(
    async (category, color, badges, totalCredits) => {
      setBadgeCategoryModal({
        isOpen: true,
        category,
        color,
        badges,
        totalCredits,
        focusedBadgeName: null,
      });
      setBadgeModalLoading(true);

      try {
        const rows = await fetchAllTeamBadgeAwards();

        const categoryAwards = rows.filter((award) => {
          const c =
            award.badgeCategory ??
            award.badge_category ??
            award.category ??
            award.badge_category_name;
          return String(c ?? "").trim() === String(category ?? "").trim();
        });

        setDetailedBadgeAwards(categoryAwards);
      } catch (error) {
        console.error("Error fetching detailed badge awards:", error);
        setDetailedBadgeAwards([]);
      } finally {
        setBadgeModalLoading(false);
      }
    },
    [fetchAllTeamBadgeAwards],
  );

  /** Click an individual badge pill → open BadgeCategoryModal focused on that badge */
  const handleBadgeClick = useCallback(
    async (badge, category, color) => {
      const badgeCredits = badge.total_credits ?? badge.totalCredits ?? 0;

      setBadgeCategoryModal({
        isOpen: true,
        category,
        color,
        badges: [badge],
        totalCredits: badgeCredits,
        focusedBadgeName: badge.name,
      });
      setBadgeModalLoading(true);

      try {
        const rows = await fetchAllTeamBadgeAwards();

        const badgeAwards = rows.filter((award) => {
          const awardBadgeName =
            award.badgeName ?? award.badge_name ?? award.name;
          return (
            String(awardBadgeName ?? "").trim() ===
            String(badge.name ?? "").trim()
          );
        });

        setDetailedBadgeAwards(badgeAwards);
      } catch (error) {
        console.error("Error fetching badge awards:", error);
        setDetailedBadgeAwards([]);
      } finally {
        setBadgeModalLoading(false);
      }
    },
    [fetchAllTeamBadgeAwards],
  );

  // ========= Closers =========

  const closeTagAwardsModal = useCallback(() => {
    setTagAwardsModal({
      isOpen: false,
      tagName: null,
      dominantBadgeCategory: null,
      totalCredits: 0,
    });
    setTagAwards([]);
  }, []);

  const closeSupercategoryModal = useCallback(() => {
    setSupercategoryModal({
      isOpen: false,
      supercategory: null,
      tags: [],
      totalCredits: 0,
    });
    setSupercategoryAwards([]);
  }, []);

  const closeBadgeCategoryModal = useCallback(() => {
    setBadgeCategoryModal({
      isOpen: false,
      category: null,
      color: null,
      badges: [],
      totalCredits: 0,
      focusedBadgeName: null,
    });
    setDetailedBadgeAwards([]);
  }, []);

  // ========= Props-spreader objects (for cleaner JSX) =========

  /** Spread onto <TagAwardsModal ... /> */
  const tagAwardsModalProps = {
    isOpen: tagAwardsModal.isOpen,
    onClose: closeTagAwardsModal,
    tagName: tagAwardsModal.tagName,
    dominantBadgeCategory: tagAwardsModal.dominantBadgeCategory,
    totalCredits: tagAwardsModal.totalCredits,
    awards: tagAwards,
    loading: tagAwardsLoading,
    entityType: "team",
  };

  /** Spread onto <SupercategoryAwardsModal ... /> */
  const supercategoryModalProps = {
    isOpen: supercategoryModal.isOpen,
    onClose: closeSupercategoryModal,
    supercategory: supercategoryModal.supercategory,
    tags: supercategoryModal.tags,
    totalCredits: supercategoryModal.totalCredits,
    awards: supercategoryAwards,
    loading: supercategoryLoading,
    entityType: "team",
  };

  /** Spread onto <BadgeCategoryModal ... /> (NEW) */
  const badgeCategoryModalProps = {
    isOpen: badgeCategoryModal.isOpen,
    onClose: closeBadgeCategoryModal,
    category: badgeCategoryModal.category,
    color: badgeCategoryModal.color,
    badges: badgeCategoryModal.badges,
    totalCredits: badgeCategoryModal.totalCredits,
    detailedAwards: detailedBadgeAwards,
    loading: badgeModalLoading,
    focusedBadgeName: badgeCategoryModal.focusedBadgeName,
  };

  return {
    // Handlers (wire to TagsDisplaySection & BadgesDisplaySection)
    handleTagClick,
    handleSupercategoryClick,
    handleBadgeCategoryClick,
    handleBadgeClick,

    // Closers (if needed individually)
    closeTagAwardsModal,
    closeSupercategoryModal,
    closeBadgeCategoryModal,

    // Props-spreader objects (for JSX)
    tagAwardsModalProps,
    supercategoryModalProps,
    badgeCategoryModalProps,
  };
};

export default useTeamAwardModals;
