// One description of a chat event, shared by the four paths that render it:
// the transcript banner (messageEventRenderers.jsx), the short preview
// (eventPreview.js — conversation list, reply bar, toast), the quoted reply
// (messageDisplayHelpers.js) and the search index (chatSearch.js).
//
// Pure: no i18n, no JSX, no React. It answers the two questions every path
// asked for itself, and answered differently:
//
//   1. "is this me?"  — was `getActorLabel(...) === "You"`, a string compared
//      at twelve sites. Now `person.isViewer`.
//   2. "do we know who?" — was `name.trim().toLowerCase() !== "someone"`, a
//      guard that existed at eight sites and was missing at two. Now
//      `person.isKnown`, and the placeholder never reaches here because
//      `parseSystemMessage` nulls it (see PERSON_NAME_PLACEHOLDERS).
//
// The sentences themselves stay with their renderers for now; the per-family
// PRs replace them with one translated key each. See
// `lomir-docs-internal/PROPOSAL-event-sentences.md`.

import { parseSystemMessage } from "./messageSystemParser";
import { getDisplayName } from "./userHelpers";
import { DELETED_USER_DISPLAY_NAME } from "./deletedUser";

/**
 * Every participant slot in the parser's output is a `<role>Name` / `<role>Id`
 * pair — `applicantName`/`applicantId`, `filledByName`/`filledById`, … — so
 * the mapping is derived rather than listed. A new event type gets its people
 * for free; a renamed field shows up as a missing person, not a silent "".
 */
const ENTITY_KEYS = new Set(["teamName", "roleName", "currentRoleName"]);

const EMPTY_PERSON = Object.freeze({
  id: null,
  name: null,
  isViewer: false,
  isDeleted: false,
  isKnown: false,
});

const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);

/**
 * ⚠️ The name comparison is the fallback for legacy messages that carry a name
 * but no id (the 👋 / 🎯 / prose formats the backend still writes). It is kept
 * from `eventPreview.getActorLabel`, where it was the only way "You" could be
 * decided for those. Id first, always.
 */
// ⚠️ Real display names carry doubled spaces ("Anna  Kowalski" in the team
// chat of 2 April 2026), so the comparison collapses whitespace. Without it a
// reader fails to recognise themselves in exactly the id-less formats that
// depend on this fallback.
const normalizeNameForMatch = (value) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Exported because the transcript's mention helpers need the identical rule:
 * six stored formats carry names but no ids at all (the 👋 / 🎯 / prose
 * messages, OWNERSHIP_TEAM, the legacy leave and reopen lines). An id-only
 * check silently fails on every one of them.
 */
export const matchesViewer = (id, name, viewer) =>
  isViewerPerson(id, name, viewer, viewer ? getDisplayName(viewer) : null);

/**
 * ⚠️ `getDisplayName` returns the literal "Unknown" for a user with no name
 * and no username, and first/last name are not validated at registration, so
 * that reader really exists. It must not be treated as a name to match on —
 * two nameless people would otherwise recognise each other as "you".
 */
const hasRealName = (value) =>
  Boolean(value) && normalizeNameForMatch(value) !== "unknown";

const isViewerPerson = (id, name, viewer, viewerName) => {
  if (viewer?.id != null && id != null) return sameId(id, viewer.id);
  if (id != null) return false;
  if (!hasRealName(name) || !hasRealName(viewerName)) return false;
  return normalizeNameForMatch(name) === normalizeNameForMatch(viewerName);
};

const buildPerson = (id, rawName, viewer, viewerName) => {
  const name = typeof rawName === "string" ? rawName.trim() || null : null;
  const isDeleted = name === DELETED_USER_DISPLAY_NAME;
  const isViewer = isViewerPerson(id, name, viewer, viewerName);

  return {
    id: id ?? null,
    // A deleted account has no name to show — the label belongs to the
    // sentence, not to the data. Callers that still print the English
    // placeholder read `isDeleted`.
    name: isDeleted ? null : name,
    isViewer,
    isDeleted,
    isKnown: isViewer || Boolean(isDeleted ? null : name),
  };
};

const buildEntity = (id, rawName) => {
  const name = typeof rawName === "string" ? rawName.trim() || null : null;
  return { id: id ?? null, name, isKnown: Boolean(name) };
};

/**
 * @param {object|string|null} source  a parsed event, or the raw stored content
 * @param {object|null} viewer         the current user (`user` from AuthContext)
 * @returns {object|null} descriptor, or null when the content is not an event
 */
export const describeEvent = (source, viewer = null) => {
  const parsed =
    typeof source === "string" || source == null
      ? parseSystemMessage(source)
      : source;

  if (!parsed?.type) return null;

  const viewerName = viewer ? getDisplayName(viewer) : null;
  const people = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (!key.endsWith("Name") || ENTITY_KEYS.has(key)) continue;
    const slot = key.slice(0, -"Name".length);
    people[slot] = buildPerson(parsed[`${slot}Id`] ?? null, value, viewer, viewerName);
  }

  return {
    type: parsed.type,
    people,
    team: buildEntity(parsed.teamId, parsed.teamName),
    role: buildEntity(parsed.roleId, parsed.roleName),
    currentRole: buildEntity(parsed.currentRoleId, parsed.currentRoleName),
    // Flags and free text the sentences branch on. Kept verbatim; they are
    // data, not prose.
    hasPersonalMessage: Boolean(parsed.hasPersonalMessage),
    personalMessage: parsed.personalMessage ?? null,
    fillRole: Boolean(parsed.fillRole),
    oldRole: parsed.oldRole ?? null,
    newRole: parsed.newRole ?? null,
    parsed,
  };
};

/** A slot that the event does not have at all, so callers can read it safely. */
export const personOf = (descriptor, slot) =>
  descriptor?.people?.[slot] ?? EMPTY_PERSON;
