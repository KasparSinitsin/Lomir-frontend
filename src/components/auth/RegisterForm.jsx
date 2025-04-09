import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import TagSelector from '../tags/TagSelector';
import api from '../../services/api';  // Ensure you have this import

const RegisterForm = () => {
  const navigate = useNavigate();
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

  // ... rest of your existing methods remain the same ...

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const submitFormData = new FormData();
    
    // Append basic fields
    submitFormData.append('username', formData.username);
    submitFormData.append('email', formData.email);
    submitFormData.append('password', formData.password);
    submitFormData.append('first_name', formData.first_name);
    submitFormData.append('last_name', formData.last_name);
    submitFormData.append('bio', formData.bio || '');
    submitFormData.append('postal_code', formData.postal_code);
    
    // Correctly handle profile image
    if (formData.profile_image) {
      submitFormData.append('avatar', formData.profile_image);
    }
    
    // Properly append tags
    const tags = formData.selectedTags.map(tagId => ({
      tag_id: tagId,
      experience_level: formData.tagExperienceLevels[tagId] || 'beginner',
      interest_level: formData.tagInterestLevels[tagId] || 'medium'
    }));

    if (tags.length > 0) {
      submitFormData.append('tags', JSON.stringify(tags));
    }

    try {
      const response = await api.post('/auth/register', submitFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Handle successful registration
      console.log('Registration successful', response.data);
      
      // Optional: Store token or user data
      localStorage.setItem('token', response.data.data.token);
      
      // Navigate to login or dashboard
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error.response ? error.response.data : error);
      
      // Set form-level error
      setErrors(prev => ({
        ...prev,
        form: error.response?.data?.message || 'Registration failed. Please try again.'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // The rest of your component remains exactly the same as in the previous version

  return (
    <div className="card bg-base-100 shadow-xl mx-auto max-w-md w-full">
      <div className="card-body">
        <h2 className="card-title text-2xl font-bold text-center">Create Account</h2>
        
        {/* Debug information */}
        <div className="alert alert-info mb-4">
          Current Step: {step}
        </div>
        
        {errors.form && (
          <div className="alert alert-error mt-4">
            <span>{errors.form}</span>
          </div>
        )}
        
        <form 
          className="mt-4" 
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 4) {
              handleSubmit(e);
            } else {
              nextStep();
            }
          }}
        >
          {renderStepIndicator()}
          {renderStepContent()}
          {renderNavButtons()}
        </form>
        
        <div className="divider mt-6">OR</div>
        
        <div className="text-center">
          <p>Already have an account?</p>
          <Link to="/login" className="link link-primary">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;