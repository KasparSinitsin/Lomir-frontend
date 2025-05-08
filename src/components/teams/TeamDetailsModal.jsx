import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/teamService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { X, Edit, Users, Trash2 } from 'lucide-react';
import LabeledToggle from '../common/LabeledToggle';

const TeamDetailsModal = ({
  isOpen = true,
  teamId: propTeamId,
  onClose,
  onUpdate,
  onDelete,
  userRole
}) => {
  const navigate = useNavigate();
  const { id: urlTeamId } = useParams();
  const { user, isAuthenticated } = useAuth();

  const effectiveTeamId = useMemo(() => propTeamId || urlTeamId, [propTeamId, urlTeamId]);

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
    if (!effectiveTeamId) return;

    try {
      setLoading(true);
      setNotification({ type: null, message: null });

      const response = await teamService.getTeamById(effectiveTeamId);
      const teamData = response.data;

      console.log('Fetched team details:', teamData);

      setTeam(teamData);
      setFormData({
        name: teamData.name || '',
        description: teamData.description || '',
        isPublic: Boolean(teamData.is_public),
        maxMembers: teamData.max_members || 5,
        selectedTags: teamData.tags?.map(tag => parseInt(tag.id || tag.tag_id, 10)) || [],
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
  }, [effectiveTeamId]);

  useEffect(() => {
    setIsModalVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isModalVisible && effectiveTeamId) {
      fetchTeamDetails();
    } else if (isModalVisible && !effectiveTeamId) {
      // Handle the case where teamId is not yet available (e.g., just created)
      setLoading(false); // Don't show loading indefinitely
      setIsEditing(true); // Directly go to editing mode
    }
  }, [isModalVisible, effectiveTeamId, fetchTeamDetails]);

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
  
  const isTeamAdmin = useMemo(() =>
    userRole === 'admin',
    [userRole]
  );
  
  const canEditTeam = isTeamCreator || isTeamAdmin;
  
  // Check if user is already a member of this team
  const isTeamMember = useMemo(() => {
    if (!team || !user) return false;
    return team.members?.some(member => member.user_id === user.id) || isTeamCreator || userRole;
  }, [team, user, isTeamCreator, userRole]);

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
        const newErrors = { ...prev };
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
    console.log("Tags selected:", selectedTags);
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

      // Log the selected tag IDs to help debug
      console.log("Selected tag IDs:", formData.selectedTags);

      const submissionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        // Make sure tag IDs are valid integers
        tags: formData.selectedTags.map(tagId => ({ 
          tag_id: parseInt(tagId, 10) 
        })),
      };

      console.log("Submitting team data:", submissionData);

      const response = await teamService.updateTeam(effectiveTeamId, submissionData);

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
      
      // Improve error message by extracting the specific error from the API response
      let errorMessage = 'Failed to update team. Please try again.';
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        errorMessage = `Error: ${err.response.data.errors[0]}`;
      }
      
      setNotification({
        type: 'error',
        message: errorMessage
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
          success = await onDelete(effectiveTeamId);
        } else {
          await teamService.deleteTeam(effectiveTeamId);
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

      await teamService.addTeamMember(effectiveTeamId, user.id);
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

  const renderJoinButton = () => {
    if (!isAuthenticated || !user || isTeamMember || loading) {
      return null;
    }
    
    return (
      <div className="mt-6">
        <Button
          variant="primary"
          onClick={handleApplyToJoin}
          disabled={loading}
          className="w-full"
        >
          Apply to Join Team
        </Button>
      </div>
    );
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

  if (!isModalVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={handleClose}></div>
      
      {/* Modal container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
        <div className="px-6 py-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-xl font-medium text-primary">
            {isEditing ? 'Edit Team' : 'Team Details'}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Only show Edit/Delete buttons if user has permission */}
            {canEditTeam && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                  icon={<Edit size={16} />}
                >
                  Edit
                </Button>
                {isTeamCreator && ( // Only creator can delete, not admins
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteTeam}
                    className="hover:bg-[#7ace82] hover:text-[#036b0c]"
                    icon={<Trash2 size={16} />}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                )}
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
          {renderNotification()}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
          ) : (
            <>
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
{import.meta.env.DEV && (
  <div className="mt-2 text-sm text-base-content/70">
    <p>Debug: Selected tag IDs: {formData.selectedTags.join(', ')}</p>
  </div>
)}
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

                  <div className="bg-base-200 p-4 rounded-lg shadow-inner space-y-3">
                    <p className="text-base-content/90 whitespace-pre-line">{team?.description}</p>

                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium">Visibility:</span>
                      <span className={`badge ${team?.is_public ? 'badge-success' : 'badge-warning'}`}>
                        {team?.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                      <Users size={18} className="text-primary" />
                      <span>{team?.current_members_count || 0} / {team?.max_members} members</span>
                    </div>

                    {/* Tags */}
                    <div>
                      <h3 className="font-medium text-sm mt-4">Team Tags:</h3>
                      {team?.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {team.tags.map((tag) => (
                            <span key={tag.id || tag.tag_id} className="badge badge-outline">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-base-content/60 italic">No tags selected.</p>
                      )}
                    </div>

                    {/* Members */}
                    {team?.members && team.members.length > 0 && (
                      <div>
                        <h2 className="text-xl font-semibold mt-6 mb-4">Team Members</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {team.members.map((member) => (
                            <div
                              key={member.user_id}
                              className="flex items-start bg-base-200 rounded-xl shadow p-4 gap-4"
                            >
                              <div className="avatar placeholder">
                                <div className="bg-primary text-primary-content rounded-full w-12 h-12">
                                  <span className="text-lg">{member.username?.charAt(0) || '?'}</span>
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="font-medium text-primary">{member.username}</span>
                                <span className="text-xs text-base-content/70">{member.role}</span>
                                {member.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {member.tags.map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="badge badge-outline badge-sm text-xs"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Join Team Button for non-members */}
                    {renderJoinButton()}
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