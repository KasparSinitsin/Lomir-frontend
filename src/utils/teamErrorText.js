/**
 * Words a failure from the team endpoints (invitations, applications, vacant
 * roles) in the reader's language.
 *
 * The backend names what went wrong with a `code` — see
 * `Lomir-backend/src/config/teamErrors.js` — and only for the failures a user
 * can actually reach: races between two windows or two admins. Everything else
 * it answers is a guard the UI already prevents, in English prose.
 *
 * ⚠️ **So a response without a known code shows `fallback`, never the backend
 * `message`.** This differs on purpose from `SearchPage.getSearchErrorText`,
 * which may show `message` because every reachable search error has a code.
 * Here the uncoded ones are English sentences nobody translated.
 *
 * The code is read from `error.response.data`. A layer that re-throws must
 * keep `response` on the error it throws (`teamService` does) rather than
 * pass only the message on.
 *
 * Keys are written out literally so `npm run i18n:check` can see them.
 */
export const getTeamErrorCode = (error) => {
  const code = error?.response?.data?.code;
  return typeof code === "string" ? code : null;
};

export const getTeamErrorText = (error, t, fallback) => {
  const code = getTeamErrorCode(error);
  const roleName = error?.response?.data?.values?.roleName;

  switch (code) {
    case "TEAM_NOT_FOUND":
      return t("teams:teamErrors.teamNotFound");
    case "TEAM_FULL":
      return t("teams:teamErrors.teamFull");
    case "ROLE_NOT_FOUND":
      return t("teams:teamErrors.roleNotFound");
    case "ROLE_NOT_OPEN":
      return t("teams:teamErrors.roleNotOpen");
    case "ROLE_OFFER_UNAVAILABLE":
      return t("teams:teamErrors.roleOfferUnavailable");
    case "ALREADY_FILLING_ROLE":
      return roleName
        ? t("teams:teamErrors.alreadyFillingRole", { roleName })
        : t("teams:teamErrors.alreadyFillingRoleUnnamed");
    case "ALREADY_MEMBER":
      return t("teams:teamErrors.alreadyMember");
    case "INVITEE_ALREADY_MEMBER":
      return t("teams:teamErrors.inviteeAlreadyMember");
    case "INVITATION_ALREADY_PENDING":
      return t("teams:teamErrors.invitationAlreadyPending");
    case "INVITATION_UNAVAILABLE":
      return t("teams:teamErrors.invitationUnavailable");
    case "ROLE_INVITATION_WITHDRAWN":
      return t("teams:teamErrors.roleInvitationWithdrawn");
    case "INVITEE_HAS_PENDING_APPLICATION":
      return t("teams:teamErrors.inviteeHasPendingApplication");
    case "APPLICATION_ALREADY_PENDING":
      return t("teams:teamErrors.applicationAlreadyPending");
    case "APPLICATION_UNAVAILABLE":
      return t("teams:teamErrors.applicationUnavailable");
    default:
      return fallback;
  }
};
