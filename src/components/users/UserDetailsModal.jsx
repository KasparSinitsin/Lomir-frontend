import React, { useState, useEffect } from 'react';
import { X, Edit, Users, Tag, MapPin } from 'lucide-react';
import { userService } from '../../services/userService';
import Button from '../common/Button';
import TagSelector from '../tags/TagSelector';
import Alert from '../common/Alert';
import Card from '../common/Card';

const UserDetailsModal = ({ isOpen, userId, onClose, onUpdate, mode }) => {
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
      
      setFormData({
        firstName: userData.first_name,
        lastName: userData.last_name,
        bio: userData.bio,
        postalCode: userData.postal_code,
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
      
      setUser(response.data);
      setIsEditing(false);
      
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose}></div>
      
      {/* Modal container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden">
        <div className="bg-base-100 h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-xl font-medium text-primary">
              {isEditing ? 'Edit Profile' : 'User Details'}
            </h2>
            <div className="flex items-center space-x-2">
              {/* Only show Edit button if not in 'profile' mode and not editing */}
              {mode !== 'profile' && !isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  icon={<Edit size={16} />}
                >
                  Edit
                </Button>
              )}
              <button 
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Modal Body */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="loading loading-spinner loading-lg text-primary"></div>
              </div>
            ) : error ? (
              <Alert type="error" message={error} />
            ) : isEditing ? (
              // Edit Mode (form for user to edit data)
              <form className="space-y-6">
                {/* Form inputs here */}
                <div className="space-y-4">
                  <input 
                    type="text" 
                    name="firstName" 
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="First Name"
                  />
                  <input 
                    type="text" 
                    name="lastName" 
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Last Name"
                  />
                  <textarea 
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="textarea textarea-bordered w-full"
                    placeholder="Bio"
                  />
                  <input 
                    type="text" 
                    name="postalCode" 
                    value={formData.postalCode}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Postal Code"
                  />
                  <TagSelector
                    selectedTags={formData.selectedTags}
                    onSelect={handleTagSelection}
                    tagExperienceLevels={formData.tagExperienceLevels}
                    tagInterestLevels={formData.tagInterestLevels}
                  />
                </div>
                <Button 
                  variant="primary" 
                  onClick={handleSubmit}
                  className="mt-4"
                >
                  Save Changes
                </Button>
              </form>
            ) : (
              // View Mode (display user data)
              <div className="space-y-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-16 h-16">
                      <span className="text-2xl">
                        {user.first_name?.charAt(0) || user.username?.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {user.first_name} {user.last_name}
                    </h1>
                    <p className="text-base-content/70">@{user.username}</p>
                  </div>
                </div>

                {user.bio && (
                  <div className="bg-white/30 p-4 rounded-lg shadow-inner">
                    <p className="text-base-content/90">{user.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <MapPin size={18} className="mt-1 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <p>{user.postal_code || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <Tag size={18} className="mr-2 text-primary flex-shrink-0" />
                    <h3 className="font-medium">Skills & Interests</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.tags && user.tags.length > 0 ? (
                      user.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="badge badge-primary badge-outline p-3"
                        >
                          {tag.name} - {tag.experience_level} - {tag.interest_level}
                        </span>
                      ))
                    ) : (
                      <span className="badge badge-warning">No tags yet</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;