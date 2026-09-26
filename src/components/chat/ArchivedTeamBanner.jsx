import { Archive, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ARCHIVE_GRACE_DAYS } from "../../utils/dateHelpers";

// Farewell banner shown inside an archived team's chat during the deletion
// grace window, for remaining members. Presentational — the parent gates
// visibility and passes the remaining-time label and the leave handler.
//
// ⚠️ The countdown arrived translated long before the sentence around it did:
// `formatArchiveTimeRemaining` has always gone through `i18n.t`, so a German
// account read an English paragraph with "13 Tage" in the middle of it. A `t()`
// somewhere in the chain proves nothing about the file that renders it.
const ArchivedTeamBanner = ({ timeRemaining, onLeave }) => {
  const { t } = useTranslation();
  const remaining =
    timeRemaining ||
    t("datetime.archiveRemainingUpTo", { count: ARCHIVE_GRACE_DAYS });

  return (
    <div
      className="flex flex-col items-center gap-3 px-5 py-4 mx-4 mt-4 rounded-2xl text-center"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        color: "#dc2626",
      }}
    >
      <Archive size={18} className="shrink-0" />
      <div className="inline-flex max-w-full rounded-md bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
        <span>{t("chatPage.archivedBanner.body", { remaining })}</span>
      </div>

      <button
        onClick={onLeave}
        className="flex items-center gap-1 text-xs text-red-600 underline opacity-80 transition-opacity hover:opacity-100 hover:no-underline cursor-pointer"
      >
        <LogOut size={14} />
        {t("chatPage.archivedBanner.leaveNow")}
      </button>
    </div>
  );
};

export default ArchivedTeamBanner;
