import { useEffect, useMemo, useState } from "react";
import { vacantRoleService } from "../services/vacantRoleService";
import { getRequestRoleId } from "../utils/teamRequestUtils";

const unwrapListPayload = (value) => {
  const payload = value?.data ?? value;
  const inner = payload?.data ?? payload;
  return Array.isArray(inner) ? inner : [];
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
        const response = await vacantRoleService.getVacantRolesByIds(
          teamId,
          roleIds,
        );
        if (isCancelled) return;

        const roles = unwrapListPayload(response);
        const nextMap = {};
        roles.forEach((role) => {
          if (role?.id != null) nextMap[String(role.id)] = role;
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
