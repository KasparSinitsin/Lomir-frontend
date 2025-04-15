import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/teamService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { X, Edit, Users, Trash2 } from 'lucide-react';

const TeamDetailsModal = ({ isOpen, teamId, onClose, onUpdate, onDelete }) => {
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
    selectedTags: [],
  });

  const fetchTeamDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await teamService.getTeamById(teamId);
      const teamData = response.data;
      console.log('[TeamDetailsModal] Loaded team:', teamData);
      setTeam(teamData);

      setFormData({
        name: teamData.name,
        description: teamData.description,
        isPublic: teamData.is_public,
        maxMembers: teamData.max_members,
        selectedTags: teamData.tags?.map(tag => tag.id) || [],
      });
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError('Failed to load team details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // Check if the current user is the creator of the team
  const isTeamCreator = team && user && team.creator_id === user.id;

  // Check if the user is already a member of this team
  const isTeamMember = team && user && team.members?.some(member => member.user_id === user.id);

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeamDetails();
    }
  }, [isOpen, teamId, fetchTeamDetails]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        tags: formData.selectedTags.map(tagId => ({ tag_id: tagId })),
      };

      const response = await teamService.updateTeam(teamId, submissionData);

      // Update the local team data
      await fetchTeamDetails();

      setIsEditing(false);

      if (onUpdate && response.data) {
        onUpdate(response.data);
      } else if (onUpdate && team) {
        // Fallback to using the current team data if response.data is not available
        onUpdate({ ...team, ...submissionData });
      }
    } catch (err) {
      console.error('Error updating team:', err);
      setError('Failed to update team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToJoin = async () => {
    try {
      setLoading(true);
      setError(null);

      await teamService.addTeamMember(teamId, user.id);

      // Refresh team details
      await fetchTeamDetails();

      // Show success message
      setError({ type: 'success', message: 'Successfully applied to join the team!' });
    } catch (err) {
      console.error('Error applying to join team:', err);
      setError('Failed to apply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        setLoading(true);
        await teamService.deleteTeam(teamId);

        // Close the modal
        onClose();

        // Notify parent component
        if (onDelete) {
          onDelete(teamId);
        }
      } catch (err) {
        console.error('Error deleting team:', err);
        setError('Failed to delete team. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose}></div>

      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
        {/* Header */}
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
                  className="ml-2 hover:bg-[#C7D2FE] hover:text-[#1E40AF]"
                  icon={<Edit size={16} />}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteTeam}
                  className="ml-2 hover:bg-[#C7D2FE] hover:text-[#1E40AF]"
                  icon={<Trash2 size={16} />}
                  disabled={loading}
                >
                  Delete
                </Button>
              </>
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
          ) : error && typeof error === 'string' ? (
            <Alert type="error" message={error} />
          ) : error && error.type === 'success' ? (
            <Alert type="success" message={error.message} />
          ) : (
            <>
              {isEditing ? (
                <form className="space-y-6">
                  <div className="form-control">
                    <label className="label">Team Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="textarea textarea-bordered h-24"
                    ></textarea>
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
                  </div>

                  <div className="form-control">
                    <label className="label">Maximum Members</label>
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

                  <div className="form-control">
                    <label className="label">Team Tags</label>
                    <TagSelector
                      selectedTags={formData.selectedTags}
                      onTagsSelected={handleTagSelection}
                      mode="team"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
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
                <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">{team.name}</h1>
                  {!isEditing && !isTeamCreator && !isTeamMember && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyToJoin}
                      disabled={loading}
                      className="ml-4"
                    >
                      Apply to join
                    </Button>
                  )}
                </div>

                  <div className="bg-base-100 p-4 rounded-lg shadow-inner space-y-3">
                    <p className="text-base-content/90 whitespace-pre-line">{team.description}</p>

                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium">Visibility:</span>
                      <span className={`badge ${team.is_public ? 'badge-success' : 'badge-neutral'}`}>
                        {team.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                      <Users size={18} className="text-primary" />
                      <span>{team.current_members_count || 0} / {team.max_members} members</span>
                    </div>

                    {/* Tags */}
                    <div>
                      <h3 className="font-medium text-sm mt-4">Team Tags:</h3>
                      {team.tags?.length > 0 ? (
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
                    {team.members && team.members.length > 0 && (
  <div>
    <h2 className="text-xl font-semibold mt-6 mb-4">Team Members</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {team.members.map((member) => (
        <div
          key={member.user_id}
          className="flex items-start bg-base-200 rounded-xl shadow p-4 gap-4"
        >
          <img
            src={member.profile_picture || '/default-avatar.png'}
            alt={`${member.username}'s avatar`}
            className="w-14 h-14 rounded-full object-cover"
          />

          <div className="flex flex-col">
            <span className="font-medium text-primary">{member.username}</span>
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