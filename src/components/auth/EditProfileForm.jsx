import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import TagSelector from '../tags/TagSelector';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Input from '../common/Input';
import FormGroup from '../common/FormGroup';

const EditProfileForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    postalCode: '',
    selectedTags: [],
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Populate form with existing user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        bio: user.bio || '',
        postalCode: user.postalCode || '',
        selectedTags: user.tags?.map(tag => tag.id) || [],
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagSelection = (selectedTags) => {
    setFormData(prev => ({
      ...prev,
      selectedTags
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Prepare submission data
      const submissionData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        bio: formData.bio,
        postal_code: formData.postalCode,
        tags: formData.selectedTags.map(tagId => ({ 
          tag_id: parseInt(tagId, 10) 
        }))
      };

      // Update user via service
      const response = await userService.updateUser(user.id, submissionData);

      // Show success notification
      setNotification({
        type: 'success',
        message: 'Profile updated successfully!'
      });

      // Optionally navigate back to profile or update context
      setTimeout(() => navigate('/profile'), 1500);

    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-primary mb-6">
            Edit Profile
          </h2>

          {notification && (
            <Alert 
              type={notification.type} 
              message={notification.message} 
              onClose={() => setNotification(null)}
            />
          )}

          {error && (
            <Alert 
              type="error" 
              message={error} 
              onClose={() => setError(null)}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="First Name">
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                />
              </FormGroup>

              <FormGroup label="Last Name">
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                />
              </FormGroup>
            </div>

            <FormGroup label="Email" disabled>
              <Input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                disabled
              />
            </FormGroup>

            <FormGroup label="Bio">
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="textarea textarea-bordered w-full"
                placeholder="Tell us about yourself"
                rows="4"
              />
            </FormGroup>

            <FormGroup label="Postal Code">
              <Input
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Your Postal Code"
              />
            </FormGroup>

            <FormGroup label="Skills & Interests">
              <TagSelector
                selectedTags={formData.selectedTags}
                onTagsSelected={handleTagSelection}
              />
            </FormGroup>

            <div className="flex justify-end space-x-4 mt-6">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileForm;