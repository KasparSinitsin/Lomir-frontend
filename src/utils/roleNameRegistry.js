/**
 * The current names of roles this session has fetched, by role id.
 *
 * The role twin of `teamNameRegistry.js` (item 38): event messages store the
 * role name of the moment they were written, so a renamed role kept its old
 * name in every banner, search hit and preview. `describeEvent` reads this
 * registry synchronously; the surfaces await `resolveRoleNames`
 * (chatEntityResolvers.js) before building text that is cached.
 *
 * Role ids are unique across teams, so the id alone is the key.
 *
 * ⚠️ Deliberately import-free: `describeEvent` is also run by the Node checks
 * in lomir-docs-internal, which cannot load the API client.
 */
const currentRoleNames = new Map();

export const rememberRoleName = (roleId, name) => {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (roleId == null || roleId === "" || !trimmed) return;
  currentRoleNames.set(String(roleId), trimmed);
};

export const getCurrentRoleName = (roleId) =>
  roleId == null || roleId === ""
    ? null
    : currentRoleNames.get(String(roleId)) ?? null;
