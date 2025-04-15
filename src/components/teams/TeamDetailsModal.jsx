import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { teamService } from '../../services/teamService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { X, Edit, Users, Trash2 } from 'lucide-react';

const TeamDetailsModal = ({ 
  isOpen, 
  teamId: propTeamId, 
  onClose, 
  onUpdate, 
  onDelete 
}) => {
  const navigate = useNavigate();
  const { id: urlTeamId } = useParams();
  const { user } = useAuth();
  
  const teamId = useMemo(() => propTeamId || urlTeamId, [propTeamId, urlTeamId]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
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
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await teamService.getTeamById(teamId);
      const teamData = response.data;
      
      console.log('Fetched team details:', teamData);
      
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

  useEffect(() => {
    setIsModalVisible(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isModalVisible && teamId) {
      fetchTeamDetails();
    }
  }, [isModalVisible, teamId, fetchTeamDetails]);

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
    if (onClose) {
      onClose();
    }
  }, [onClose]);

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

      await fetchTeamDetails();

      setIsEditing(false);

      if (onUpdate && response.data) {
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('Error updating team:', err);
      setError('Failed to update team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      try {
        if (onDelete) {
          await onDelete(teamId);
        } else {
          await teamService.deleteTeam(teamId);
        }
        
        handleClose();
      } catch (err) {
        console.error('Error deleting team:', err);
        setError('Failed to delete team. Please try again.');
      }
    }
  };

  const handleApplyToJoin = async () => {
    try {
      setLoading(true);
      setError(null);

      await teamService.addTeamMember(teamId, user.id);

      await fetchTeamDetails();

      setError({ type: 'success', message: 'Successfully applied to join the team!' });
    } catch (err) {
      console.error('Error applying to join team:', err);
      setError('Failed to apply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isModalVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-40" 
        onClick={handleClose}
      ></div>

      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden bg-base-100 shadow-lg">
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

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : error ? (
            <Alert 
              type={error.type === 'success' ? 'success' : 'error'} 
              message={typeof error === 'string' ? error : error.message} 
            />
          ) : isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="space-y-4">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                  placeholder="Team Name"
                />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="textarea textarea-bordered w-full"
                  placeholder="Team Description"
                />
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Public Team</span>
                    <input
                      type="checkbox"
                      name="isPublic"
                      className="toggle"
                      checked={formData.isPublic}
                      onChange={handleChange}
                    />
                  </label>
                </div>
                <select
                  name="maxMembers"
                  value={formData.maxMembers}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(size => (
                    <option key={size} value={size}>{size} members</option>
                  ))}
                </select>
                <TagSelector
                  selectedTags={formData.selectedTags}
                  onTagsSelected={handleTagSelection}
                />
                <div className="flex justify-end space-x-2">
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
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">{team.name}</h3>
              <p className="text-base-content/80">{team.description}</p>
              
              <div className="flex items-center space-x-2">
                <Users size={20} />
                <span>{team.current_members_count || 0} / {team.max_members} members</span>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Team Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {team.tags?.map(tag => (
                    <span key={tag.id} className="badge badge-primary">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              
              {!isTeamMember && !isTeamCreator && (
                <Button 
                  variant="primary" 
                  onClick={handleApplyToJoin}
                >
                  Apply to Join
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamDetailsModal;