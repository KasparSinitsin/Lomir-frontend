import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const { user, logout: _logout } = useAuth(); // not using logout for now
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [tags, setTags] = useState([]);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const message = localStorage.getItem('registrationMessage');
    if (message) {
      setRegistrationMessage(message);
      localStorage.removeItem('registrationMessage');
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

  const handleTagsUpdate = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      await userService.updateUserTags(user.id, selectedTags);
      setIsEditingTags(false);
    } catch (error) {
      console.error('Error updating user tags:', error);
      setError('Failed to update tags. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const EditButton = (
    <Link to="/profile/edit">
      <Button variant="outline" size="sm">Edit Profile</Button>
    </Link>
  );

  return (
    <div className="space-y-6">
      {registrationMessage && (
        <Alert
          type="success"
          message={registrationMessage}
          onClose={() => setRegistrationMessage('')}
        />
      )}

      <Card className="overflow-visible">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="mb-6 md:mb-0 md:mr-8">
            <div className="avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-24 h-24">
                <span className="text-3xl">{user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}</span>
              </div>
            </div>
          </div>

          <div className="flex-grow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                <p className="text-base-content/70">@{user.username}</p>
              </div>
              <div className="mt-4 sm:mt-0">
                {EditButton}
              </div>
            </div>

            <Grid cols={1} md={3} gap={4}>
              <DataDisplay label="Email" value={user.email} icon={<Mail size={16} />} />
              {user.postalCode && (
                <DataDisplay label="Location" value={user.postalCode} icon={<MapPin size={16} />} />
              )}
              <DataDisplay label="Member Since" value="April 2025" icon={<User size={16} />} />
            </Grid>
          </div>
        </div>

        {user.bio && (
          <Section title="About Me" className="mt-6">
            <p className="text-base-content/90">{user.bio}</p>
          </Section>
        )}

        <Section
          title="My Skills & Interests"
          action={
            !isEditingTags ? (
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-violet-200 hover:text-violet-700"
                onClick={() => setIsEditingTags(true)}
              >
                Edit Tags
              </Button>
            ) : null
          }
        >
          {!isEditingTags ? (
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
  key={`tag-selector-${user.id}`} // Add a unique key
  selectedTags={selectedTags}
  onTagsSelected={(tags) => {
    console.log('Selected tags:', tags); // Add logging
    setSelectedTags(tags);
  }}
/>
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditingTags(false)}
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
              {error && <Alert type="error" message={error} />}
            </div>
          )}
        </Section>

        <Section title="My Badges">
          <Grid cols={2} md={3} lg={4} gap={4}>
            {tags.map((tag) => (
              tag.type === 'badge' && (
                <BadgeCard key={tag.id} badge={tag} />
              )
            ))}
          </Grid>
        </Section>
      </Card>
    </div>
  );
};

export default Profile;