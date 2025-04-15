import React from 'react';
import TeamDetailsModal from '../components/teams/TeamDetailsModal';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';

const TeamDetails = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/teams/my-teams');
  };

  return (
    <PageContainer>
      <TeamDetailsModal 
        isOpen={true} 
        onClose={handleClose}
      />
    </PageContainer>
  );
};

export default TeamDetails;