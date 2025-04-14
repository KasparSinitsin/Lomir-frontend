import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Tag, MapPin } from 'lucide-react';
import UserDetailsModal from './UserDetailsModal'; 

const UserCard = ({ user, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const openUserDetails = () => {
    setIsModalOpen(true);
  };
  
  const closeUserDetails = () => {
    setIsModalOpen(false);
  };
  
  const handleUserUpdate = (updatedUser) => {
    if (onUpdate) {
      onUpdate(updatedUser);
    }
  };
  
  return (
    <>
      <Card 
        title={`${user.first_name} ${user.last_name}`}
        subtitle={`@${user.username}`}
        hoverable
      >
        <p className="text-base-content/80 mb-4">{user.bio}</p>
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {user.tags && (
            <div className="flex items-center text-sm text-base-content/70">
              <Tag size={16} className="mr-1" />
              <span>{user.tags}</span>
            </div>
          )}
          
          {user.postal_code && (
            <div className="flex items-center text-sm text-base-content/70">
              <MapPin size={16} className="mr-1" />
              <span>{user.postal_code}</span>
            </div>
          )}
        </div>
        
        <div className="mt-auto">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={openUserDetails}
            className="w-full"
          >
            View Details
          </Button>
        </div>
      </Card>
      
      <UserDetailsModal 
        isOpen={isModalOpen}
        userId={user.id}
        onClose={closeUserDetails}
        onUpdate={handleUserUpdate}
        mode="profile"
      />
    </>
  );
};

export default UserCard;