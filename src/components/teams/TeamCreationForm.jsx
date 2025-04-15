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

  const validateStep = () => {
    const newErrors = {};
    switch (step) {
      case 1:
        if (!formData.name) newErrors.name = 'Team name is required';
        else if (formData.name.length < 3) newErrors.name = 'Team name must be at least 3 characters';
        if (!formData.description) newErrors.description = 'Team description is required';
        else if (formData.description.length < 10) newErrors.description = 'Description must be at least 10 characters';
        break;
      case 2:
        if (formData.maxMembers < 2 || formData.maxMembers > 20) {
          newErrors.maxMembers = 'Team size must be between 2 and 20 members';
        }
        break;
      case 3:
        break; // Tags optional
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = name === 'maxMembers' ? parseInt(value, 10) : type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleTagSelection = (selectedTags) => {
    setFormData(prev => ({ ...prev, selectedTags }));
  };

  const nextStep = () => {
    if (validateStep()) setStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || !validateStep()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic ? 1 : 0,
        max_members: formData.maxMembers,
        tags: formData.selectedTags.map(tagId => ({ tag_id: tagId }))
      };
      const response = await teamService.createTeam(submissionData);
      navigate('/teams/my-teams');
    } catch (error) {
      setSubmitError(error.response?.data?.message || error.message || 'Failed to create team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`w-3 h-3 rounded-full transition-colors ${
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
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Team Name</label>
              <input
                type="text"
                name="name"
                className={`mt-1 w-full input input-bordered ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="mt-1 text-sm text-error">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Team Description</label>
              <textarea
                name="description"
                className={`mt-1 w-full textarea textarea-bordered h-24 ${errors.description ? 'textarea-error' : ''}`}
                value={formData.description}
                onChange={handleChange}
              ></textarea>
              {errors.description && <p className="mt-1 text-sm text-error">{errors.description}</p>}
            </div>

            <div>
              <label className="label cursor-pointer justify-between">
                <span className="label-text">Public Team</span>
                <input
                  type="checkbox"
                  name="isPublic"
                  className="toggle toggle-primary"
                  checked={formData.isPublic}
                  onChange={handleChange}
                />
              </label>
              <p className="text-sm text-gray-500">
                Public teams are visible to all users. Private teams require invitation.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700">Maximum Team Size</label>
            <select
              name="maxMembers"
              className={`mt-1 w-full select select-bordered ${errors.maxMembers ? 'select-error' : ''}`}
              value={formData.maxMembers}
              onChange={handleChange}
            >
              {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(size => (
                <option key={size} value={size}>{size} members</option>
              ))}
            </select>
            {errors.maxMembers && <p className="mt-1 text-sm text-error">{errors.maxMembers}</p>}
          </div>
        );

      case 3:
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Select Team Tags <span className="text-gray-400 text-sm">(optional)</span></h3>
            <TagSelector
              onTagsSelected={handleTagSelection}
              selectedTags={formData.selectedTags}
            />
            {errors.tags && <p className="text-error text-sm mt-2">{errors.tags}</p>}
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
      {renderStepIndicator()}
      {submitError && <Alert type="error" message={submitError} />}
      <form onSubmit={handleSubmit} className="space-y-8">
        {renderStepContent()}

        <div className="flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="btn btn-outline flex items-center"
            >
              <FiChevronLeft className="mr-1" /> Back
            </button>
          ) : <div></div>}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={isSubmitting}
              className="btn btn-primary flex items-center"
            >
              Next <FiChevronRight className="ml-1" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Team'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TeamCreationForm;