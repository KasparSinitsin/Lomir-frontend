import VacantRoleCard from "./VacantRoleCard";

const getMatchScore = (...sources) => {
  for (const source of sources) {
    const score = source?.matchScore ?? source?.match_score ?? null;
    if (score !== null && score !== undefined) return score;
  }

  return null;
};

const getMatchDetails = (...sources) => {
  for (const source of sources) {
    const details = source?.matchDetails ?? source?.match_details ?? null;
    if (details !== null && details !== undefined) return details;
  }

  return null;
};

const RequestRoleCard = ({
  role,
  teamId,
  teamName,
  primaryMatch = null,
  secondaryMatch = null,
  viewAsUserId = null,
  viewAsUser = null,
  ...props
}) => (
  <VacantRoleCard
    role={role}
    team={{ id: teamId, name: teamName }}
    matchScore={getMatchScore(primaryMatch, secondaryMatch, role)}
    matchDetails={getMatchDetails(primaryMatch, secondaryMatch, role)}
    canManage={false}
    isTeamMember={true}
    viewAsUserId={viewAsUserId}
    viewAsUser={viewAsUser}
    {...props}
  />
);

export default RequestRoleCard;
