// src/components/teams/TeamDetailsModal.jsx
import React, { useState, useEffect } from 'react';
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
      console.log('[TeamDetailsModal] Loaded team:', teamData); // Debug
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
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxMembers' ? parseInt(newValue, 10) : newValue
    }));
  };

  const handleTagSelection = (selectedTags) => {
    setFormData(prev => ({
      ...prev,
      selectedTags,
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
        tags: formData.selectedTags.map(tagId => ({ tag_id: tagId })),
      };

      const response = await teamService.updateTeam(teamId, submissionData);
      setTeam(response.data);
      setIsEditing(false);
      if (onUpdate) onUpdate(response.data);
    } catch (err) {
      console.error('Error updating team:', err);
      setError('Failed to update team. Please try again.');
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
          ) : error ? (
            <Alert type="error" message={error} />
          ) : (
            <>
              {isEditing ? (
                <form className="space-y-6">{/* form goes here */}</form>
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
                      <span>{team.max_members} members max</span>
                    </div>

                    {/* Tags */}
                    <div>
                      <h3 className="font-medium text-sm mt-4">Team Tags:</h3>
                      {team.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {team.tags.map((tag) => (
                            <span key={tag.id} className="badge badge-outline">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-base-content/60 italic">No tags selected.</p>
                      )}
                    </div>

                    {/* Members */}
                    <div>
                      <h3 className="font-medium text-sm mt-4">Team Members:</h3>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                        {team.members?.map((member) => (
                          <li key={member.id} className="text-sm">
                            {member.name || member.username || member.email}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Apply Button */}
        {!isTeamCreator && !isEditing && (
          <div className="absolute bottom-6 right-6">
            <Button
              onClick={() => {
                // Handle the apply action here
              }}
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
      </div>
    </div>
  );
};

export default TeamDetailsModal;