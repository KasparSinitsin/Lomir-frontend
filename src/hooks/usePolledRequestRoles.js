import { useEffect, useMemo, useState } from "react";
import { vacantRoleService } from "../services/vacantRoleService";
import { getRequestRoleId } from "../utils/teamRequestUtils";

const unwrapRolePayload = (value) => {
  const payload = value?.data ?? value;

  return payload?.success !== undefined
    ? payload?.data ?? null
    : payload?.data?.data ?? payload?.data ?? payload;
};

const usePolledRequestRoles = (
  requests,
  {
    isOpen,
    teamId,
    intervalMs = 20_000,
  } = {},
) => {
  const [roleMap, setRoleMap] = useState({});

  const roleIds = useMemo(
    () => [
      ...new Set(
        (requests ?? [])
          .map(getRequestRoleId)
          .filter(Boolean)
          .map(String),
      ),
    ],
    [requests],
  );

  useEffect(() => {
    if (!isOpen || !teamId || roleIds.length === 0) return;

    let isCancelled = false;

    const pollRoles = async () => {
      try {
        const results = await Promise.allSettled(
          roleIds.map((id) => vacantRoleService.getVacantRoleById(teamId, id)),
        );
        if (isCancelled) return;

        const nextMap = {};
        results.forEach((result, i) => {
          if (result.status === "fulfilled") {
            const roleData = unwrapRolePayload(result.value);
            if (roleData) nextMap[roleIds[i]] = roleData;
          }
        });
        setRoleMap((prev) => ({ ...prev, ...nextMap }));
      } catch {
        // silent - keep showing last known role state
      }
    };

    pollRoles();
    const intervalId = setInterval(pollRoles, intervalMs);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [intervalMs, isOpen, roleIds, teamId]);

  useEffect(() => {
    if (isOpen && teamId && roleIds.length > 0) return;
    setRoleMap({});
  }, [isOpen, roleIds.length, teamId]);

  return roleMap;
};

export default usePolledRequestRoles;
