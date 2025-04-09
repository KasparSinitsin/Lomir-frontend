import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import TagSelector from '../tags/TagSelector';
import api from '../../services/api';

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

  const validateForm = () => {
    const newErrors = {};
    // ... your validation logic ...
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const nextStep = () => {
    if (validateForm()) {
      setStep(prevStep => prevStep + 1);
    }
  };

  const prevStep = () => {
    setStep(prevStep => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitFormData = new FormData();
    // ... your form submission logic ...

    try {
      const response = await api.post('/auth/register', submitFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // ... handle success ...
      navigate('/login');
    } catch (error) {
      // ... handle error ...
      setErrors(prev => ({ ...prev, form: error.response?.data?.message || 'Registration failed.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // *** NEW FUNCTION DEFINITIONS ***

  const renderStepIndicator = () => {
    // Replace this with your actual step indicator UI
    const stepLabels = ['Basic Info', 'Profile', 'Tags', 'Confirm'];
    return (
      <div className="steps">
        {stepLabels.map((label, index) => (
          <div key={index} className={`step ${step === index + 1 ? 'step-primary' : ''}`}>
            {label}
          </div>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                placeholder="Username"
                className="input input-bordered w-full"
                value={formData.username}
                onChange={handleChange}
                name="username"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="Email"
                className="input input-bordered w-full"
                value={formData.email}
                onChange={handleChange}
                name="email"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="Password"
                className="input input-bordered w-full"
                value={formData.password}
                onChange={handleChange}
                name="password"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                placeholder="Confirm Password"
                className="input input-bordered w-full"
                value={formData.confirmPassword}
                onChange={handleChange}
                name="confirmPassword"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">First Name</span>
              </label>
              <input
                type="text"
                placeholder="First Name"
                className="input input-bordered w-full"
                value={formData.first_name}
                onChange={handleChange}
                name="first_name"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Last Name</span>
              </label>
              <input
                type="text"
                placeholder="Last Name"
                className="input input-bordered w-full"
                value={formData.last_name}
                onChange={handleChange}
                name="last_name"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Bio</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Bio"
                value={formData.bio}
                onChange={handleChange}
                name="bio"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input
                type="text"
                placeholder="Postal Code"
                className="input input-bordered w-full"
                value={formData.postal_code}
                onChange={handleChange}
                name="postal_code"
              />
            </div>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Profile Image</span>
              </label>
              <input
                type="file"
                className="file-input file-input-bordered w-full"
                onChange={(e) => setFormData({ ...formData, profile_image: e.target.files[0] })}
                name="profile_image"
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <TagSelector
              selectedTags={formData.selectedTags}
              onTagChange={(tags) => setFormData({ ...formData, selectedTags: tags })}
              tagExperienceLevels={formData.tagExperienceLevels}
              onExperienceLevelChange={(tagId, level) =>
                setFormData({
                  ...formData,
                  tagExperienceLevels: {
                    ...formData.tagExperienceLevels,
                    [tagId]: level
                  }
                })
              }
              tagInterestLevels={formData.tagInterestLevels}
              onInterestLevelChange={(tagId, level) =>
                setFormData({
                  ...formData,
                  tagInterestLevels: {
                    ...formData.tagInterestLevels,
                    [tagId]: level
                  }
                })
              }
            />
          </div>
        );
      case 4:
        return (
          <div>
            <h3>Confirm Your Information</h3>
            <p>Please review your details before submitting.</p>
            <p>Username: {formData.username}</p>
            <p>Email: {formData.email}</p>
            {/* ... Display other form data ... */}
          </div>
        );
      default:
        return <div>Unknown Step Content</div>;
    }
  };

  const renderNavButtons = () => {
    return (
      <div className="mt-8 flex justify-between">
        {step > 1 && (
          <button type="button" className="btn btn-outline" onClick={prevStep}>
            <FiChevronLeft className="mr-2" />
            Previous
          </button>
        )}
        {step < 4 && (
          <button type="button" className="btn btn-primary" onClick={nextStep}>
            Next
            <FiChevronRight className="ml-2" />
          </button>
        )}
        {step === 4 && (
          <button type="submit" className="btn btn-primary">
            {isSubmitting ? 'Submitting...' : 'Sign Up'}
          </button>
        )}
      </div>
    );
  };

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