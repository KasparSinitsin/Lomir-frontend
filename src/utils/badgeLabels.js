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

/**
 * The 30 seeded badges, keyed by their stored English name.
 *
 * The stored name is load-bearing DATA, not just a label: `teamMatchUtils`
 * counts shared badges by name and `isBadgeHiddenForUser` decides visibility
 * by name. So the name is never translated in place — these helpers translate
 * the display and leave `badge.name` untouched.
 *
 * Keys are written out literally because `npm run i18n:check` reads string
 * literals out of `t(...)`; a `t(someVariable)` lookup would be invisible to it.
 *
 * A badge added to the database later renders its stored English name until it
 * is listed here — that is the accepted cost of keeping the translations in the
 * frontend rather than in the table.
 */
const BADGE_LABELS = {
  "Team Player": {
    name: (t) => t("badges.names.teamPlayer"),
    description: (t) => t("badges.descriptions.teamPlayer"),
  },
  "Mediator": {
    name: (t) => t("badges.names.mediator"),
    description: (t) => t("badges.descriptions.mediator"),
  },
  "Communicator": {
    name: (t) => t("badges.names.communicator"),
    description: (t) => t("badges.descriptions.communicator"),
  },
  "Motivator": {
    name: (t) => t("badges.names.motivator"),
    description: (t) => t("badges.descriptions.motivator"),
  },
  "Organizer": {
    name: (t) => t("badges.names.organizer"),
    description: (t) => t("badges.descriptions.organizer"),
  },
  "Reliable": {
    name: (t) => t("badges.names.reliable"),
    description: (t) => t("badges.descriptions.reliable"),
  },
  "Coder": {
    name: (t) => t("badges.names.coder"),
    description: (t) => t("badges.descriptions.coder"),
  },
  "Designer": {
    name: (t) => t("badges.names.designer"),
    description: (t) => t("badges.descriptions.designer"),
  },
  "Data Whiz": {
    name: (t) => t("badges.names.dataWhiz"),
    description: (t) => t("badges.descriptions.dataWhiz"),
  },
  "Tech Support": {
    name: (t) => t("badges.names.techSupport"),
    description: (t) => t("badges.descriptions.techSupport"),
  },
  "Systems Thinker": {
    name: (t) => t("badges.names.systemsThinker"),
    description: (t) => t("badges.descriptions.systemsThinker"),
  },
  "Documentation Master": {
    name: (t) => t("badges.names.documentationMaster"),
    description: (t) => t("badges.descriptions.documentationMaster"),
  },
  "Innovator": {
    name: (t) => t("badges.names.innovator"),
    description: (t) => t("badges.descriptions.innovator"),
  },
  "Problem Solver": {
    name: (t) => t("badges.names.problemSolver"),
    description: (t) => t("badges.descriptions.problemSolver"),
  },
  "Visionary": {
    name: (t) => t("badges.names.visionary"),
    description: (t) => t("badges.descriptions.visionary"),
  },
  "Storyteller": {
    name: (t) => t("badges.names.storyteller"),
    description: (t) => t("badges.descriptions.storyteller"),
  },
  "Artisan": {
    name: (t) => t("badges.names.artisan"),
    description: (t) => t("badges.descriptions.artisan"),
  },
  "Outside-the-Box": {
    name: (t) => t("badges.names.outsideTheBox"),
    description: (t) => t("badges.descriptions.outsideTheBox"),
  },
  "Decision Maker": {
    name: (t) => t("badges.names.decisionMaker"),
    description: (t) => t("badges.descriptions.decisionMaker"),
  },
  "Mentor": {
    name: (t) => t("badges.names.mentor"),
    description: (t) => t("badges.descriptions.mentor"),
  },
  "Initiative Taker": {
    name: (t) => t("badges.names.initiativeTaker"),
    description: (t) => t("badges.descriptions.initiativeTaker"),
  },
  "Delegator": {
    name: (t) => t("badges.names.delegator"),
    description: (t) => t("badges.descriptions.delegator"),
  },
  "Strategic Planner": {
    name: (t) => t("badges.names.strategicPlanner"),
    description: (t) => t("badges.descriptions.strategicPlanner"),
  },
  "Feedback Provider": {
    name: (t) => t("badges.names.feedbackProvider"),
    description: (t) => t("badges.descriptions.feedbackProvider"),
  },
  "Quick Learner": {
    name: (t) => t("badges.names.quickLearner"),
    description: (t) => t("badges.descriptions.quickLearner"),
  },
  "Empathetic": {
    name: (t) => t("badges.names.empathetic"),
    description: (t) => t("badges.descriptions.empathetic"),
  },
  "Persistent": {
    name: (t) => t("badges.names.persistent"),
    description: (t) => t("badges.descriptions.persistent"),
  },
  "Detail-Oriented": {
    name: (t) => t("badges.names.detailOriented"),
    description: (t) => t("badges.descriptions.detailOriented"),
  },
  "Adaptable": {
    name: (t) => t("badges.names.adaptable"),
    description: (t) => t("badges.descriptions.adaptable"),
  },
  "Knowledge Sharer": {
    name: (t) => t("badges.names.knowledgeSharer"),
    description: (t) => t("badges.descriptions.knowledgeSharer"),
  },
};

/** Display name for a badge; unknown names fall back to the stored value. */
export const getBadgeName = (name, t) => {
  const entry = BADGE_LABELS[name];
  return entry ? entry.name(t) : name;
};

/**
 * Display description for a badge, resolved by its stored NAME.
 * Falls back to the stored description, so a badge missing here still shows
 * whatever the database holds.
 */
export const getBadgeDescription = (name, description, t) => {
  const entry = BADGE_LABELS[name];
  return entry ? entry.description(t) : description;
};
