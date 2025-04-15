import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import TagSelector from '../tags/TagSelector';
import Alert from '../common/Alert';
import { teamService } from '../../services/teamService';
import TeamDetailsModal from './TeamDetailsModal';

const TeamCreationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 5,
    selectedTags: [],
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [newTeamId, setNewTeamId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.name) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    }
    if (!formData.description) {
      newErrors.description = 'Team description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (formData.maxMembers < 2 || formData.maxMembers > 20) {
      newErrors.maxMembers = 'Team size must be between 2 and 20 members';
    }
    return newErrors;
  }, [formData.name, formData.description, formData.maxMembers]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    let newValue = value;
    if (name === 'maxMembers') {
      newValue = parseInt(value, 10);
    } else if (type === 'checkbox') {
      newValue = checked;
    }
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
    }));
    // Clear any existing error for the changed field
    setErrors(prevErrors => ({ ...prevErrors, [name]: '' }));
  }, []);

  const handleTagSelection = useCallback((selectedTags) => {
    setFormData(prev => ({
      ...prev,
      selectedTags,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(true);
    try {
      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        tags: formData.selectedTags.map(tagId => ({ tag_id: tagId })),
      };
      const response = await teamService.createTeam(submissionData);
      setNewTeamId(response.data.id);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Team creation error:', error);
      setSubmitError(
        error.response?.data?.message ||
        error.message ||
        'Failed to create team. Please try again.'
      );
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = useCallback(() => {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Create a New Team</h2>
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Team Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.name ? 'border-red-500' : ''}`}
            placeholder="Enter team name"
          />
          {errors.name && <p className="text-red-500 text-xs italic">{errors.name}</p>}
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.description ? 'border-red-500' : ''}`}
            placeholder="Enter team description"
            rows="3"
          />
          {errors.description && <p className="text-red-500 text-xs italic">{errors.description}</p>}
        </div>
        <div className="mb-4">
          <label htmlFor="maxMembers" className="block text-gray-700 text-sm font-bold mb-2">
            Maximum Members
          </label>
          <input
            type="number"
            id="maxMembers"
            name="maxMembers"
            value={formData.maxMembers}
            onChange={handleChange}
            min="2"
            max="20"
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.maxMembers ? 'border-red-500' : ''}`}
          />
          {errors.maxMembers && <p className="text-red-500 text-xs italic">{errors.maxMembers}</p>}
        </div>
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="isPublic"
              checked={formData.isPublic}
              onChange={handleChange}
              className="form-checkbox h-5 w-5 text-primary rounded"
            />
            <span className="ml-2 text-gray-700">Public Team (visible to all users)</span>
          </label>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Add Topic Tags (Optional)
          </label>
          <TagSelector onTagsSelected={handleTagSelection} initialTags={formData.selectedTags} />
        </div>
      </div>
    );
  }, [formData, errors, handleTagSelection, handleChange]);

  return (
    <div className="max-w-xl mx-auto p-4 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Create a New Team</h1>
      {submitError && <Alert type="error" message={submitError} onClose={() => setSubmitError(null)} className="mb-4" />}
      <form onSubmit={handleSubmit}>
        {renderStepContent()}
        <button
          type="submit"
          className="btn btn-primary ml-auto"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Team'}
        </button>
      </form>

      {submitSuccess && (
        <div className="text-center mt-6">
          <FiCheck className="mx-auto mb-4 text-green-500 text-4xl" />
          <p className="mb-4 font-semibold">Team created successfully!</p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
            >
              Edit Team
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <TeamDetailsModal
          isOpen={isModalOpen}
          teamId={newTeamId}
          onClose={() => {
            setIsModalOpen(false);
            navigate('/teams/my-teams');
          }}
        />
      )}
    </div>
  );
};

export default TeamCreationForm;