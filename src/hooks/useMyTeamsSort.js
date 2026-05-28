import { useCallback, useMemo, useState } from "react";

const parseSortableTimestamp = (value) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const getFirstValidTimestamp = (sources, keys) => {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const timestamp = parseSortableTimestamp(source[key]);
      if (timestamp !== null) return timestamp;
    }
  }
  return 0;
};

const getComparableName = (item) => {
  const isRolePendingItem =
    item?.role &&
    (item?.isInternal ??
      item?.is_internal ??
      item?.isInternalRoleApplication ??
      item?.is_internal_role_application);
  const displayTarget = isRolePendingItem
    ? {
        ...item.role,
        name:
          item.role?.roleName ??
          item.role?.role_name ??
          item.role?.name ??
          item?.team?.name ??
          "",
      }
    : (item?.team || item);

  return (displayTarget?.name || "").trim().toLowerCase();
};

const getActivityTimestamp = (item) => {
  const isRolePendingItem =
    item?.role &&
    (item?.isInternal ??
      item?.is_internal ??
      item?.isInternalRoleApplication ??
      item?.is_internal_role_application);
  const team = isRolePendingItem
    ? {
        ...item.role,
        name:
          item.role?.roleName ??
          item.role?.role_name ??
          item.role?.name ??
          item?.team?.name ??
          "",
      }
    : (item?.team || item);

  return getFirstValidTimestamp(
    [team, item?.team, item],
    [
      "last_active_at",
      "lastActiveAt",
      "last_active",
      "lastActive",
      "updated_at",
      "updatedAt",
      "created_at",
      "createdAt",
    ],
  );
};

const getRequestTimestamp = (item) => {
  return getFirstValidTimestamp(
    [item],
    [
      "received_at",
      "receivedAt",
      "sent_at",
      "sentAt",
      "applied_at",
      "appliedAt",
      "created_at",
      "createdAt",
      "date",
    ],
  );
};

const useMyTeamsSort = ({ teams = [], onSortChange } = {}) => {
  const [sortBy, setSortBy] = useState("newest");
  const [sortDir, setSortDir] = useState("desc");

  // Derived from the team list. The backend's getUserTeams now returns the
  // pending application/invitation counts and the latest request timestamp
  // per team, so we no longer need per-team fetches here.
  const teamNotificationMetrics = useMemo(() => {
    const result = {};
    for (const team of teams || []) {
      if (!team?.id) continue;
      const applicationsCount = Number(
        team.pendingApplicationsCount ??
          team.pending_applications_count ??
          0,
      );
      const invitationsCount = Number(
        team.pendingSentInvitationsCount ??
          team.pending_sent_invitations_count ??
          0,
      );
      const latestTimestamp = parseSortableTimestamp(
        team.latestRequestTimestamp ?? team.latest_request_timestamp,
      );

      result[team.id] = {
        latestTimestamp,
        totalRequestCount:
          (Number.isFinite(applicationsCount) ? applicationsCount : 0) +
          (Number.isFinite(invitationsCount) ? invitationsCount : 0),
      };
    }
    return result;
  }, [teams]);

  const handleSortChange = useCallback(
    (nextSortBy) => {
      onSortChange?.();

      if (nextSortBy === sortBy) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        return;
      }

      setSortBy(nextSortBy);

      switch (nextSortBy) {
        case "recent":
        case "newest":
        case "requests":
          setSortDir("desc");
          break;
        case "name":
        default:
          setSortDir("asc");
          break;
      }
    },
    [onSortChange, sortBy],
  );

  const sortPendingItems = useCallback(
    (items = []) => {
      if (sortBy === "requests") {
        return [...items];
      }

      return [...items].sort((a, b) => {
        if (sortBy === "name") {
          const direction = sortDir === "desc" ? -1 : 1;
          return (
            getComparableName(a).localeCompare(getComparableName(b)) * direction
          );
        }

        if (sortBy === "recent") {
          const diff =
            sortDir === "desc"
              ? getActivityTimestamp(b) - getActivityTimestamp(a)
              : getActivityTimestamp(a) - getActivityTimestamp(b);
          if (diff !== 0) return diff;
        } else if (sortBy === "newest") {
          const diff =
            sortDir === "desc"
              ? getRequestTimestamp(b) - getRequestTimestamp(a)
              : getRequestTimestamp(a) - getRequestTimestamp(b);
          if (diff !== 0) return diff;
        }

        return getComparableName(a).localeCompare(getComparableName(b));
      });
    },
    [sortBy, sortDir],
  );

  const sortMemberTeams = useCallback(
    (items = []) => {
      return [...items].sort((a, b) => {
        if (sortBy === "name") {
          const direction = sortDir === "desc" ? -1 : 1;
          return (
            getComparableName(a).localeCompare(getComparableName(b)) * direction
          );
        }

        if (sortBy === "recent") {
          const diff =
            sortDir === "desc"
              ? getActivityTimestamp(b) - getActivityTimestamp(a)
              : getActivityTimestamp(a) - getActivityTimestamp(b);
          if (diff !== 0) return diff;
        } else if (sortBy === "newest") {
          const timestampA =
            teamNotificationMetrics[a.id]?.latestTimestamp ?? null;
          const timestampB =
            teamNotificationMetrics[b.id]?.latestTimestamp ?? null;

          if (timestampA !== null || timestampB !== null) {
            if (timestampA === null) return 1;
            if (timestampB === null) return -1;

            const diff =
              sortDir === "desc"
                ? timestampB - timestampA
                : timestampA - timestampB;
            if (diff !== 0) return diff;
          }
        } else if (sortBy === "requests") {
          const countA = teamNotificationMetrics[a.id]?.totalRequestCount ?? 0;
          const countB = teamNotificationMetrics[b.id]?.totalRequestCount ?? 0;
          const diff = sortDir === "desc" ? countB - countA : countA - countB;
          if (diff !== 0) return diff;
        }

        return getComparableName(a).localeCompare(getComparableName(b));
      });
    },
    [sortBy, sortDir, teamNotificationMetrics],
  );

  return {
    sortBy,
    sortDir,
    teamNotificationMetrics,
    handleSortChange,
    sortPendingItems,
    sortMemberTeams,
  };
};

export default useMyTeamsSort;
