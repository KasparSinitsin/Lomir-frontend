import { useEffect, useState } from "react";
import { matchingService } from "../services/matchingService";
import { vacantRoleService } from "../services/vacantRoleService";

const extractRolePayload = (response) => {
  const payload = response?.data ?? response;

  if (!payload) return null;
  if (payload?.success !== undefined) return payload?.data ?? null;

  return payload?.data?.data ?? payload?.data ?? payload;
};

const extractRoleList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const extractRoleMatchData = (roleLike) => {
  const rawScore = roleLike?.matchScore ?? roleLike?.match_score ?? null;
  const numericScore = Number(rawScore);

  return {
    matchScore: Number.isFinite(numericScore) ? numericScore : null,
    matchDetails:
      roleLike?.matchDetails ??
      roleLike?.match_details ??
      roleLike?.scoreBreakdown ??
      null,
  };
};

const ROLE_STATUS_POLL_INTERVAL_MS = 20_000;

export const useHydratedRole = ({ isOpen, roleId, teamId }) => {
  const [hydratedRole, setHydratedRole] = useState(null);
  const [roleMatchScore, setRoleMatchScore] = useState(null);
  const [roleMatchDetails, setRoleMatchDetails] = useState(null);

  useEffect(() => {
    if (!isOpen || !roleId || !teamId) {
      setHydratedRole(null);
      setRoleMatchScore(null);
      setRoleMatchDetails(null);
      return;
    }

    let isCancelled = false;

    // Full fetch on open: role details + match scores
    const fetchRole = async () => {
      try {
        const [detailsRes, rolesRes, matchRes] = await Promise.allSettled([
          vacantRoleService.getVacantRoleById(teamId, roleId),
          vacantRoleService.getVacantRoles(teamId, "all"),
          matchingService.getMatchingRolesForTeam(teamId),
        ]);

        if (isCancelled) return;

        let detailRoleMatch = { matchScore: null, matchDetails: null };

        if (detailsRes.status === "fulfilled") {
          const roleData = extractRolePayload(detailsRes.value);

          if (roleData) {
            setHydratedRole(roleData);
            detailRoleMatch = extractRoleMatchData(roleData);
          }
        }

        const matchedRole =
          rolesRes.status === "fulfilled"
            ? extractRoleList(rolesRes.value).find(
                (candidate) => String(candidate?.id) === String(roleId),
              )
            : null;
        const matchedRoleData = extractRoleMatchData(matchedRole);

        // Matching endpoint provides fresh per-user match scores (most accurate)
        const matchingRole =
          matchRes.status === "fulfilled"
            ? extractRoleList(matchRes.value).find(
                (candidate) => String(candidate?.id) === String(roleId),
              )
            : null;
        const matchingRoleData = extractRoleMatchData(matchingRole);

        // Priority: matching endpoint > role list > role detail
        const resolvedRoleMatch =
          matchingRoleData.matchScore != null
            ? matchingRoleData
            : matchedRoleData.matchScore != null
              ? matchedRoleData
              : detailRoleMatch;

        setRoleMatchScore(resolvedRoleMatch.matchScore);
        setRoleMatchDetails(resolvedRoleMatch.matchDetails);
      } catch (error) {
        if (!isCancelled) {
          console.warn("Could not fetch role details:", error);
        }
      }
    };

    // Lightweight poll: only role details, to pick up status changes while modal is open
    const pollRoleStatus = async () => {
      try {
        const res = await vacantRoleService.getVacantRoleById(teamId, roleId);
        if (isCancelled) return;
        const roleData = extractRolePayload(res);
        if (roleData) setHydratedRole(roleData);
      } catch {
        // silent — modal keeps showing last known state
      }
    };

    fetchRole();
    const intervalId = setInterval(pollRoleStatus, ROLE_STATUS_POLL_INTERVAL_MS);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [isOpen, roleId, teamId]);

  return {
    hydratedRole,
    roleMatchScore,
    roleMatchDetails,
  };
};

export default useHydratedRole;
