import React, { useState, useEffect } from 'react';
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
    profileImage: null
  });

  useEffect(() => {
    const message = localStorage.getItem('registrationMessage');
    if (message) {
      setRegistrationMessage(message);
      localStorage.removeItem('registrationMessage');
    }

    // Debug the user object to see property names
    if (user) {
      console.log("User object for debugging:", user);
    }

    // Initialize form data when user data is available
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        postalCode: user.postalCode || '',
        profileImage: null
      });

      // Set image preview if user has an avatar
      if (user.avatarUrl) {
        setImagePreview(user.avatarUrl);
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
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field "${name}" changed to:`, value);
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        profileImage: file
      });
      
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
      
      // Debug logging for user information
      console.log("Current user object:", user);
      console.log("User ID from current context:", user.id);
      
      console.log("Starting profile update with form data:", formData);
      
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        postalCode: formData.postalCode
      };
      
      console.log("Sending update with data:", userData);
      
      // Upload image if selected
      if (formData.profileImage) {
        console.log("Profile image will be uploaded");
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', formData.profileImage);
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

        userData.avatarUrl = cloudinaryResponse.data.secure_url;
        console.log("Image uploaded, received URL:", userData.avatarUrl);
      }
      
      // Log complete API call details
      console.log(`Attempting to update user with ID: ${user.id}`);
      console.log("Full update payload:", userData);
      
      // Add a check for valid user ID
      if (!user.id || isNaN(parseInt(user.id))) {
        throw new Error(`Invalid user ID: ${user.id}`);
      }
      
      const response = await userService.updateUser(user.id, userData);
      
      console.log("Update response:", response);
      
      if (!response || response.success === false) {
        console.error("Update failed:", response?.message || "No response received");
        setError('Failed to update profile: ' + (response?.message || "Unknown error"));
      } else {
        setIsEditing(false);
        setSuccess('Profile updated successfully');
        
        // Update user data in AuthContext with the new data
        if (response.data) {
          console.log("New user data:", response.data);
          
          // Update global user context
          updateUser({
            firstName: response.data.first_name,
            lastName: response.data.last_name,
            bio: response.data.bio,
            postalCode: response.data.postal_code,
            avatarUrl: response.data.avatar_url
          });
          
          // Update local form state
          setFormData({
            firstName: response.data.first_name || '',
            lastName: response.data.last_name || '',
            bio: response.data.bio || '',
            postalCode: response.data.postal_code || '',
            profileImage: null
          });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Error details:', {
        message: error.message,
        userId: user?.id,
        formData: formData
      });
      setError('Failed to update profile: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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
      
      {/* Debug section - remove in production */}
      {import.meta.env.DEV && (
        <Card className="mb-4">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">Debug User Data</h3>
            {displayUserData()}
            
            {isEditing && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Debug Form Data</h3>
                <pre className="text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-visible">
        {isEditing ? (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
            
            <div className="mb-6 flex justify-center">
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
            
            <div className="form-control w-full mb-6">
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
            <div className="flex flex-col md:flex-row md:items-center p-6">
              <div className="mb-6 md:mb-0 md:mr-8">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-24 h-24">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt="Profile" 
                        className="rounded-full object-cover w-full h-full" 
                      />
                    ) : (
                      <span className="text-3xl">
                        {user.firstName?.charAt(0) || 
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
                      {user.firstName || ''} {user.lastName || ''}
                    </h2>
                    <p className="text-base-content/70">@{user.username}</p>
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
                  {user.postalCode && (
                    <DataDisplay 
                      label="Location" 
                      value={user.postalCode} 
                      icon={<MapPin size={16} />} 
                    />
                  )}
                  <DataDisplay label="Member Since" value="April 2025" icon={<User size={16} />} />
                </Grid>
              </div>
            </div>

            {user.bio && (
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