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
import { Mail, MapPin, User } from 'lucide-react';
import { tagService } from '../services/tagService';
import BadgeCard from '../components/badges/BadgeCard'; 

const Profile = () => {
  const { user, logout } = useAuth();
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [tags, setTags] = useState([]);

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

    fetchTags();
  }, []);

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
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-violet-200 hover:text-violet-700"
            >
              Manage Skills
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.id} className="badge badge-primary badge-outline p-3">
                {tag.name}
              </span>
            ))}
          </div>
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