import React, { useCallback, useEffect, useState } from "react";
import { Ban, MapPin, Users, CalendarX, FlaskConical, UserX } from "lucide-react";
import { userService } from "../../services/userService";
import { formatDisplayName } from "../../utils/nameFormatters";
import { formatListLocation } from "../../utils/locationUtils";
import { normalizeTimestampToDate } from "../../utils/dateHelpers";
import { DEMO_PROFILE_TOOLTIP, isSyntheticUser } from "../../utils/userHelpers";

const formatShortDate = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  }).format(date);
};
import UserAvatar from "./UserAvatar";
import CardMetaRow from "../common/CardMetaRow";
import CardMetaItem from "../common/CardMetaItem";
import Tooltip from "../common/Tooltip";
import ConfirmModal from "../common/ConfirmModal";
import ScreenAlert from "../common/ScreenAlert";

/**
 * BlocklistSection
 * Renders the users the current user has blocked as cards (mirrors the team
 * members section). Selecting a card opens a confirmation to unblock.
 */
const BlocklistSection = ({ userId, onChange }) => {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [unblocking, setUnblocking] = useState(false);
  const [notification, setNotification] = useState({
    type: null,
    message: null,
  });

  const loadBlocked = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await userService.getBlockedUsers(userId);
      setBlocked(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setNotification({
        type: "error",
        message: "Failed to load your blocklist. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  const handleConfirmUnblock = async () => {
    if (!selected) return;
    try {
      setUnblocking(true);
      await userService.unblockUser(userId, selected.id);
      setBlocked((prev) => prev.filter((u) => u.id !== selected.id));
      setNotification({
        type: "success",
        message: `${formatDisplayName(selected)} has been removed from your blocklist.`,
      });
      setSelected(null);
      onChange?.();
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error.response?.data?.message || "Failed to unblock this user.",
      });
    } finally {
      setUnblocking(false);
    }
  };

  return (
    <div>
      <ScreenAlert
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: null, message: null })}
      />

      {/* Section Header */}
      <div className="flex items-center mb-4">
        <Ban size={18} className="mr-2 text-primary flex-shrink-0" />
        <h3 className="label-text">
          Blocked Users
          {!loading && <span className="label-text ml-1">({blocked.length})</span>}
        </h3>
      </div>

      {loading ? (
        <p className="form-helper-text px-1">Loading your blocklist…</p>
      ) : blocked.length === 0 ? (
        <p className="form-helper-text px-1">
          You haven’t blocked anyone. Blocked users can’t message you or see your
          profile, and you won’t see theirs.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocked.map((blockedUser) => {
            const locationText = formatListLocation(blockedUser, {
              isRemote: blockedUser.isRemote || blockedUser.is_remote,
            }).short;
            const sharedTeams = Array.isArray(blockedUser.sharedTeams)
              ? blockedUser.sharedTeams
              : Array.isArray(blockedUser.shared_teams)
                ? blockedUser.shared_teams
                : [];
            const isDemo = isSyntheticUser(blockedUser);
            const blockedDate = formatShortDate(
              blockedUser.createdAt ?? blockedUser.created_at,
            );
            const hasMetaRow =
              locationText || blockedDate || isDemo || sharedTeams.length > 0;

            return (
              <button
                key={blockedUser.id}
                type="button"
                onClick={() => setSelected(blockedUser)}
                className="flex items-start text-left bg-white rounded-xl shadow p-4 gap-4 transition-all duration-200 hover:bg-gray-50 hover:shadow-md"
              >
                <UserAvatar
                  user={blockedUser}
                  sizeClass="w-14 h-14"
                  initialsClassName="text-xl"
                  showDemoOverlay={isDemo}
                  demoOverlayTextClassName="text-[8px]"
                />

                <div className="flex-1 min-w-0 pt-[1px]">
                  <h3 className="font-medium text-base truncate leading-[120%]">
                    {formatDisplayName(blockedUser)}
                  </h3>
                  {hasMetaRow && (
                    <CardMetaRow maxRows={3}>
                      {blockedDate && (
                        <Tooltip
                          content="Blocked on this date"
                          wrapperClassName="flex shrink-0 items-center gap-1 text-base-content/60"
                        >
                          <CalendarX size={10} className="shrink-0" />
                          <span className="whitespace-nowrap leading-[1.05]">
                            {blockedDate}
                          </span>
                        </Tooltip>
                      )}
                      {locationText && (
                        <CardMetaItem icon={MapPin}>{locationText}</CardMetaItem>
                      )}
                      {isDemo && (
                        <Tooltip
                          content={DEMO_PROFILE_TOOLTIP}
                          wrapperClassName="flex items-center gap-1 min-w-0 text-base-content/50"
                        >
                          <FlaskConical size={10} className="shrink-0" />
                        </Tooltip>
                      )}
                      {sharedTeams.length > 0 && (
                        <Tooltip
                          wrapperClassName="flex min-w-0 max-w-full flex-[1_1_100%] items-start gap-1 overflow-hidden text-base-content/60"
                          content={
                            <div className="text-left">
                              <div className="font-medium mb-0.5">
                                {sharedTeams.length === 1
                                  ? "1 team in common"
                                  : `${sharedTeams.length} teams in common`}
                              </div>
                              <ul className="list-disc list-inside space-y-0.5">
                                {sharedTeams.map((name) => (
                                  <li key={name}>{name}</li>
                                ))}
                              </ul>
                            </div>
                          }
                        >
                          <Users size={10} className="shrink-0 mt-[2px]" />
                          <span className="min-w-0 line-clamp-2 leading-[1.05]">
                            {sharedTeams.join(", ")}
                          </span>
                        </Tooltip>
                      )}
                    </CardMetaRow>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && blocked.length > 0 && (
        <p className="form-helper-text px-1 mt-3">
          Blocked users can’t message you or see your profile, and you won’t see
          theirs.
        </p>
      )}

      <ConfirmModal
        isOpen={Boolean(selected)}
        onClose={() => !unblocking && setSelected(null)}
        onConfirm={handleConfirmUnblock}
        title="Remove from blocklist?"
        confirmLabel="Unblock"
        loadingLabel="Unblocking…"
        confirmIcon={<UserX size={16} />}
        loading={unblocking}
      >
        {selected && (
          <p className="text-base-content/80">
            {formatDisplayName(selected)} will be able to message you and see
            your profile again, and you’ll see theirs.
          </p>
        )}
      </ConfirmModal>
    </div>
  );
};

export default BlocklistSection;
