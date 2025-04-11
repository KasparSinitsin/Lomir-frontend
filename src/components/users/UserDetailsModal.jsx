import React, { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';
import { userService } from '../../services/userService'; 
import Button from '../common/Button';
import TagSelector from '../tags/TagSelector';

const UserDetailsModal = ({ isOpen, userId, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    postalCode: '',
    selectedTags: [],
    tagExperienceLevels: {},
    tagInterestLevels: {}
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserDetails();
    }
  }, [isOpen, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userService.getUserById(userId);
      const userData = response.data;
      
      setUser(userData);
      
      // Prepare form data for editing
      setFormData({
        firstName: userData.first_name,
        lastName: userData.last_name,
        bio: userData.bio,
        postalCode: userData.postal_code,
        // You'll need to adjust this based on how tags are returned
        selectedTags: userData.tags?.map(tag => tag.id) || [],
        tagExperienceLevels: userData.tags?.reduce((acc, tag) => {
          acc[tag.id] = tag.experience_level;
          return acc;
        }, {}) || {},
        tagInterestLevels: userData.tags?.reduce((acc, tag) => {
          acc[tag.id] = tag.interest_level;
          return acc;
        }, {}) || {}
      });
      
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagSelection = (selectedTags, experienceLevels, interestLevels) => {
    setFormData(prev => ({
      ...prev,
      selectedTags,
      tagExperienceLevels: experienceLevels,
      tagInterestLevels: interestLevels
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const submissionData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        bio: formData.bio,
        postal_code: formData.postalCode,
        tags: formData.selectedTags.map(tagId => ({
          tag_id: tagId,
          experience_level: formData.tagExperienceLevels[tagId] || 'beginner',
          interest_level: formData.tagInterestLevels[tagId] || 'medium'
        }))
      };
      
      const response = await userService.updateUser(userId, submissionData);
      
      // Update the local user data
      setUser(response.data);
      
      // Exit edit mode
      setIsEditing(false);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(response.data);
      }
      
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component similar to TeamDetailsModal...
  // Render different views for edit and view modes
  // Include appropriate sections for user details, tags, etc.

  return (
    // Modal implementation similar to TeamDetailsModal
    // You'll want to customize this for user-specific details
  );
};

export default UserDetailsModal;