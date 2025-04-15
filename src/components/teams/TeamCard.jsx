import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Users, MapPin, Trash2 } from 'lucide-react';
import TeamDetailsModal from './TeamDetailsModal';
import { teamService } from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../common/Alert';

const TeamCard = ({ team, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  const isCreator = user && team.creator_id === user.id;
  
  const openTeamDetails = () => {
    console.log('Opening team details for team:', team.id);
    setIsModalOpen(true);
  };
  
  const closeTeamDetails = () => {
    console.log('Closing team details');
    setIsModalOpen(false);
  };
  
  const handleTeamUpdate = (updatedTeam) => {
    if (onUpdate) {
      onUpdate(updatedTeam);
    }
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        await teamService.deleteTeam(team.id);
        
        if (onDelete) {
          onDelete(team.id);
        }
      } catch (err) {
        console.error('Error deleting team:', err);
        setError('Failed to delete team. Please try again.');
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  return (
    <>
      <Card 
        title={team.name}
        subtitle={`Members: ${team.current_members_count ?? 1} out of ${team.max_members ?? '∞'}`}
        hoverable
      >
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />
        )}
        
        <p className="text-base-content/80 mb-4 -mt-4">{team.description}</p>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center text-sm text-base-content/70">
            <Users size={16} className="mr-1" />
            <span>{team.is_public ? 'Public' : 'Private'}</span>
          </div>
          
          {team.user_team_role && (
            <span className="badge badge-primary badge-outline">
              {team.user_team_role}
            </span>
          )}
        </div>
        
        <div className="mt-auto flex justify-between items-center">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              openTeamDetails();
            }}
            className="flex-grow"
          >
            View Details
          </Button>
          
          {isCreator && (
            <Button 
              variant="error" 
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="ml-2"
              icon={<Trash2 size={16} />}
              aria-label="Delete team"
            >
              {isDeleting ? 'Deleting...' : ''}
            </Button>
          )}
        </div>
      </Card>
      
      <TeamDetailsModal 
  isOpen={isModalOpen}
  teamId={team.id}
  onClose={() => {
    console.log('Closing modal from TeamCard');
    setIsModalOpen(false);
  }}
  onUpdate={handleTeamUpdate}
  onDelete={onDelete}
/>
    </>
  );
};

export default TeamCard;