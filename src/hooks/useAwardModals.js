import { useState, useCallback } from "react";
import { userService } from "../services/userService";

/**
 * useAwardModals
 *
 * Shared hook that manages all award drill-down modal state and handlers
 * for BadgeCategoryModal, TagAwardsModal, and SupercategoryAwardsModal.
 *
 * Previously duplicated in UserDetailsModal and Profile.jsx (~150 lines each).
 *
 * @param {string|number} userId - The user whose awards to fetch
 * @returns {Object} Modal state, handlers, closers, and props-spreaders
 */

/**
 * Robustly unwrap an API response to get the data rows array.
 * Handles axios wrappers, { success, data } envelopes, and direct arrays.
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

const useAwardModals = (userId) => {
  // ========= Badge Category Modal state =========
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

  // ========= Handlers =========

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
        const response = await userService.getUserBadges(userId);
        const rows = unwrapRows(response);

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
    [userId],
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
        const response = await userService.getUserBadges(userId);
        const rows = unwrapRows(response);

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
    [userId],
  );

  /** Click a credited tag pill → open TagAwardsModal */
  const handleTagClick = useCallback(
    async (tag) => {
      setTagAwardsModal({
        isOpen: true,
        tagName: tag.name,
        dominantBadgeCategory: tag.dominantBadgeCategory,
        totalCredits: tag.badgeCredits,
      });
      setTagAwardsLoading(true);

      try {
        const response = await userService.getUserBadges(userId);
        const rows = unwrapRows(response);

        const filtered = rows.filter((award) => {
          const awardTagName = award.tagName ?? award.tag_name;
          return awardTagName === tag.name;
        });

        setTagAwards(filtered);
      } catch (error) {
        console.error("Error fetching tag awards:", error);
        setTagAwards([]);
      } finally {
        setTagAwardsLoading(false);
      }
    },
    [userId],
  );

  /** Click a supercategory icon → open SupercategoryAwardsModal */
  const handleSupercategoryClick = useCallback(
    async (supercategory, groupTags) => {
      const totalCredits = groupTags.reduce(
        (sum, t) => sum + (t.badgeCredits || 0),
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
        const response = await userService.getUserBadges(userId);
        const rows = unwrapRows(response);

        const tagNames = new Set(groupTags.map((t) => t.name));

        const filtered = rows.filter((award) => {
          const awardTagName = award.tagName ?? award.tag_name;
          return awardTagName && tagNames.has(awardTagName);
        });

        setSupercategoryAwards(filtered);
      } catch (error) {
        console.error("Error fetching supercategory awards:", error);
        setSupercategoryAwards([]);
      } finally {
        setSupercategoryLoading(false);
      }
    },
    [userId],
  );

  // ========= Closers =========

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

  // ========= Props-spreader objects (for cleaner JSX) =========

  /** Spread onto <BadgeCategoryModal ... /> */
  const badgeCategoryModalProps = {
    isOpen: badgeCategoryModal.isOpen,
    onClose: closeBadgeCategoryModal,
    category: badgeCategoryModal.category,
    color: badgeCategoryModal.color,
    badges: badgeCategoryModal.badges,
    detailedAwards: detailedBadgeAwards,
    totalCredits: badgeCategoryModal.totalCredits,
    loading: badgeModalLoading,
    focusedBadgeName: badgeCategoryModal.focusedBadgeName,
  };

  /** Spread onto <TagAwardsModal ... /> */
  const tagAwardsModalProps = {
    isOpen: tagAwardsModal.isOpen,
    onClose: closeTagAwardsModal,
    tagName: tagAwardsModal.tagName,
    dominantBadgeCategory: tagAwardsModal.dominantBadgeCategory,
    totalCredits: tagAwardsModal.totalCredits,
    awards: tagAwards,
    loading: tagAwardsLoading,
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
  };

  return {
    // Handlers (wire to display sections)
    handleBadgeCategoryClick,
    handleBadgeClick,
    handleTagClick,
    handleSupercategoryClick,

    // Closers (if needed individually)
    closeBadgeCategoryModal,
    closeTagAwardsModal,
    closeSupercategoryModal,

    // Props-spreader objects (for JSX)
    badgeCategoryModalProps,
    tagAwardsModalProps,
    supercategoryModalProps,
  };
};

export default useAwardModals;