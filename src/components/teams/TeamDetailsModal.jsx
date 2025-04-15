import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/teamService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { X, Edit, Users, Trash2, Check, AlertCircle } from 'lucide-react';

const TeamDetailsModal = ({ 
  isOpen = true, // Default to true for URL access
  teamId: propTeamId, 
  onClose, 
  onUpdate, 
  onDelete 
}) => {
  const navigate = useNavigate();
  const { id: urlTeamId } = useParams();
  const { user } = useAuth();
  
  const teamId = useMemo(() => propTeamId || urlTeamId, [propTeamId, urlTeamId]);
  
  const [isModalVisible, setIsModalVisible] = useState(isOpen);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: null, message: null });
  const [team, setTeam] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 5,
    selectedTags: [],
  });
  const [formErrors, setFormErrors] = useState({});

  const fetchTeamDetails = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setNotification({ type: null, message: null });
      
      const response = await teamService.getTeamById(teamId);
      const teamData = response.data;
      
      console.log('Fetched team details:', teamData);
      
      setTeam(teamData);
      setFormData({
        name: teamData.name || '',
        description: teamData.description || '',
        isPublic: Boolean(teamData.is_public),
        maxMembers: teamData.max_members || 5,
        selectedTags: teamData.tags?.map(tag => tag.id || tag.tag_id) || [],
      });
    } catch (err) {
      console.error('Error fetching team details:', err);
      setNotification({ 
        type: 'error', 
        message: 'Failed to load team details. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    setIsModalVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isModalVisible && teamId) {
      fetchTeamDetails();
    }
  }, [isModalVisible, teamId, fetchTeamDetails]);

  useEffect(() => {
    // Reset state when modal closes
    if (!isModalVisible) {
      setNotification({ type: null, message: null });
      setFormErrors({});
    }
  }, [isModalVisible]);

  const isTeamCreator = useMemo(() => 
    team && user && team.creator_id === user.id, 
    [team, user]
  );

  const isTeamMember = useMemo(() => 
    team && user && team.members?.some(member => member.user_id === user.id), 
    [team, user]
  );

  const handleClose = useCallback(() => {
    setIsModalVisible(false);
    // Allow animation to complete before executing onClose
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else if (urlTeamId) {
        // If we're on a team-specific route, navigate back to teams
        navigate('/teams/my-teams');
      }
    }, 300);
  }, [onClose, navigate, urlTeamId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxMembers' ? parseInt(newValue, 10) : newValue
    }));
  };

  const handleTagSelection = useCallback((selectedTags) => {
    setFormData(prev => ({
      ...prev,
      selectedTags,
    }));
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Team name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Team name must be at least 3 characters';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Team description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    
    if (formData.maxMembers < 2 || formData.maxMembers > 20) {
      errors.maxMembers = 'Team size must be between 2 and 20 members';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      const submissionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        tags: formData.selectedTags.map(tagId => ({ tag_id: tagId })),
      };

      const response = await teamService.updateTeam(teamId, submissionData);

      await fetchTeamDetails();
      
      setNotification({ 
        type: 'success', 
        message: 'Team updated successfully!' 
      });
      
      setIsEditing(false);

      if (onUpdate && response.data) {
        onUpdate(response.data);
      } else if (onUpdate && team) {
        onUpdate({ ...team, ...submissionData });
      }
    } catch (err) {
      console.error('Error updating team:', err);
      setNotification({ 
        type: 'error', 
        message: 'Failed to update team. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        setLoading(true);
        
        let success = false;
        if (onDelete) {
          success = await onDelete(teamId);
        } else {
          await teamService.deleteTeam(teamId);
          success = true;
        }
        
        if (success) {
          handleClose();
          // If we're on a team-specific route, navigate away
          if (urlTeamId) {
            navigate('/teams/my-teams');
          }
        }
      } catch (err) {
        console.error('Error deleting team:', err);
        setNotification({
          type: 'error',
          message: 'Failed to delete team. Please try again.'
        });
        setLoading(false);
      }
    }
  };

  const handleApplyToJoin = async () => {
    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      await teamService.addTeamMember(teamId, user.id);
      await fetchTeamDetails();

      setNotification({ 
        type: 'success', 
        message: 'Successfully applied to join the team!' 
      });
    } catch (err) {
      console.error('Error applying to join team:', err);
      setNotification({
        type: 'error',
        message: 'Failed to apply. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderNotification = () => {
    if (!notification.type || !notification.message) return null;
    
    return (
      <Alert 
        type={notification.type} 
        message={notification.message}
        onClose={() => setNotification({ type: null, message: null })}
        className="mb-4"
      />
    );
  };

  const renderContent = () => (
    <div className="relative w-full max-w-2xl mx-auto max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
      <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
        <h2 className="text-xl font-medium text-primary">
          {isEditing ? 'Edit Team' : 'Team Details'}
        </h2>
        <div className="flex items-center space-x-2">
          {isTeamCreator && !isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                icon={<Edit size={16} />}
              >
                Edit
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={handleDeleteTeam}
                icon={<Trash2 size={16} />}
                disabled={loading}
              >
                Delete
              </Button>
            </>
          )}
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg text-primary"></div>
          </div>
        ) : (
          <>
            {renderNotification()}
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label">Team Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input input-bordered w-full ${formErrors.name ? 'input-error' : ''}`}
                    placeholder="Team Name"
                  />
                  {formErrors.name && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.name}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">Team Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={`textarea textarea-bordered h-24 w-full ${formErrors.description ? 'textarea-error' : ''}`}
                    placeholder="Team Description"
                  ></textarea>
                  {formErrors.description && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.description}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Public Team</span>
                    <input
                      type="checkbox"
                      name="isPublic"
                      className="toggle toggle-primary"
                      checked={formData.isPublic}
                      onChange={handleChange}
                    />
                  </label>
                  <p className="text-sm text-base-content/70">
                    {formData.isPublic 
                      ? 'Your team will be visible to all users' 
                      : 'Your team will only be visible to members'}
                  </p>
                </div>

                <div className="form-control">
                  <label className="label">Maximum Members</label>
                  <select
                    name="maxMembers"
                    value={formData.maxMembers}
                    onChange={handleChange}
                    className={`select select-bordered w-full ${formErrors.maxMembers ? 'select-error' : ''}`}
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(size => (
                      <option key={size} value={size}>{size} members</option>
                    ))}
                  </select>
                  {formErrors.maxMembers && (
                    <label className="label">
                      <span className="label-text-alt text-error">{formErrors.maxMembers}</span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">Team Tags (Optional)</label>
                  <TagSelector
                    selectedTags={formData.selectedTags}
                    onTagsSelected={handleTagSelection}
                  />
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold">{team?.name}</h1>
                
                <div className="bg-base-200 p-4 rounded-lg shadow-inner">
                  <p className="text-base-content/90 whitespace-pre-line">{team?.description}</p>
                </div>

                <div className="flex items-center space-x-2 text-base-content/70">
                  <Users size={18} className="text-primary" />
                  <span>{team?.current_members_count || 0} / {team?.max_members} members</span>
                  <span className={`badge ${team?.is_public ? 'badge-success' : 'badge-warning'}`}>
                    {team?.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                
                {/* Tags */}
                {team?.tags && team.tags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Team Tags:</h3>
                    <div className="flex flex-wrap gap-2">
                      {team.tags.map((tag) => (
                        <span key={tag.id || tag.tag_id} className="badge badge-primary badge-outline">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Members */}
                {team?.members && team.members.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Team Members:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {team.members.map((member) => (
                        <li key={member.user_id} className="text-base-content/80">
                          {member.username || member.email}
                          {member.role && (
                            <span className="badge badge-sm ml-2">{member.role}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Apply to Join Button */}
                {!isTeamMember && !isTeamCreator && (
                  <div className="mt-6">
                    <Button 
                      variant="primary" 
                      onClick={handleApplyToJoin}
                      disabled={loading}
                      className="w-full"
                    >
                      Apply to Join
                    </Button>
                  </div>
                )}
                
                {/* Member Status Message */}
                {isTeamMember && !isTeamCreator && (
                  <div className="p-3 bg-success/10 border border-success/30 rounded-lg flex items-center">
                    <Check size={20} className="text-success mr-2" />
                    <span>You're a member of this team</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // If not visible, don't render anything
  if (!isModalVisible) return null;
  
  // If accessed via URL directly (not as a modal), render without overlay
  if (urlTeamId && !propTeamId) {
    return renderContent();
  }
  
  // Otherwise render as a modal with overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-40" 
        onClick={handleClose}
      ></div>
      {renderContent()}
    </div>
  );
};

export default TeamDetailsModal;