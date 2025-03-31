import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    bio: '',
    postal_code: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
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
    
    setErrors(newErrors);
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
    
    // Remove confirmPassword as it's not needed for the API
    const { confirmPassword, ...userData } = formData;
    
    try {
      const result = await register(userData);
      
      if (result.success) {
        navigate('/profile');
      } else {
        setErrors({ form: result.message });
      }
    } catch (error) {
      setErrors({ form: 'An unexpected error occurred. Please try again.' });
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
        
        <form onSubmit={handleSubmit} className="mt-4">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">First Name</span>
              </label>
              <input
                type="text"
                name="first_name"
                placeholder="First Name"
                className="input input-bordered"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Last Name</span>
              </label>
              <input
                type="text"
                name="last_name"
                placeholder="Last Name"
                className="input input-bordered"
                value={formData.last_name}
                onChange={handleChange}
              />
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
              className="input input-bordered"
              value={formData.postal_code}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text">Bio</span>
            </label>
            <textarea
              name="bio"
              placeholder="Tell us about yourself"
              className="textarea textarea-bordered h-24"
              value={formData.bio}
              onChange={handleChange}
            ></textarea>
          </div>
          
          <div className="form-control mt-6">
            <button 
              type="submit" 
              className={`btn btn-primary ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Register'}
            </button>
          </div>
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