import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import axios from 'axios';
import TagSelector from '../tags/TagSelector';
import Alert from '../common/Alert';
import { teamService } from '../../services/teamService';
import TeamDetailsModal from './TeamDetailsModal';
import IconToggle from '../common/IconToggle';

const TeamCreationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false, // Changed default to false (hidden)
    maxMembers: 5,
    selectedTags: [],
    teamImage: null
  });
  const [imagePreview, setImagePreview] = useState(null);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        teamImage: file
      });
      
      // For preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagSelection = useCallback((selectedTags) => {
    console.log("Team Creation - Tags selected:", selectedTags);
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
      console.log("Form validation errors:", formErrors);
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {

      console.log("Starting team creation with image:", formData.teamImage ? "Image selected" : "No image");
      // Ensure tag IDs are valid integers
      const formattedTags = formData.selectedTags.map(tagId => {
        const numericId = parseInt(tagId, 10);
        console.log(`Converting tag ID ${tagId} to numeric: ${numericId}`);
        return { tag_id: numericId };
      });
      
      // Create the team data object
      const submissionData = {
        name: formData.name,
        description: formData.description,
        is_public: formData.isPublic,
        max_members: formData.maxMembers,
        tags: formattedTags,
      };

        console.log("Initial submission data:", submissionData);

          // Upload image to Cloudinary if one is selected
      if (formData.teamImage) {
        console.log("Preparing to upload image to Cloudinary");
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', formData.teamImage);
        cloudinaryFormData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

 console.log("Cloudinary upload preset:", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      console.log("Cloudinary cloud name:", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

      try {
        const cloudinaryResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          cloudinaryFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        console.log("Cloudinary upload success:", cloudinaryResponse.data);

        submissionData.teamavatar_url = cloudinaryResponse.data.secure_url;
        console.log("Team data with avatar URL:", submissionData);
      } catch (cloudinaryError) {
        console.error("Cloudinary upload failed:", cloudinaryError);
        console.error("Response:", cloudinaryError.response?.data);
        // Continue with team creation without the avatar
      }
    }

       console.log("Final submission data before API call:", submissionData);
      
    
      
    const response = await teamService.createTeam(submissionData);
    console.log("Team creation response:", response);
      
      setNewTeamId(response.data.id);
      setSubmitSuccess(true);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Team creation error:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Response data:', error.response?.data);
      
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

        {/* Team Image Upload */}
        <div className="mb-6 flex justify-center">
          <div className="avatar">
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer border relative overflow-hidden">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Team Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400">Team Image</span>
              )}
            </div>
          </div>
        </div>

                <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Team Image (Optional)
          </label>
          <input
            type="file"
            onChange={handleImageChange}
            className="file-input file-input-bordered w-full"
            accept="image/*"
          />
        </div>

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
          {/* IconToggle switch to choose visibility */}
          <IconToggle
  name="isPublic"
  checked={formData.isPublic}
  onChange={handleChange}
  title="Team Visibility"
  entityType="team"
  className="toggle-visibility"
/>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Add Topic Tags (Optional)
          </label>
          <TagSelector 
            onTagsSelected={handleTagSelection} 
            selectedTags={formData.selectedTags} 
          />
          {import.meta.env.DEV && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Debug: Selected tag IDs: {formData.selectedTags.join(', ')}</p>
            </div>
          )}
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