import React, { createContext, useContext, useMemo, useState } from "react";
import TeamDetailsModal from "../components/teams/TeamDetailsModal";

const TeamModalContext = createContext(null);

export const useTeamModal = () => {
  const ctx = useContext(TeamModalContext);
  if (!ctx) {
    throw new Error("useTeamModal must be used within a TeamModalProvider");
  }
  return ctx;
};

export const TeamModalProvider = ({ children }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openTeamModal = (teamId, teamName) => {
    if (!teamId) return;
    setSelectedTeam({ id: teamId, name: teamName });
    setIsOpen(true);
  };

  const closeTeamModal = () => {
    setIsOpen(false);
    setSelectedTeam(null);
  };

  const value = useMemo(
    () => ({
      openTeamModal,
      closeTeamModal,
      isTeamModalOpen: isOpen,
      selectedTeam,
    }),
    [isOpen, selectedTeam],
  );

  return (
    <TeamModalContext.Provider value={value}>
      {children}

      <TeamDetailsModal
        isOpen={isOpen}
        teamId={selectedTeam?.id}
        initialTeamData={selectedTeam}
        onClose={closeTeamModal}
      />
    </TeamModalContext.Provider>
  );
};