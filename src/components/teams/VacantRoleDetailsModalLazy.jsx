import { lazy, Suspense } from "react";

/**
 * Lazy boundary for VacantRoleDetailsModal.
 *
 * VacantRoleDetailsModal is a large (~3.3k line) modal. Importing it through
 * this wrapper keeps it out of the main bundle: it is dynamically imported and
 * code-split into its own chunk, fetched only when a role-details modal is
 * actually rendered. Call sites import this module instead of the modal
 * directly and use the exact same props, so no JSX changes are needed.
 */
const VacantRoleDetailsModal = lazy(() => import("./VacantRoleDetailsModal"));

const VacantRoleDetailsModalLazy = (props) => (
  <Suspense fallback={null}>
    <VacantRoleDetailsModal {...props} />
  </Suspense>
);

export default VacantRoleDetailsModalLazy;
