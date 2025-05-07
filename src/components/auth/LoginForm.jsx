import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../common/Card';
import Button from '../common/Button';
import FormGroup from '../common/FormGroup';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
    
    try {
      const result = await login(formData);
      
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
    <div className="max-w-md mx-auto w-full">
      <Card>
        <h2 className="text-2xl font-bold text-center text-primary mb-6">Login</h2>
        
        {errors.form && (
          <div className="alert alert-error mb-6">
            <span>{errors.form}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <FormGroup
            label="Email"
            htmlFor="email"
            error={errors.email}
            required
          >
            <input
              id="email"
              type="email"
              name="email"
              placeholder="email@example.com"
              className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={handleChange}
            />
          </FormGroup>
          
          <FormGroup
            label="Password"
            htmlFor="password"
            error={errors.password}
            required
          >
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              className={`input input-bordered w-full ${errors.password ? 'input-error' : ''}`}
              value={formData.password}
              onChange={handleChange}
            />
          </FormGroup>
          
          <div className="mt-6">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </div>
        </form>
        
        <div className="divider my-6">OR</div>
        
        <div className="text-center">
          <p className="mb-2">Don't have an account?</p>
          <Link to="/register" className="link link-primary">Register</Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginForm;