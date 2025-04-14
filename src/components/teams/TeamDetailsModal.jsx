import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/teamService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { X, Edit, Users } from 'lucide-react';

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
        // Make sure tag IDs are numbers
        selectedTags: teamData.tags?.map(tag => Number(tag.id || tag.tag_id)) || [],
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

      console.log("Selected tags before submission:", formData.selectedTags);

      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        tags: formData.selectedTags.map(tagId => {
          console.log("Processing tag ID:", tagId, typeof tagId);
          return { tag_id: tagId };
        }),
      };

      console.log("Final submission data:", submissionData);

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
                  <h1 className="text-2xl font-bold">{team.name}</h1>

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
                        <h3 className="font-medium text-sm mt-4">Team Members:</h3>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                          {team.members.map((member) => (
                            <li key={member.user_id} className="text-sm">
                              {member.username || member.email}
                              {member.role && <span className="badge badge-sm ml-2">{member.role}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Button (only show if not editing and not team creator) */}
        {!isEditing && !isTeamCreator && !isTeamMember && (
          <div className="absolute bottom-6 right-6">
            <Button
              onClick={handleApplyToJoin}
              variant="primary"
              disabled={loading}
              style={{
                backgroundColor: '#6a4c9c', // soft violet
                color: '#fff',
                padding: '16px 32px',
                fontSize: '18px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              Apply to Join
            </Button>
          </div>
        )}

        {/* Already a member message */}
        {!isEditing && !isTeamCreator && isTeamMember && (
          <div className="absolute bottom-6 right-6">
            <span className="badge badge-success p-3">You're a member of this team</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDetailsModal;