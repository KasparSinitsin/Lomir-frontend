import { useEffect, useState } from "react";
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

    const fetchRole = async () => {
      try {
        const [detailsRes, rolesRes] = await Promise.allSettled([
          vacantRoleService.getVacantRoleById(teamId, roleId),
          vacantRoleService.getVacantRoles(teamId, "all"),
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
        const resolvedRoleMatch =
          matchedRoleData.matchScore != null
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

    fetchRole();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, roleId, teamId]);

  return {
    hydratedRole,
    roleMatchScore,
    roleMatchDetails,
  };
};

export default useHydratedRole;
