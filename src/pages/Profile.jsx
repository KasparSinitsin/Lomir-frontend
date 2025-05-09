import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/layout/PageContainer';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataDisplay from '../components/common/DataDisplay';
import Alert from '../components/common/Alert';
import { Mail, MapPin, User, Edit } from 'lucide-react';
import { tagService } from '../services/tagService';
import { userService } from '../services/userService';
import BadgeCard from '../components/badges/BadgeCard'; 
import TagSelector from '../components/tags/TagSelector';
import IconToggle from '../components/common/IconToggle';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [tags, setTags] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    postalCode: '',
    isPublic: true,
    profileImage: null
  });
  // Add a flag to track if initial data load has happened
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // Fetch user details as a callback that doesn't re-create on each render
  const fetchUserDetails = useCallback(async () => {
    if (!user || !user.id || initialDataLoaded) return;
    
    try {
      setLoading(true);
      console.log("Fetching user details for ID:", user.id);
      const response = await userService.getUserById(user.id);
      
      if (response && response.data) {
        const apiUserData = response.data;
        console.log("API returned user data:", apiUserData);
        
        // Avoid updating the user context here - that's causing the loop
        // Instead, just use the API data to update the form
        
        // Update form data directly from API response
        setFormData({
          firstName: apiUserData.firstName || apiUserData.first_name || '',
          lastName: apiUserData.lastName || apiUserData.last_name || '',
          bio: apiUserData.bio || '',
          postalCode: apiUserData.postalCode || apiUserData.postal_code || '',
          isPublic: apiUserData.isPublic !== undefined ? apiUserData.isPublic : 
                   (apiUserData.is_public !== undefined ? apiUserData.is_public : true),
          profileImage: null
        });
        
        // Set image preview if available
        if (apiUserData.avatarUrl || apiUserData.avatar_url) {
          setImagePreview(apiUserData.avatarUrl || apiUserData.avatar_url);
        }
        
        // Mark initial data as loaded
        setInitialDataLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      setError("Failed to load user data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, initialDataLoaded]); // Only depend on user and initialDataLoaded

  useEffect(() => {
    const message = localStorage.getItem('registrationMessage');
    if (message) {
      setRegistrationMessage(message);
      localStorage.removeItem('registrationMessage');
    }

    // Fetch user details only if we haven't loaded initial data yet
    if (user && !initialDataLoaded) {
      fetchUserDetails();
    }

    // Initialize form data from context if available and we haven't loaded from API yet
    if (user && !initialDataLoaded) {
      console.log("Initializing form with user data from context:", user);
      
      setFormData({
        firstName: user.first_name || user.firstName || '',
        lastName: user.last_name || user.lastName || '',
        bio: user.bio || '',
        postalCode: user.postal_code || user.postalCode || '',
        isPublic: user.is_public !== undefined ? user.is_public : 
                 (user.isPublic !== undefined ? user.isPublic : true),
        profileImage: null
      });
      
      // Set image preview if available
      if (user.avatar_url || user.avatarUrl) {
        setImagePreview(user.avatar_url || user.avatarUrl);
      }
    }

    const fetchTags = async () => {
      try {
        const structuredTags = await tagService.getStructuredTags();
        setTags(structuredTags);
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    const fetchUserTags = async () => {
      if (user) {
        try {
          const userTagsResponse = await userService.getUserTags(user.id);
          setSelectedTags(userTagsResponse.data.map(tag => tag.id));
        } catch (error) {
          console.error('Error fetching user tags:', error);
        }
      }
    };

    fetchTags();
    fetchUserTags();
  }, [user, initialDataLoaded, fetchUserDetails]); // Add initialDataLoaded and fetchUserDetails to dependencies

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    console.log(`Field "${name}" changed to:`, newValue);
    setFormData(prevData => ({
      ...prevData,
      [name]: newValue
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prevData => ({
        ...prevData,
        profileImage: file
      }));
      
      // For preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTagsUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      await userService.updateUserTags(user.id, selectedTags);
      setSuccess('Tags updated successfully');
    } catch (error) {
      console.error('Error updating user tags:', error);
      setError('Failed to update tags. Please try again.');
    } finally {
      setLoading(false);
    }
  };

const handleProfileUpdate = async () => {
  if (!user) return;
  
  try {
    setLoading(true);
    setError(null);
    
    console.log("Starting profile update with form data:", formData);
    
    // Convert form data to the format expected by the API
    const userData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      bio: formData.bio,
      postal_code: formData.postalCode,
      is_public: formData.isPublic  // Ensure this is correctly passed
    };
    
    console.log("Sending update with data:", userData);
    
    // Upload image if selected
    if (formData.profileImage) {
      // Image upload code remains the same
    }
    
    const response = await userService.updateUser(user.id, userData);
    
    console.log("Update response:", response);
    
    if (!response || response.success === false) {
      console.error("Update failed:", response?.message || "No response received");
      setError('Failed to update profile: ' + (response?.message || "Unknown error"));
    } else {
      setIsEditing(false);
      setSuccess('Profile updated successfully');
      
      // Update user data in context with the new data
      if (response.data) {
        console.log("New user data from API:", response.data);
        
        // Create a new user object that has both snake_case and camelCase properties
        const updatedUser = {
          ...user,
          // Snake_case properties from API
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          postal_code: response.data.postal_code,
          avatar_url: response.data.avatar_url,
          is_public: response.data.is_public,
          bio: response.data.bio,
          // Add camelCase versions for consistency
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          postalCode: response.data.postal_code,
          avatarUrl: response.data.avatar_url,
          isPublic: response.data.is_public
        };
        
        // Update the global user context
        updateUser(updatedUser);
        
        // Reset form data with updated values
        setFormData(prev => ({
          ...prev,
          firstName: response.data.first_name || '',
          lastName: response.data.last_name || '',
          bio: response.data.bio || '',
          postalCode: response.data.postal_code || '',
          isPublic: response.data.is_public !== undefined ? response.data.is_public : true,
          profileImage: null
        }));
      }
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    setError('Failed to update profile: ' + (error.message || 'Unknown error'));
  } finally {
    setLoading(false);
  }
};

  // Manual refresh for debugging purposes
  const handleManualRefresh = () => {
    setInitialDataLoaded(false); // Reset the flag to allow a new fetch
    fetchUserDetails(); // Manually trigger a refresh
  };

  // For debugging purposes
  const displayUserData = () => {
    if (!user) return "No user data available";
    
    return (
      <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
        {JSON.stringify(user, null, 2)}
      </pre>
    );
  };

  const displayFormData = () => {
    return (
      <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
        {JSON.stringify(formData, null, 2)}
      </pre>
    );
  };

  if (!user) {
    return (
      <PageContainer>
        <div className="w-full max-w-lg mx-auto">
          <Card>
            <div className="text-center p-4">
              <h2 className="text-xl font-semibold text-error mb-4">User Not Found</h2>
              <p className="mb-6">Please login again to access your profile.</p>
              <Link to="/login" className="btn btn-primary">Go to Login</Link>
            </div>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="space-y-6">
      {registrationMessage && (
        <Alert
          type="success"
          message={registrationMessage}
          onClose={() => setRegistrationMessage('')}
        />
      )}
      
      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}
      
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      
      {/* Debug section - keep this in development for troubleshooting */}
      {import.meta.env.DEV && (
        <Card className="mb-4">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Debug User Data</h3>
            {displayUserData()}
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Debug Form Data</h3>
              {displayFormData()}
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Debug State</h3>
              <p>Initial Data Loaded: {initialDataLoaded ? 'Yes' : 'No'}</p>
              <p>Is Editing: {isEditing ? 'Yes' : 'No'}</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleManualRefresh}
              >
                Manual Refresh
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-visible">
        {isEditing ? (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
            
            <div className="mb-6 flex justify-top">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-24 h-24 relative">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile" 
                      className="rounded-full object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-3xl">
                      {formData.firstName?.charAt(0) || 
                       user.firstName?.charAt(0) || 
                       user.first_name?.charAt(0) ||
                       user.username?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Profile Image</span>
              </label>
              <input 
                type="file" 
                className="file-input file-input-bordered w-full" 
                onChange={handleImageChange} 
                accept="image/*"
              />
            </div>
            
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">First Name</span>
              </label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleChange} 
                className="input input-bordered w-full" 
                placeholder="First Name"
              />
            </div>
            
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Last Name</span>
              </label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange} 
                className="input input-bordered w-full" 
                placeholder="Last Name"
              />
            </div>
            
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">About Me</span>
              </label>
              <textarea 
                name="bio" 
                value={formData.bio} 
                onChange={handleChange} 
                className="textarea textarea-bordered w-full" 
                placeholder="Tell us about yourself"
                rows="4"
              />
            </div>
            
            <div className="form-control w-full mb-4">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input 
                type="text" 
                name="postalCode" 
                value={formData.postalCode} 
                onChange={handleChange} 
                className="input input-bordered w-full" 
                placeholder="Postal Code"
              />
            </div>
            
            {/* Profile visibility toggle */}
            <div className="form-control w-full mb-6">
              <IconToggle
                name="isPublic"
                checked={formData.isPublic}
                onChange={handleChange}
                title="Profile Visibility" 
                entityType="profile"
                visibleLabel="Visible to Everyone"
                hiddenLabel="Private Profile"
                visibleDescription="Your profile will be discoverable by other users"
                hiddenDescription="Your profile will be hidden from search results"
                className="toggle-visibility"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="ghost" 
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="button"
                variant="primary" 
                onClick={handleProfileUpdate}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row md:items-top p-6">
              <div className="mb-6 md:mb-0 md:mr-8">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-24 h-24">
                    {user.avatarUrl || user.avatar_url ? (
                      <img 
                        src={user.avatarUrl || user.avatar_url} 
                        alt="Profile" 
                        className="rounded-full object-cover w-full h-full" 
                      />
                    ) : (
                      <span className="text-3xl">
                        {user.firstName?.charAt(0) || 
                         user.first_name?.charAt(0) ||
                         user.username?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}
                    </h2>
                    <p className="text-base-content/70">@{user.username}</p>
                    {/* Display profile visibility status */}
<div className="mt-1">
  <span className={`badge ${(user.isPublic === true || user.is_public === true) ? 'badge-success' : 'badge-warning'} badge-sm`}>
    {(user.isPublic === true || user.is_public === true) ? 'Public Profile' : 'Private Profile'}
  </span>
</div>
                  </div>
                  <div className="mt-4 sm:mt-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      icon={<Edit size={16} />}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>


                <Grid cols={1} md={3} gap={4}>
                  <DataDisplay label="Email" value={user.email} icon={<Mail size={16} />} />
                  {(user.postalCode || user.postal_code) && (
                    <DataDisplay 
                      label="Location" 
                      value={user.postalCode || user.postal_code} 
                      icon={<MapPin size={16} />} 
                    />
                  )}
                  <DataDisplay label="Member Since" value="April 2025" icon={<User size={16} />} />
                </Grid>
              </div>
            </div>

            {(user.bio) && (
              <Section title="About Me" className="px-6">
                <p className="text-base-content/90">{user.bio}</p>
              </Section>
            )}

            <Section
              title="My Skills & Interests"
              className="px-6"
              action={
                !isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-violet-200 hover:text-violet-700"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Skills & Interest Tags
                  </Button>
                ) : null
              }
            >
              {!isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.length > 0 ? (
                    selectedTags.map((tagId) => {
                      const tag = tags
                        .flatMap(supercat => supercat.categories)
                        .flatMap(cat => cat.tags)
                        .find(t => t.id === tagId);
                      return tag ? (
                        <span key={tagId} className="badge badge-primary badge-outline p-3">
                          {tag.name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <p className="text-base-content/70">No skills or interests added yet.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <TagSelector
                    selectedTags={selectedTags}
                    onTagsSelected={(tags) => setSelectedTags(tags)}
                  />
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={handleTagsUpdate}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Tags'}
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            <Section title="My Badges" className="px-6">
              <Grid cols={2} md={3} lg={4} gap={4}>
                {tags.map((tag) => (
                  tag.type === 'badge' && (
                    <BadgeCard key={tag.id} badge={tag} />
                  )
                ))}
              </Grid>
            </Section>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Profile;