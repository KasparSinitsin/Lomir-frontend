// The translated sentences of the chat events — one key per sentence, shared
// by all four paths that render an event (see describeEvent.js for the list).
//
// Pure: it takes `t` as an argument and touches no React. A sentence comes
// back as `{ text, slots }`, where `text` is the resolved message with EMPTY
// slot tags left in it — "<actor/> hat die Rolle <role/> geschlossen." — and
// `slots` maps each tag to the descriptor part it stands for:
//
//   - the plain-text paths (short preview, quoted reply, search index) call
//     `eventSentenceText`, which puts the names in;
//   - the transcript calls `splitEventSentence` and puts mention components in.
//
// ⚠️ Why names never go into `t()` as values, and why this is not <Trans>:
// a display name is user input. Interpolated as a value it lands inside the
// string that <Trans> then parses as markup, so a name like "<user>x" swallows
// the rest of the sentence and "<3 Anna" renders empty (measured 2026-09-16,
// react-i18next 17.0.13). Here the name is substituted in one pass AFTER the
// message is resolved, so it is never parsed by ICU or by any tag parser.
//
// ⚠️ Keys are literal `t("…")` calls in a switch, never built from the event
// type: `npm run i18n:check` only sees literals.
//
// Every perspective select takes the same four values:
//   you      the reader is this person
//   named    someone else, with a name to show
//   deleted  a deleted account — always „ehemaliger Lomir-Nutzer" / "Former
//            Lomir User", written out per sentence because German declines it
//            (Julia, 2026-09-16; replaces the deleted-user half of D4)
//   other    nobody known — the clause is dropped, never replaced by a name

/** The event types whose sentences come from here. The other families still
 * render their English inline until their own PRs. */
export const TRANSLATED_EVENT_TYPES = new Set([
  "role_created",
  "role_updated",
  "role_closed",
  "role_deleted",
  "role_reopened",
  "role_reopened_admin",
  "role_filled",
  "role_application_approved",
  "role_application_filled",
  "role_application_deferred_invite",
  "role_invitation_filled",
  "role_invitation_accepted",
  "role_invitation_assigned_legacy",
  "team_join",
  "team_leave",
  "user_left_lomir",
  "member_removed",
  "member_removed_public",
  "role_changed",
  "ownership_transferred",
  "ownership_team",
  "team_deleted",
]);

// "Vacant Role" is a real, saved role name that stays English by decision
// (CreateVacantRoleModal) — the same default the renderers used before.
const DEFAULT_ROLE_NAME = "Vacant Role";

/** @returns {"you"|"named"|"deleted"|"other"} */
export const perspectiveOf = (person) => {
  if (person?.isViewer) return "you";
  if (person?.isDeleted) return "deleted";
  return person?.isKnown && person.name ? "named" : "other";
};

/** For the optional parts of a sentence: a team or role name that may be missing. */
const presenceOf = (entity) => (entity?.name ? "named" : "other");

const personSlot = (person) => ({ kind: "person", person });
const roleSlot = (entity) => ({ kind: "role", entity });
const teamSlot = (entity) => ({ kind: "team", entity });

/**
 * @param {Function} t          i18next `t`
 * @param {object} event        a describeEvent() descriptor
 * @param {"full"|"short"} form full = transcript + quoted reply; short = list, reply bar, toast
 * @param {object} [people]     overrides for the people slots (the transcript
 *                              knows the sender when the payload does not)
 * @returns {{ text: string, slots: object } | null}
 */
export const getEventSentence = (t, event, form = "full", people = {}) => {
  if (!event || !TRANSLATED_EVENT_TYPES.has(event.type)) return null;

  const short = form === "short";
  const person = (slot) =>
    people[slot] ?? event.people?.[slot] ?? { isKnown: false, isViewer: false };
  const role = roleSlot(event.role);
  const team = teamSlot(event.team);

  switch (event.type) {
    case "role_created": {
      const actor = person("creator");
      return {
        text: short
          ? t("chatEvents.roleCreated.short")
          : t("chatEvents.roleCreated.full", { actor: perspectiveOf(actor) }),
        slots: { actor: personSlot(actor), role },
      };
    }

    case "role_updated": {
      const actor = person("updatedBy");
      return {
        text: short
          ? t("chatEvents.roleUpdated.short")
          : t("chatEvents.roleUpdated.full", { actor: perspectiveOf(actor) }),
        slots: { actor: personSlot(actor), role },
      };
    }

    case "role_closed": {
      const actor = person("closedBy");
      return {
        text: short
          ? t("chatEvents.roleClosed.short")
          : t("chatEvents.roleClosed.full", { actor: perspectiveOf(actor) }),
        slots: { actor: personSlot(actor), role },
      };
    }

    case "role_deleted": {
      const actor = person("deletor");
      return {
        text: short
          ? t("chatEvents.roleDeleted.short")
          : t("chatEvents.roleDeleted.full", { actor: perspectiveOf(actor) }),
        slots: { actor: personSlot(actor), role },
      };
    }

    case "role_reopened": {
      const user = person("user");
      const values = { user: perspectiveOf(user) };
      return {
        text: short
          ? t("chatEvents.roleReopened.short", values)
          : t("chatEvents.roleReopened.full", values),
        slots: { user: personSlot(user), role },
      };
    }

    case "role_reopened_admin": {
      // The payload calls the admin who reopened it `user`.
      const actor = person("user");
      return {
        text: short
          ? t("chatEvents.roleReopenedAdmin.short")
          : t("chatEvents.roleReopenedAdmin.full", { actor: perspectiveOf(actor) }),
        slots: { actor: personSlot(actor), role },
      };
    }

    // ROLE_FILLED and ROLE_APPLICATION_FILLED say the same thing, so they
    // share one sentence — it used to exist at fourteen sites in five files.
    case "role_filled":
    case "role_application_filled": {
      const isApplication = event.type === "role_application_filled";
      const filler = person(isApplication ? "applicant" : "user");
      const approver = person(isApplication ? "approver" : "filledBy");
      return {
        text: t("chatEvents.roleFilled.full", {
          filler: perspectiveOf(filler),
          approver: perspectiveOf(approver),
        }),
        slots: { filler: personSlot(filler), approver: personSlot(approver), role },
      };
    }

    case "role_application_approved": {
      const applicant = person("applicant");
      return {
        text: t("chatEvents.roleApplicationApproved.full", {
          applicant: perspectiveOf(applicant),
        }),
        slots: { applicant: personSlot(applicant), role },
      };
    }

    case "role_application_deferred_invite": {
      const applicant = person("applicant");
      const approver = person("approver");
      const values = {
        applicant: perspectiveOf(applicant),
        approver: perspectiveOf(approver),
      };
      return {
        text: short
          ? t("chatEvents.roleApplicationDeferredInvite.short", values)
          : t("chatEvents.roleApplicationDeferredInvite.full", values),
        slots: {
          applicant: personSlot(applicant),
          approver: personSlot(approver),
          role,
          currentRole: roleSlot(event.currentRole),
        },
      };
    }

    case "role_invitation_filled": {
      const invitee = person("invitee");
      const values = { invitee: perspectiveOf(invitee) };
      return {
        text: short
          ? t("chatEvents.roleInvitationFilled.short", values)
          : t("chatEvents.roleInvitationFilled.full", values),
        slots: { invitee: personSlot(invitee), role },
      };
    }

    case "role_invitation_accepted": {
      const invitee = person("invitee");
      const inviter = person("inviter");
      const values = {
        invitee: perspectiveOf(invitee),
        inviter: perspectiveOf(inviter),
      };
      let text;
      if (event.fillRole) {
        text = short
          ? t("chatEvents.roleInvitationAccepted.fillShort", values)
          : t("chatEvents.roleInvitationAccepted.fill", values);
      } else {
        text = short
          ? t("chatEvents.roleInvitationAccepted.noFillShort", values)
          : t("chatEvents.roleInvitationAccepted.noFill", values);
      }
      return {
        text,
        slots: { invitee: personSlot(invitee), inviter: personSlot(inviter), role },
      };
    }

    case "role_invitation_assigned_legacy": {
      const invitee = person("invitee");
      const values = { invitee: perspectiveOf(invitee) };
      return {
        text: short
          ? t("chatEvents.roleInvitationAssigned.short", values)
          : t("chatEvents.roleInvitationAssigned.full", values),
        slots: { invitee: personSlot(invitee), role },
      };
    }

    // ── membership + admin ─────────────────────────────────────────────────
    case "team_join": {
      const user = person("user");
      const values = { user: perspectiveOf(user), role: presenceOf(event.role) };
      return {
        text: short
          ? t("chatEvents.teamJoin.short", values)
          : t("chatEvents.teamJoin.full", values),
        slots: { user: personSlot(user), role },
      };
    }

    case "team_leave": {
      const user = person("user");
      const values = { user: perspectiveOf(user) };
      return {
        text: short
          ? t("chatEvents.teamLeave.short", values)
          : t("chatEvents.teamLeave.full", values),
        slots: { user: personSlot(user) },
      };
    }

    case "user_left_lomir":
      return {
        text: short
          ? t("chatEvents.userLeftLomir.short")
          : t("chatEvents.userLeftLomir.full"),
        slots: {},
      };

    // The public variant names only the removed member; who removed them is
    // known to the transcript alone (the message's sender), via `people`.
    case "member_removed_public":
    case "member_removed": {
      const isPublic = event.type === "member_removed_public";
      const member = person(isPublic ? "user" : "member");
      const remover = person("remover");
      const slots = { member: personSlot(member), remover: personSlot(remover), team };

      if (short) {
        return {
          text: t("chatEvents.memberRemoved.short", {
            member: perspectiveOf(member),
            team: presenceOf(event.team),
          }),
          slots,
        };
      }
      return {
        text: isPublic
          ? t("chatEvents.memberRemovedPublic.full", {
              member: perspectiveOf(member),
              remover: remover.isViewer ? "you" : "other",
            })
          : t("chatEvents.memberRemoved.full", {
              member: perspectiveOf(member),
              remover: perspectiveOf(remover),
            }),
        slots,
      };
    }

    case "role_changed": {
      const member = person("member");
      const changer = person("changer");
      const values = {
        change: event.newRole === "admin" ? "promote" : "other",
        member: perspectiveOf(member),
        changer: perspectiveOf(changer),
      };
      return {
        text: short
          ? t("chatEvents.roleChanged.short", values)
          : t("chatEvents.roleChanged.full", values),
        slots: { member: personSlot(member), changer: personSlot(changer), team },
      };
    }

    case "ownership_transferred":
    case "ownership_team": {
      const prevOwner = person("prevOwner");
      const newOwner = person("newOwner");
      const values = {
        prevOwner: perspectiveOf(prevOwner),
        newOwner: perspectiveOf(newOwner),
      };
      const slots = { prevOwner: personSlot(prevOwner), newOwner: personSlot(newOwner), team };
      if (event.type === "ownership_team") {
        return {
          text: short
            ? t("chatEvents.ownershipTeam.short", values)
            : t("chatEvents.ownershipTeam.full", values),
          slots,
        };
      }
      return {
        text: short
          ? t("chatEvents.ownershipTransferred.short", values)
          : t("chatEvents.ownershipTransferred.full", values),
        slots,
      };
    }

    case "team_deleted": {
      const owner = person("owner");
      const values = { owner: perspectiveOf(owner) };
      return {
        text: short
          ? t("chatEvents.teamDeleted.short", values)
          : t("chatEvents.teamDeleted.full", values),
        slots: { owner: personSlot(owner), team },
      };
    }

    default:
      return null;
  }
};

// Only empty, self-closing tags are slots. Anything else — including a
// mistyped tag in a translation — stays visible as text rather than vanishing.
const SLOT_TAG = /<([A-Za-z][A-Za-z0-9]*)\s*\/>/g;

/**
 * Splits a sentence into text and slot parts, in order.
 * @returns {Array<{ text: string } | { slot: string, value: object }>}
 */
export const splitEventSentence = (sentence) => {
  const parts = [];
  if (!sentence?.text) return parts;

  let last = 0;
  for (const match of sentence.text.matchAll(SLOT_TAG)) {
    const value = sentence.slots?.[match[1]];
    if (!value) continue;
    if (match.index > last) parts.push({ text: sentence.text.slice(last, match.index) });
    parts.push({ slot: match[1], value });
    last = match.index + match[0].length;
  }
  if (last < sentence.text.length) parts.push({ text: sentence.text.slice(last) });
  return parts;
};

/** The plain-text name a slot stands for. */
export const slotText = (value) => {
  if (value.kind === "role") return value.entity?.name || DEFAULT_ROLE_NAME;
  if (value.kind === "team") return value.entity?.name || "";
  return value.person?.name || "";
};

/** A sentence as plain text, names in. */
export const eventSentenceText = (sentence) =>
  splitEventSentence(sentence)
    .map((part) => ("text" in part ? part.text : slotText(part.value)))
    .join("");

/** Shorthand for the plain-text paths: descriptor in, string (or null) out. */
export const getEventSentenceText = (t, event, form = "full") => {
  const sentence = getEventSentence(t, event, form);
  return sentence ? eventSentenceText(sentence) : null;
};
