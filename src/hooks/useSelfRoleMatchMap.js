import { useEffect, useMemo, useState } from "react";
import { matchingService } from "../services/matchingService";
import {
  getRequestRoleId,
  isRequestForUser,
} from "../utils/teamRequestUtils";

const SELF_ROLE_MATCH_FETCH_LIMIT = 1000;

const useSelfRoleMatchMap = (
  requests,
  {
    isOpen,
    teamId,
    currentUserId,
    userKey,
    warningLabel = "request",
  } = {},
) => {
  const [matchMap, setMatchMap] = useState({});

  const selfRoleIds = useMemo(
    () => [
      ...new Set(
        (requests ?? [])
          .filter((request) => isRequestForUser(request, userKey, currentUserId))
          .map(getRequestRoleId)
          .filter((roleId) => roleId != null)
          .map(String),
      ),
    ],
    [currentUserId, requests, userKey],
  );

  useEffect(() => {
    if (!isOpen || !teamId || !currentUserId || selfRoleIds.length === 0) {
      setMatchMap({});
      return;
    }

    let cancelled = false;

    const fetchSelfRoleMatches = async () => {
      try {
        const response = await matchingService.getMatchingRolesForTeam(teamId, {
          limit: SELF_ROLE_MATCH_FETCH_LIMIT,
        });

        if (cancelled) return;

        const nextMatchMap = {};

        (response?.data || []).forEach((role) => {
          const roleId = role?.id;
          if (roleId == null || !selfRoleIds.includes(String(roleId))) return;

          nextMatchMap[String(roleId)] = {
            matchScore:
              role?.matchScore ??
              role?.match_score ??
              null,
            matchDetails:
              role?.matchDetails ??
              role?.match_details ??
              null,
          };
        });

        setMatchMap(nextMatchMap);
      } catch (error) {
        if (!cancelled) {
          console.warn(`Could not fetch self-${warningLabel} role match scores:`, error);
          setMatchMap({});
        }
      }
    };

    fetchSelfRoleMatches();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, isOpen, selfRoleIds, teamId, warningLabel]);

  return matchMap;
};

export default useSelfRoleMatchMap;
