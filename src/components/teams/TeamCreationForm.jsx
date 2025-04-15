import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import TagSelector from '../tags/TagSelector';
import Alert from '../common/Alert';
import { teamService } from '../../services/teamService';

const TeamCreationForm = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 5,
    selectedTags: []
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdTeamId, setCreatedTeamId] = useState(null);

  const validateStep = () => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = 'Team name is required';
        } else if (formData.name.trim().length < 3) {
          newErrors.name = 'Team name must be at least 3 characters';
        }

        if (!formData.description.trim()) {
          newErrors.description = 'Team description is required';
        } else if (formData.description.trim().length < 10) {
          newErrors.description = 'Description must be at least 10 characters';
        }
        break;

      case 2:
        if (formData.maxMembers < 2 || formData.maxMembers > 20) {
          newErrors.maxMembers = 'Team size must be between 2 and 20 members';
        }
        break;

      case 3:
        break;
    }

    console.log('Validation Errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleTagSelection = (selectedTags) => {
    setFormData(prev => ({
      ...prev,
      selectedTags
    }));
  };

  const nextStep = () => {
    console.log('Current Step:', step);
    console.log('Current Form Data:', formData);
    console.log('Current Errors:', errors);

    const isStepValid = validateStep();
    
    if (isStepValid) {
      setStep(prev => Math.min(prev + 1, 3));
      console.log('Moving to next step');
    } else {
      console.log('Step validation failed');
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (validateStep()) {
      setIsSubmitting(true);
      setSubmitError(null);
  
      try {
        const submissionData = {
          name: formData.name,
          description: formData.description || '',
          is_public: formData.isPublic ? 1 : 0,
          max_members: formData.maxMembers,
          tags: formData.selectedTags.map(tagId => ({
            tag_id: tagId
          }))
        };
  
        const response = await teamService.createTeam(submissionData);
        
        setCreatedTeamId(response.data.id);
        setIsSubmitting(false);
      } catch (error) {
        console.error('Team creation error details:', error.response?.data);
        setSubmitError(
          error.response?.data?.message ||
          error.message ||
          'Failed to create team. Please try again.'
        );
        setIsSubmitting(false);
      }
    }
  };

  const handleViewTeamDetails = () => {
    if (createdTeamId) {
      navigate(`/teams/${createdTeamId}`);
    }
  };

  const handleGoToMyTeams = () => {
    navigate('/teams/my-teams');
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center space-x-2 mb-6">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`h-2 w-2 rounded-full ${
            step === s ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Team Name</span>
              </label>
              <input
                type="text"
                name="name"
                className={`input input-bordered ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && (
                <label className="label text-error">{errors.name}</label>
              )}
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Team Description</span>
              </label>
              <textarea
                name="description"
                className={`textarea textarea-bordered h-24 ${errors.description ? 'textarea-error' : ''}`}
                value={formData.description}
                onChange={handleChange}
              ></textarea>
              {errors.description && (
                <label className="label text-error">{errors.description}</label>
              )}
            </div>

            <div className="form-control mt-4">
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
              <p className="text-sm text-gray-500 mt-2">
                Public teams are visible to all users. Private teams require invitation.
              </p>
            </div>
          </>
        );

      case 2:
        return (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Maximum Team Size</span>
            </label>
            <select
              name="maxMembers"
              className={`select select-bordered ${errors.maxMembers ? 'select-error' : ''}`}
              value={formData.maxMembers}
              onChange={handleChange}
            >
              {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(size => (
                <option key={size} value={size}>{size} members</option>
              ))}
            </select>
            {errors.maxMembers && (
              <label className="label text-error">{errors.maxMembers}</label>
            )}
          </div>
        );

      case 3:
        if (createdTeamId) {
          return (
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Team Created Successfully!</h3>
              <p className="mb-6">What would you like to do next?</p>
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={handleGoToMyTeams}
                  className="btn btn-outline"
                >
                  Go to My Teams
                </button>
                <button
                  type="button"
                  onClick={handleViewTeamDetails}
                  className="btn btn-primary"
                >
                  View Team Details
                </button>
              </div>
            </div>
          );
        }

        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Team Tags (Optional)</h3>
            <TagSelector
              onTagsSelected={handleTagSelection}
              selectedTags={formData.selectedTags}
            />
            {errors.tags && (
              <p className="text-error text-sm mt-2">{errors.tags}</p>
            )}
          </div>
        );
    }
  };

  const renderButtons = () => {
    if (createdTeamId) {
      return null;
    }

    return (
      <div className="flex justify-between mt-6">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="btn btn-outline"
          >
            <FiChevronLeft className="mr-2" />
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="btn btn-primary ml-auto"
            disabled={isSubmitting}
          >
            Next
            <FiChevronRight className="ml-2" />
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn-primary ml-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Team...' : 'Create Team'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white shadow-md rounded-lg">
      {renderStepIndicator()}
      {submitError && <Alert type="error" message={submitError} />}
      <form onSubmit={handleSubmit}>
        {renderStepContent()}
        {renderButtons()}
      </form>
    </div>
  );
};

export default TeamCreationForm;