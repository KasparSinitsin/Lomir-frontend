/**
 * The name a role gets when its creator does not type one.
 *
 * ⚠️ **This is a wire value, not UI copy.** `CreateVacantRoleModal` prefills the
 * name field with it, so leaving the field untouched **saves this exact string
 * to the database as a real role name**. It stays English for the same reason a
 * user's own role name does: it is data somebody chose, not a label.
 *
 * It was `"Vacant Role"` until **2026-09-28**. Chats and notifications stored
 * before that keep the old spelling, and a user may have typed either by hand —
 * so anything reading stored text must tolerate both and rewrite neither. See
 * `utils/messageSystemParser.js` for the transcript this was verified against.
 *
 * 🔴 **The backend has its own copy in `src/config/roleDefaults.js` and the two
 * must agree**, because both write it into stored chat events and notification
 * titles. Same shape as `config/teamErrors.js` ↔ `utils/teamErrorText.js`.
 *
 * Two kinds of consumer import this, and the difference matters if it is ever
 * revisited:
 *
 * - **Wire** — `CreateVacantRoleModal` (the prefill) and
 *   `VacantRoleDetailsModal` (the `roleName` search parameter, which the
 *   backend matches on). These must stay English.
 * - **Display fallback** — the chat, notification, search and initials
 *   renderers, which show it when a role name is missing rather than saved.
 *   ⚠️ Those arguably belong on `common:roleStatus.vacantRoleFallback`, which is
 *   translated; they are English today by the decision recorded in each call
 *   site. Splitting them is a design change, not a rename.
 */
export const DEFAULT_ROLE_NAME = "Open Role";
