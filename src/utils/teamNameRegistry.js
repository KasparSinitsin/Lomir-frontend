/**
 * The current names of teams this session has fetched, by id.
 *
 * Event messages store the team name of the moment they were written, so
 * every surface that turns an event into text (banner, search index, snippet,
 * conversation preview) has to swap in what the team is called now. They all
 * go through `describeEvent`, which reads this registry synchronously; the
 * surfaces themselves await `resolveTeamNames` (chatEntityResolvers.js) before
 * building text that is cached, exactly as they await person names.
 *
 * ⚠️ Deliberately import-free: `describeEvent` is also run by the Node checks
 * in lomir-docs-internal, which cannot load the API client.
 */
const currentTeamNames = new Map();

export const rememberTeamName = (teamId, name) => {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (teamId == null || !trimmed) return;
  currentTeamNames.set(String(teamId), trimmed);
};

export const getCurrentTeamName = (teamId) =>
  teamId == null ? null : currentTeamNames.get(String(teamId)) ?? null;
