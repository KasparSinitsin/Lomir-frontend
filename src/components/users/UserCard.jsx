import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { Tag, MapPin, MessageCircle } from 'lucide-react';
import UserDetailsModal from './UserDetailsModal'; 

const UserCard = ({ user, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create a display name with fallbacks
  const displayName = () => {
    // Check for both snake_case and camelCase property names
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else if (user.username) {
      return user.username;
    } else {
      return "User";
    }
  };
  
  // Prepare the image prop - either URL or initial
  const userImage = user.avatar_url || user.avatarUrl || 
                    ((user.first_name || user.firstName)?.charAt(0) || 
                     user.username?.charAt(0) || '?');
  
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
  
  // For debugging
  console.log('User card rendering with data:', user);
  
  return (
    <>
      <Card 
        title={displayName()}
        subtitle={user.username ? `@${user.username}` : ''}
        hoverable
        image={userImage}
        imageAlt={`${user.username || 'User'}'s profile`}
        imageSize="medium"
      >
        {(user.bio || user.biography) && (
          <p className="text-base-content/80 mb-4">{user.bio || user.biography}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {user.tags && (
            <div className="flex items-center text-sm text-base-content/70">
              <Tag size={16} className="mr-1" />
              <span>{user.tags}</span>
            </div>
          )}
          
          {(user.postal_code || user.postalCode) && (
            <div className="flex items-center text-sm text-base-content/70">
              <MapPin size={16} className="mr-1" />
              <span>{user.postal_code || user.postalCode}</span>
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