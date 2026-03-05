/**
 * badgeConstants.js
 *
 * Single source of truth for all badge category and focus area
 * color/pastel/order constants used across badge and tag components.
 *
 * Previously duplicated in:
 *   BadgesDisplaySection, BadgeCategoryModal, BadgeCategoryCard,
 *   BadgeAwardModal, TagAwardsModal, SupercategoryAwardsModal,
 *   TagsDisplaySection, AwardCard, Profile.jsx
 */

// ═══════════════════════════════════════════════════════════
// BADGE CATEGORY COLORS
// ═══════════════════════════════════════════════════════════

/** Primary color per badge category */
export const CATEGORY_COLORS = {
  "Collaboration Skills": "#3B82F6",
  "Technical Expertise": "#10B981",
  "Creative Thinking": "#8B5CF6",
  "Leadership Qualities": "#EF4444",
  "Personal Attributes": "#F59E0B",
};

/** Stronger pastels for section/container backgrounds (Tailwind 100 shades) */
export const CATEGORY_SECTION_PASTELS = {
  "Collaboration Skills": "#DBEAFE", // blue-100
  "Technical Expertise": "#D1FAE5",  // green-100
  "Creative Thinking": "#EDE9FE",    // violet-100
  "Leadership Qualities": "#FEE2E2", // red-100
  "Personal Attributes": "#FEF3C7",  // amber-100
};

/** Lighter pastels for individual card backgrounds (Tailwind 50 shades) */
export const CATEGORY_CARD_PASTELS = {
  "Collaboration Skills": "#EFF6FF", // blue-50
  "Technical Expertise": "#ECFDF5",  // green-50
  "Creative Thinking": "#F5F3FF",    // violet-50
  "Leadership Qualities": "#FEF2F2", // red-50
  "Personal Attributes": "#FFFBEB",  // amber-50
};

/** Fallback color for unknown categories */
export const DEFAULT_COLOR = "#6B7280";

/** Fallback pastel for section backgrounds */
export const DEFAULT_SECTION_PASTEL = "#F3F4F6"; // gray-100

/** Fallback pastel for card backgrounds */
export const DEFAULT_CARD_PASTEL = "#F9FAFB"; // gray-50

/** Display order for badge categories */
export const CATEGORY_ORDER = [
  "Collaboration Skills",
  "Technical Expertise",
  "Creative Thinking",
  "Leadership Qualities",
  "Personal Attributes",
  "Other",
];

// ═══════════════════════════════════════════════════════════
// FOCUS AREA / TAG COLORS
// ═══════════════════════════════════════════════════════════

/** Primary green for credited focus areas */
export const FOCUS_GREEN = "#009213";

/** Darker green for uncredited focus areas and text */
export const FOCUS_GREEN_DARK = "#036b0c";

/** Light green background for tag section containers */
export const TAG_SECTION_BG = "#F0FDF4"; // green-50

// ═══════════════════════════════════════════════════════════
// SUPERCATEGORY ORDER
// ═══════════════════════════════════════════════════════════

/** Display order for supercategory groups */
export const SUPERCATEGORY_ORDER = [
  "Technology & Development",
  "Business & Entrepreneurship",
  "Creative Arts & Design",
  "Learning, Knowledge & Personal Growth",
  "Social, Community & Volunteering",
  "Sports & Fitness",
  "Outdoor & Adventure",
  "Wellness & Lifestyle",
  "Languages",
  "Hobbies & Crafts",
  "Leisure",
  "Pets",
  "Travels",
];

// ═══════════════════════════════════════════════════════════
// SHARED UI CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Height of badge/tag pill rows (used for icon alignment) */
export const PILL_ROW_HEIGHT = 26;