import { useCallback, useEffect, useState } from "react";
import { teamService } from "../services/teamService";

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
  const [teamNotificationMetrics, setTeamNotificationMetrics] = useState({});

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

  useEffect(() => {
    if (!["newest", "requests"].includes(sortBy) || teams.length === 0) {
      return;
    }

    let isCancelled = false;

    const fetchTeamNotificationTimestamps = async () => {
      const entries = await Promise.all(
        teams.filter(Boolean).map(async (team) => {
          if (!team?.id) return null;

          const [applicationsResponse, invitationsResponse] = await Promise.all(
            [
              teamService
                .getTeamApplications(team.id, { skipAuthRedirect: true })
                .catch(() => ({ data: [] })),
              teamService
                .getTeamSentInvitations(team.id, { skipAuthRedirect: true })
                .catch(() => ({ data: [] })),
            ],
          );

          const applications = applicationsResponse?.data || [];
          const invitations = invitationsResponse?.data || [];

          const latestApplicationTimestamp = applications.reduce(
            (max, application) => Math.max(max, getRequestTimestamp(application)),
            0,
          );
          const latestInvitationTimestamp = invitations.reduce(
            (max, invitation) => Math.max(max, getRequestTimestamp(invitation)),
            0,
          );
          const totalRequestCount = applications.length + invitations.length;

          return [
            team.id,
            {
              latestTimestamp:
                Math.max(
                  latestApplicationTimestamp,
                  latestInvitationTimestamp,
                ) || null,
              totalRequestCount,
            },
          ];
        }),
      );

      if (isCancelled) return;

      setTeamNotificationMetrics((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.filter(Boolean)),
      }));
    };

    fetchTeamNotificationTimestamps();

    return () => {
      isCancelled = true;
    };
  }, [sortBy, teams]);

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
