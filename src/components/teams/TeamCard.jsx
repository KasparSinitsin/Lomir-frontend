import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Users, MapPin, Trash2 } from 'lucide-react';
import TeamDetailsModal from './TeamDetailsModal';
import { teamService } from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import Alert from '../common/Alert';

const TeamCard = ({ team, onUpdate, onDelete, isSearchResult = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const { user, isAuthenticated } = useAuth();
  
  // Check if current user is the creator of the team
  const isCreator = user && team.creator_id === user.id;
  
  // Fetch the user's role in this team on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user && team.id && !isSearchResult) {
        try {
          const response = await teamService.getUserRoleInTeam(team.id, user.id);
          setUserRole(response.data.role);
        } catch (err) {
          console.error('Error fetching user role:', err);
        }
      }
    };
    
    fetchUserRole();
  }, [user, team.id, isSearchResult]);
  
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

  const handleDeleteClick = async (e) => {
    e.stopPropagation(); // Prevent opening the details modal
    
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
  
  // Determine if the View Details button should be shown
  const showViewDetailsButton = isSearchResult
    ? isAuthenticated // On search page, show to all authenticated users
    : (isCreator || userRole === 'admin' || userRole === 'member'); // On team pages, show to members
  
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
          
          {userRole && !isSearchResult && (
            <span className="badge badge-primary badge-outline">
              {userRole}
            </span>
          )}
        </div>
        
        <div className="mt-auto flex justify-between items-center">
          {/* Show View Details button based on our condition */}
          {showViewDetailsButton && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={openTeamDetails}
              className="flex-grow"
            >
              View Details
            </Button>
          )}
          
          {isCreator && !isSearchResult && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="ml-2 hover:bg-[#C7D2FE] hover:text-[#1E40AF]"
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
        onClose={closeTeamDetails}
        onUpdate={handleTeamUpdate}
        onDelete={onDelete}
        userRole={userRole}
        isFromSearch={isSearchResult}
      />
    </>
  );
};

export default TeamCard;