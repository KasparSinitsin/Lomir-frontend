/**
 * Display labels for badge taxonomy values.
 *
 * The values themselves are DATA: `badge.category` comes from the database and
 * is used as a grouping key, so it must never be translated in place. These
 * helpers translate the *display* only and leave the stored value untouched.
 *
 * Keys are written out literally rather than composed (`t("common:badges.category." +
 * slug)`), because `npm run i18n:check` can only verify keys it can read.
 * Same shape as `roleLabel` in `Settings.jsx`.
 *
 * Called from components, so `t` is passed in rather than reaching for the
 * global i18n instance.
 */

/** The closed set of categories, mirroring CATEGORY_COLORS in badgeConstants. */
export const getCategoryLabel = (category, t) => {
  if (category === "Collaboration Skills") return t("common:badges.category.collaboration");
  if (category === "Technical Expertise") return t("common:badges.category.technical");
  if (category === "Creative Thinking") return t("common:badges.category.creative");
  if (category === "Leadership Qualities") return t("common:badges.category.leadership");
  if (category === "Personal Attributes") return t("common:badges.category.personal");
  if (category === "Other") return t("common:badges.category.other");
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
    name: (t) => t("common:badges.names.teamPlayer"),
    description: (t) => t("common:badges.descriptions.teamPlayer"),
  },
  "Mediator": {
    name: (t) => t("common:badges.names.mediator"),
    description: (t) => t("common:badges.descriptions.mediator"),
  },
  "Communicator": {
    name: (t) => t("common:badges.names.communicator"),
    description: (t) => t("common:badges.descriptions.communicator"),
  },
  "Motivator": {
    name: (t) => t("common:badges.names.motivator"),
    description: (t) => t("common:badges.descriptions.motivator"),
  },
  "Organizer": {
    name: (t) => t("common:badges.names.organizer"),
    description: (t) => t("common:badges.descriptions.organizer"),
  },
  "Reliable": {
    name: (t) => t("common:badges.names.reliable"),
    description: (t) => t("common:badges.descriptions.reliable"),
  },
  "Coder": {
    name: (t) => t("common:badges.names.coder"),
    description: (t) => t("common:badges.descriptions.coder"),
  },
  "Designer": {
    name: (t) => t("common:badges.names.designer"),
    description: (t) => t("common:badges.descriptions.designer"),
  },
  "Data Whiz": {
    name: (t) => t("common:badges.names.dataWhiz"),
    description: (t) => t("common:badges.descriptions.dataWhiz"),
  },
  "Tech Support": {
    name: (t) => t("common:badges.names.techSupport"),
    description: (t) => t("common:badges.descriptions.techSupport"),
  },
  "Systems Thinker": {
    name: (t) => t("common:badges.names.systemsThinker"),
    description: (t) => t("common:badges.descriptions.systemsThinker"),
  },
  "Documentation Master": {
    name: (t) => t("common:badges.names.documentationMaster"),
    description: (t) => t("common:badges.descriptions.documentationMaster"),
  },
  "Innovator": {
    name: (t) => t("common:badges.names.innovator"),
    description: (t) => t("common:badges.descriptions.innovator"),
  },
  "Problem Solver": {
    name: (t) => t("common:badges.names.problemSolver"),
    description: (t) => t("common:badges.descriptions.problemSolver"),
  },
  "Visionary": {
    name: (t) => t("common:badges.names.visionary"),
    description: (t) => t("common:badges.descriptions.visionary"),
  },
  "Storyteller": {
    name: (t) => t("common:badges.names.storyteller"),
    description: (t) => t("common:badges.descriptions.storyteller"),
  },
  "Artisan": {
    name: (t) => t("common:badges.names.artisan"),
    description: (t) => t("common:badges.descriptions.artisan"),
  },
  "Outside-the-Box": {
    name: (t) => t("common:badges.names.outsideTheBox"),
    description: (t) => t("common:badges.descriptions.outsideTheBox"),
  },
  "Decision Maker": {
    name: (t) => t("common:badges.names.decisionMaker"),
    description: (t) => t("common:badges.descriptions.decisionMaker"),
  },
  "Mentor": {
    name: (t) => t("common:badges.names.mentor"),
    description: (t) => t("common:badges.descriptions.mentor"),
  },
  "Initiative Taker": {
    name: (t) => t("common:badges.names.initiativeTaker"),
    description: (t) => t("common:badges.descriptions.initiativeTaker"),
  },
  "Delegator": {
    name: (t) => t("common:badges.names.delegator"),
    description: (t) => t("common:badges.descriptions.delegator"),
  },
  "Strategic Planner": {
    name: (t) => t("common:badges.names.strategicPlanner"),
    description: (t) => t("common:badges.descriptions.strategicPlanner"),
  },
  "Feedback Provider": {
    name: (t) => t("common:badges.names.feedbackProvider"),
    description: (t) => t("common:badges.descriptions.feedbackProvider"),
  },
  "Quick Learner": {
    name: (t) => t("common:badges.names.quickLearner"),
    description: (t) => t("common:badges.descriptions.quickLearner"),
  },
  "Empathetic": {
    name: (t) => t("common:badges.names.empathetic"),
    description: (t) => t("common:badges.descriptions.empathetic"),
  },
  "Persistent": {
    name: (t) => t("common:badges.names.persistent"),
    description: (t) => t("common:badges.descriptions.persistent"),
  },
  "Detail-Oriented": {
    name: (t) => t("common:badges.names.detailOriented"),
    description: (t) => t("common:badges.descriptions.detailOriented"),
  },
  "Adaptable": {
    name: (t) => t("common:badges.names.adaptable"),
    description: (t) => t("common:badges.descriptions.adaptable"),
  },
  "Knowledge Sharer": {
    name: (t) => t("common:badges.names.knowledgeSharer"),
    description: (t) => t("common:badges.descriptions.knowledgeSharer"),
  },
};

/**
 * Display name for a badge; unknown names fall back to the stored value.
 *
 * ⚠️ Keys carry the explicit `common:` prefix. This module is called from
 * components bound to a page namespace (`TeamCard` uses
 * `useTranslation("teams")`), where an unprefixed key would resolve against
 * THAT namespace and render as the raw key. `i18n:check` cannot see this: it
 * assumes `common` for a plain module, so the keys look resolvable while the
 * runtime returns "badges.names.teamPlayer". Found in the browser, 2026-09-09.
 */
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
