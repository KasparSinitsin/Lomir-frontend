import axios from 'axios';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TagSelector from '../tags/TagSelector';
import api from '../../services/api';

const RegisterForm = () => {
  const navigate = useNavigate();
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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username) {
      newErrors.username = 'Username is required';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
  
    setIsSubmitting(true);

    try {
      // If profile image exists, upload to Cloudinary first
      let avatarUrl = null;
      if (formData.profile_image) {
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', formData.profile_image);
        cloudinaryFormData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
        const cloudinaryResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, 
          cloudinaryFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      
        avatarUrl = cloudinaryResponse.data.secure_url;
      }
  
      // Prepare registration data
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        bio: formData.bio || '',
        postal_code: formData.postal_code || '',
        avatar_url: avatarUrl,
        tags: formData.selectedTags.length > 0 
          ? formData.selectedTags.map(tagId => ({
              tag_id: tagId,
              experience_level: formData.tagExperienceLevels[tagId] || 'beginner',
              interest_level: formData.tagInterestLevels[tagId] || 'medium'
            }))
          : []
      };
  
      const response = await api.post('/auth/register', registrationData);
      
      console.log('Registration successful', response.data);
      localStorage.setItem('token', response.data.data.token);
      navigate('/login');
    } catch (error) {
      console.error('Full Registration error:', error);
      setErrors(prev => ({ 
        ...prev, 
        form: error.response?.data?.message || 'Registration failed.' 
      }));
    } finally {
      setIsSubmitting(false);
    }
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

        <form className="mt-4" onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Username</span></label>
            <input type="text" placeholder="Username" className={`input input-bordered w-full ${errors.username ? 'input-error' : ''}`} value={formData.username} onChange={handleChange} name="username" />
            {errors.username && <label className="label"><span className="label-text-alt text-red-500">{errors.username}</span></label>}
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Email</span></label>
            <input type="email" placeholder="Email" className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`} value={formData.email} onChange={handleChange} name="email" />
            {errors.email && <label className="label"><span className="label-text-alt text-red-500">{errors.email}</span></label>}
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Password</span></label>
            <input type="password" placeholder="Password" className={`input input-bordered w-full ${errors.password ? 'input-error' : ''}`} value={formData.password} onChange={handleChange} name="password" />
            {errors.password && <label className="label"><span className="label-text-alt text-red-500">{errors.password}</span></label>}
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Confirm Password</span></label>
            <input type="password" placeholder="Confirm Password" className={`input input-bordered w-full ${errors.confirmPassword ? 'input-error' : ''}`} value={formData.confirmPassword} onChange={handleChange} name="confirmPassword" />
            {errors.confirmPassword && <label className="label"><span className="label-text-alt text-red-500">{errors.confirmPassword}</span></label>}
          </div>

          {/* Profile Details */}
          <div className="form-control w-full">
            <label className="label"><span className="label-text">First Name</span></label>
            <input type="text" placeholder="First Name" className="input input-bordered w-full" value={formData.first_name} onChange={handleChange} name="first_name" />
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Last Name</span></label>
            <input type="text" placeholder="Last Name" className="input input-bordered w-full" value={formData.last_name} onChange={handleChange} name="last_name" />
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Bio</span></label>
            <textarea className="textarea textarea-bordered w-full" placeholder="Bio" value={formData.bio} onChange={handleChange} name="bio" />
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Postal Code</span></label>
            <input type="text" placeholder="Postal Code" className="input input-bordered w-full" value={formData.postal_code} onChange={handleChange} name="postal_code" />
          </div>
          <div className="form-control w-full">
            <label className="label"><span className="label-text">Profile Image</span></label>
            <input type="file" className="file-input file-input-bordered w-full" onChange={(e) => setFormData({ ...formData, profile_image: e.target.files[0] })} name="profile_image" />
          </div>

          {/* Tags */}
          <TagSelector
            selectedTags={formData.selectedTags}
            onTagChange={(tags) => setFormData({ ...formData, selectedTags: tags })}
            tagExperienceLevels={formData.tagExperienceLevels}
            onExperienceLevelChange={(tagId, level) => setFormData({ ...formData, tagExperienceLevels: { ...formData.tagExperienceLevels, [tagId]: level } })}
            tagInterestLevels={formData.tagInterestLevels}
            onInterestLevelChange={(tagId, level) => setFormData({ ...formData, tagInterestLevels: { ...formData.tagInterestLevels, [tagId]: level } })}
          />
          <p className="text-sm mt-2">You can add skills and interests tags later.</p>

          <button type="submit" className="btn btn-primary mt-8">
            {isSubmitting ? 'Signing Up...' : 'Sign Up'}
          </button>
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