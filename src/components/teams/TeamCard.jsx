import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Users, MapPin } from 'lucide-react';
import TeamDetailsModal from './TeamDetailsModal';

const TeamCard = ({ team, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openTeamDetails = () => {
    setIsModalOpen(true);
  };
  
  const closeTeamDetails = () => {
    setIsModalOpen(false);
  };
  
  const handleTeamUpdate = (updatedTeam) => {
    if (onUpdate) {
      onUpdate(updatedTeam);
    }
  };
  
  return (
    <>
      <Card 
        title={team.name}
        subtitle={`${team.current_members_count} members`}
        hoverable
      >
        <p className="text-base-content/80 mb-4">{team.description}</p>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center text-sm text-base-content/70">
            <Users size={16} className="mr-1" />
            <span>{team.is_public ? 'Public' : 'Private'}</span>
          </div>
          
          {team.postal_code && (
            <div className="flex items-center text-sm text-base-content/70">
              <MapPin size={16} className="mr-1" />
              <span>{team.postal_code}</span>
            </div>
          )}
          
          {team.user_team_role && (
            <span className="badge badge-primary badge-outline">
              {team.user_team_role}
            </span>
          )}
        </div>
        
        <div className="mt-auto">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={openTeamDetails}
            className="w-full"
          >
            View Details
          </Button>
        </div>
      </Card>
      
      <TeamDetailsModal 
        isOpen={isModalOpen}
        teamId={team.id}
        onClose={closeTeamDetails}
        onUpdate={handleTeamUpdate}
      />
    </>
  );
};

export default TeamCard;