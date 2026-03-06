import { useState, useCallback } from "react";
import { teamService } from "../services/teamService";

/**
 * useTeamAwardModals
 *
 * Team-scoped parallel of useAwardModals.
 * Fetches badge awards for ALL team members (restricted to team focus-area tags)
 * and feeds them to TagAwardsModal / SupercategoryAwardsModal.
 *
 * The modals themselves are reused as-is — they only care about the `awards` array shape.
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

  // ========= Shared fetch helper =========

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

  // ========= Handlers =========

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

  return {
    // Handlers (wire to TagsDisplaySection)
    handleTagClick,
    handleSupercategoryClick,

    // Closers (if needed individually)
    closeTagAwardsModal,
    closeSupercategoryModal,

    // Props-spreader objects (for JSX)
    tagAwardsModalProps,
    supercategoryModalProps,
  };
};

export default useTeamAwardModals;
