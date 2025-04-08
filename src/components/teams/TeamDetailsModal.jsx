import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/teamService';
import { tagService } from '../../services/tagService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { X, Edit, Users, Map, Tag } from 'lucide-react';

const TeamDetailsModal = ({ isOpen, teamId, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 5,
    postalCode: '',
    selectedTags: [],
    tagInterestLevels: {},
    tagExperienceLevels: {}
  });
  
  // Check if the current user is the team creator
  const isTeamCreator = team && user && team.created_by === user.id;
  
  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeamDetails();
    }
  }, [isOpen, teamId]);
  
  const fetchTeamDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await teamService.getTeamById(teamId);
      const teamData = response.data;
      
      setTeam(teamData);
      
      // Prepare form data for editing
      setFormData({
        name: teamData.name,
        description: teamData.description,
        isPublic: teamData.is_public,
        maxMembers: teamData.max_members,
        postalCode: teamData.postal_code,
        selectedTags: teamData.tags.map(tag => tag.id),
        tagInterestLevels: teamData.tags.reduce((acc, tag) => {
          acc[tag.id] = tag.interest_level;
          return acc;
        }, {}),
        tagExperienceLevels: teamData.tags.reduce((acc, tag) => {
          acc[tag.id] = tag.experience_level;
          return acc;
        }, {})
      });
      
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError('Failed to load team details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;

    if (name === 'maxMembers') {
      newValue = parseInt(value, 10);
    } else if (type === 'checkbox') {
      newValue = checked;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
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
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        postal_code: formData.postalCode,
        tags: formData.selectedTags.map(tagId => ({
          tag_id: tagId,
          experience_level: formData.tagExperienceLevels[tagId] || 'beginner',
          interest_level: formData.tagInterestLevels[tagId] || 'medium'
        }))
      };
      
      const response = await teamService.updateTeam(teamId, submissionData);
      
      // Update the local team data
      setTeam(response.data);
      
      // Exit edit mode
      setIsEditing(false);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(response.data);
      }
      
    } catch (err) {
      console.error('Error updating team:', err);
      setError('Failed to update team. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-base-100 z-10 px-6 py-4 border-b border-base-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">
            {isEditing ? 'Edit Team' : 'Team Details'}
          </h2>
          <div className="flex items-center space-x-2">
            {isTeamCreator && !isEditing && (
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
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
          ) : error ? (
            <Alert type="error" message={error} />
          ) : (
            <>
              {isEditing ? (
                /* Edit Mode */
                <form className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Team Name</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Description</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="textarea textarea-bordered h-24"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <span className="label-text">Public Team</span>
                      <input
                        type="checkbox"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleChange}
                        className="toggle toggle-primary"
                      />
                    </label>
                    <p className="text-sm text-base-content/70">
                      Public teams are visible to all users. Private teams require invitation.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Postal Code</span>
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        className="input input-bordered"
                        required
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Maximum Members</span>
                      </label>
                      <select
                        name="maxMembers"
                        value={formData.maxMembers}
                        onChange={handleChange}
                        className="select select-bordered"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(size => (
                          <option key={size} value={size}>{size} members</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Team Tags</span>
                    </label>
                    <TagSelector
                      selectedTags={formData.selectedTags}
                      onTagsSelected={handleTagSelection}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={handleSubmit}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold">{team.name}</h1>
                  
                  <div className="bg-base-200 p-4 rounded-lg">
                    <p className="text-base-content/80">{team.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-2">
                      <Users size={18} className="mt-1 text-primary" />
                      <div>
                        <h3 className="font-medium">Team Status</h3>
                        <p>{team.is_public ? 'Public' : 'Private'} Team</p>
                        <p>{team.current_members_count} / {team.max_members} members</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Map size={18} className="mt-1 text-primary" />
                      <div>
                        <h3 className="font-medium">Location</h3>
                        <p>Postal Code: {team.postal_code}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <Tag size={18} className="mr-2 text-primary" />
                      <h3 className="font-medium">Team Tags</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.tags && team.tags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="badge badge-primary badge-outline p-3"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="border-t pt-6 mt-6">
                    <h3 className="font-medium mb-3 flex items-center">
                      <Users size={18} className="mr-2 text-primary" />
                      Team Members
                    </h3>
                    
                    <div className="space-y-2">
                      {team.members && team.members.map(member => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="avatar placeholder">
                              <div className="bg-primary text-primary-content rounded-full w-10">
                                <span>{member.first_name?.charAt(0) || member.username?.charAt(0)}</span>
                              </div>
                            </div>
                            <div>
                              <p className="font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-sm text-base-content/70">@{member.username}</p>
                            </div>
                          </div>
                          
                          <span className="badge badge-outline">
                            {member.role || 'Member'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamDetailsModal;