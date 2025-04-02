import React, { useState } from 'react';
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import TagSelector from '../tags/TagSelector';

// Placeholder for TagSelector - replace with your actual implementation
const TagSelector = ({ onTagsSelected, selectedTags }) => {
  const [localSelectedTags, setLocalSelectedTags] = useState(selectedTags || []);
  const [experienceLevels, setExperienceLevels] = useState({});
  const [interestLevels, setInterestLevels] = useState({});

  const handleTagSelection = (tagId) => {
    const newSelectedTags = localSelectedTags.includes(tagId)
      ? localSelectedTags.filter(id => id !== tagId)
      : [...localSelectedTags, tagId];
    
    setLocalSelectedTags(newSelectedTags);
    
    // Default levels if not set
    const newExperienceLevels = { ...experienceLevels };
    const newInterestLevels = { ...interestLevels };
    
    if (!newExperienceLevels[tagId]) {
      newExperienceLevels[tagId] = 'beginner';
    }
    
    if (!newInterestLevels[tagId]) {
      newInterestLevels[tagId] = 'medium';
    }
    
    setExperienceLevels(newExperienceLevels);
    setInterestLevels(newInterestLevels);
    
    onTagsSelected(newSelectedTags, newExperienceLevels, newInterestLevels);
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-4">Select Tags (Placeholder)</h3>
      <div className="space-y-2">
        {['Technology', 'Design', 'Marketing', 'Writing'].map(tag => (
          <div key={tag} className="flex items-center">
            <input 
              type="checkbox"
              id={tag}
              checked={localSelectedTags.includes(tag)}
              onChange={() => handleTagSelection(tag)}
              className="mr-2"
            />
            <label htmlFor={tag}>{tag}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

// Placeholder for navigation and authentication
const navigateTo = (path) => {
  console.log(`Navigating to: ${path}`);
  // Replace with actual navigation logic
};

const registerUser = async (userData) => {
  try {
    console.log('Registering user:', userData);
    // Replace with actual registration logic
    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Registration failed' };
  }
};

const RegisterForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    bio: '',
    postal_code: '',
    profile_image: null,
    selectedTags: [],
    tagExperienceLevels: {},
    tagInterestLevels: {}
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateStep = () => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.username) {
          newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
          newErrors.username = 'Username must be at least 3 characters';
        }
        
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Email is invalid';
        }
        
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
      
      case 2:
        if (!formData.first_name) {
          newErrors.first_name = 'First name is required';
        }
        
        if (!formData.last_name) {
          newErrors.last_name = 'Last name is required';
        }
        
        if (!formData.postal_code) {
          newErrors.postal_code = 'Postal code is required';
        }
        break;
      
      case 3:
        if (formData.selectedTags.length === 0) {
          newErrors.tags = 'Please select at least one tag';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'profile_image' && files) {
      setFormData(prev => ({
        ...prev,
        profile_image: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTagSelection = (selectedTags, experienceLevels, interestLevels) => {
    setFormData(prev => ({
      ...prev,
      selectedTags,
      tagExperienceLevels: experienceLevels,
      tagInterestLevels: interestLevels
    }));
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (validateStep()) {
      setIsSubmitting(true);
      
      // Prepare form data for submission
      const submissionData = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'profile_image' && formData[key]) {
          submissionData.append('profile_image', formData[key]);
        } else if (key === 'selectedTags') {
          // Append tags with their levels
          formData.selectedTags.forEach(tagId => {
            submissionData.append('tags[]', JSON.stringify({
              tag_id: tagId,
              experience_level: formData.tagExperienceLevels[tagId] || 'beginner',
              interest_level: formData.tagInterestLevels[tagId] || 'medium'
            }));
          });
        } else if (key !== 'confirmPassword' && key !== 'tagExperienceLevels' && key !== 'tagInterestLevels') {
          submissionData.append(key, formData[key]);
        }
      });
      
      try {
        const result = await registerUser(submissionData);
        
        if (result.success) {
          navigateTo('/profile');
        } else {
          setErrors({ form: result.message });
        }
      } catch (error) {
        setErrors({ form: 'An unexpected error occurred. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center space-x-2 mb-6">
      {[1, 2, 3, 4].map(s => (
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
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                name="username"
                placeholder="username"
                className={`input input-bordered ${errors.username ? 'input-error' : ''}`}
                value={formData.username}
                onChange={handleChange}
              />
              {errors.username && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.username}</span>
                </label>
              )}
            </div>
            
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="email@example.com"
                className={`input input-bordered ${errors.email ? 'input-error' : ''}`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.email}</span>
                </label>
              )}
            </div>
            
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className={`input input-bordered ${errors.password ? 'input-error' : ''}`}
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.password}</span>
                </label>
              )}
            </div>
            
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                className={`input input-bordered ${errors.confirmPassword ? 'input-error' : ''}`}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.confirmPassword}</span>
                </label>
              )}
            </div>
          </>
        );
      
      case 2:
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  className={`input input-bordered ${errors.first_name ? 'input-error' : ''}`}
                  value={formData.first_name}
                  onChange={handleChange}
                />
                {errors.first_name && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.first_name}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  className={`input input-bordered ${errors.last_name ? 'input-error' : ''}`}
                  value={formData.last_name}
                  onChange={handleChange}
                />
                {errors.last_name && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.last_name}</span>
                  </label>
                )}
              </div>
            </div>
            
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input
                type="text"
                name="postal_code"
                placeholder="Postal Code"
                className={`input input-bordered ${errors.postal_code ? 'input-error' : ''}`}
                value={formData.postal_code}
                onChange={handleChange}
              />
              {errors.postal_code && (
                <label className="label">
                  <span className="label-text-alt text-error">{errors.postal_code}</span>
                </label>
              )}
            </div>
            
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Bio (Optional)</span>
              </label>
              <textarea
                name="bio"
                placeholder="Tell us about yourself"
                className="textarea textarea-bordered h-24"
                value={formData.bio}
                onChange={handleChange}
              ></textarea>
            </div>
            
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Profile Picture (Optional)</span>
              </label>
              <input
                type="file"
                name="profile_image"
                onChange={handleChange}
                accept="image/*"
                className="file-input file-input-bordered w-full"
              />
            </div>
          </>
        );
      
      case 3:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Your Interests & Skills</h3>
            <TagSelector 
              onTagsSelected={handleTagSelection}
              selectedTags={formData.selectedTags}
            />
            {errors.tags && (
              <p className="text-error text-sm mt-2">{errors.tags}</p>
            )}
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Review Your Profile</h3>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Account Details</h4>
              <p><strong>Username:</strong> {formData.username}</p>
              <p><strong>Email:</strong> {formData.email}</p>
            </div>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Personal Information</h4>
              <p><strong>Name:</strong> {formData.first_name} {formData.last_name}</p>
              <p><strong>Postal Code:</strong> {formData.postal_code}</p>
              {formData.bio && <p><strong>Bio:</strong> {formData.bio}</p>}
              {formData.profile_image && (
                <div>
                  <strong>Profile Picture:</strong>
                  <img 
                    src={URL.createObjectURL(formData.profile_image)} 
                    alt="Profile" 
                    className="w-32 h-32 object-cover rounded-full mt-2"
                  />
                </div>
              )}
            </div>
            
            <div className="bg-base-200 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Interests & Skills</h4>
              <div className="flex flex-wrap gap-2">
                {formData.selectedTags.map(tagId => (
                  <span 
                    key={tagId} 
                    className="badge badge-primary badge-outline"
                  >
                    {tagId} 
                    <span className="text-xs ml-1">
                      (Exp: {formData.tagExperienceLevels[tagId] || 'N/A'}, 
                      Interest: {formData.tagInterestLevels[tagId] || 'N/A'})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderNavButtons = () => {
    return (
      <div className="flex justify-between mt-6">
        {step > 1 && step < 4 && (
          <button 
            type="button"
            onClick={prevStep}
            className="btn btn-ghost"
          >
            <FiChevronLeft className="mr-2" /> Previous
          </button>
        )}
        
        {step < 3 && (
          <button 
            type="button"
            onClick={nextStep}
            className="btn btn-primary ml-auto"
          >
            Next <FiChevronRight className="ml-2" />
          </button>
        )}
        
        {step === 3 && (
          <button 
            type="button"
            onClick={nextStep}
            className="btn btn-primary ml-auto"
          >
            Review <FiChevronRight className="ml-2" />
          </button>
        )}
        
        {step === 4 && (
          <div className="flex space-x-2">
            <button 
              type="button"
              onClick={() => setStep(3)}
              className="btn btn-ghost"
            >
              <FiChevronLeft className="mr-2" /> Edit
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
            >
              {isSubmitting ? 'Creating Account...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card bg-base-100 shadow-xl mx-auto max-w-md w-full">
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold text-center">Create Account</h2>
        
        {errors.form && (
          <div className="alert alert-error mt-4">
            <span>{errors.form}</span>
          </div>
        )}
        
        <form className="mt-4">
          {renderStepIndicator()}
          {renderStepContent()}
          {renderNavButtons()}
        </form>
        
        <div className="divider mt-6">OR</div>
        
        <div className="text-center">
          <p>Already have an account?</p>
          <a href="/login" className="link link-primary">Login</a>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;