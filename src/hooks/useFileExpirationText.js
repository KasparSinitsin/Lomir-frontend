import { useTranslation } from "react-i18next";

/**
 * Turns the status `getFileExpirationStatus()` returns into a sentence.
 *
 * The helper is pure and cannot translate; this is the consumer side of that
 * split, in one place because six render sites across three components need
 * the same sentence and three copies would drift.
 *
 * ⚠️ The keys are literals in a `switch`, not `t(`fileExpiry.${status}`)`.
 * A template key is invisible to `npm run i18n:check`: it reports the call as
 * unverifiable and every key it could reach as unused, so a typo or a dropped
 * German string would pass. Same reasoning as the resolvers in `Contact.jsx`.
 *
 * ⚠️ `mediaType` is passed as `type` because German needs it: „Das Bild läuft
 * ab" against „Die Datei läuft ab". The message picks the article with ICU
 * `select`; English ignores it.
 */
export const useFileExpirationText = () => {
  const { t } = useTranslation();

  return ({ status, daysLeft, mediaType } = {}) => {
    switch (status) {
      case "expired":
        return t("fileExpiry.expired");
      case "expiring-soon":
        return t("fileExpiry.expiringSoon", {
          type: mediaType,
          days: daysLeft,
        });
      case "active":
        return t("fileExpiry.active", { type: mediaType, days: daysLeft });
      default:
        return "";
    }
  };
};
