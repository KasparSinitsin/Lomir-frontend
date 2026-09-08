/**
 * Display labels for badge taxonomy values.
 *
 * The values themselves are DATA: `badge.category` comes from the database and
 * is used as a grouping key, so it must never be translated in place. These
 * helpers translate the *display* only and leave the stored value untouched.
 *
 * Keys are written out literally rather than composed (`t("badges.category." +
 * slug)`), because `npm run i18n:check` can only verify keys it can read.
 * Same shape as `roleLabel` in `Settings.jsx`.
 *
 * Called from components, so `t` is passed in rather than reaching for the
 * global i18n instance.
 */

/** The closed set of categories, mirroring CATEGORY_COLORS in badgeConstants. */
export const getCategoryLabel = (category, t) => {
  if (category === "Collaboration Skills") return t("badges.category.collaboration");
  if (category === "Technical Expertise") return t("badges.category.technical");
  if (category === "Creative Thinking") return t("badges.category.creative");
  if (category === "Leadership Qualities") return t("badges.category.leadership");
  if (category === "Personal Attributes") return t("badges.category.personal");
  if (category === "Other") return t("badges.category.other");
  // An unknown category from the database renders as stored, not as a raw key.
  return category;
};
