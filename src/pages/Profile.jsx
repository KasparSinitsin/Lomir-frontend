import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageContainer from '../components/layout/PageContainer';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataDisplay from '../components/common/DataDisplay';
import Alert from '../components/common/Alert'; // Assuming you have an Alert component
import { Mail, MapPin, User } from 'lucide-react';


const Profile = () => {
  const { user, logout } = useAuth();
  const [registrationMessage, setRegistrationMessage] = useState('');

  useEffect(() => {
    // Check for registration message in localStorage
    const message = localStorage.getItem('registrationMessage');
    if (message) {
      setRegistrationMessage(message);
      // Remove the message after displaying
      localStorage.removeItem('registrationMessage');
    }
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
      {/* Display registration message if it exists */}
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
              <DataDisplay
                label="Email"
                value={user.email}
                icon={<Mail size={16} />}
              />

              {user.postalCode && (
                <DataDisplay
                  label="Location"
                  value={user.postalCode}
                  icon={<MapPin size={16} />}
                />
              )}

              <DataDisplay
                label="Member Since"
                value="April 2025"
                icon={<User size={16} />}
              />
            </Grid>
          </div>
        </div>

        {user.bio && (
          <Section title="About Me" className="mt-6">
            <p className="text-base-content/90">{user.bio}</p>
          </Section>
        )}
      </Card>

      <Section
        title="My Skills & Interests"
        action={<Button variant="ghost" size="sm">Manage Skills</Button>}
      >
        <div className="flex flex-wrap gap-2">
          {/* Example tags - replace with actual user tags */}
          <span className="badge badge-primary badge-outline p-3">JavaScript</span>
          <span className="badge badge-primary badge-outline p-3">React</span>
          <span className="badge badge-primary badge-outline p-3">UX Design</span>
          <span className="badge badge-primary badge-outline p-3">Project Management</span>
        </div>
      </Section>

      <Section title="My Badges">
        <Grid cols={2} md={3} lg={4} gap={4}>
          {/* Sample badges - replace with actual user badges */}
          <div className="bg-base-200 rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-blue-500">🏆</span>
            </div>
            <h3 className="font-medium">Team Player</h3>
          </div>
          <div className="bg-base-200 rounded-lg p-4 text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-green-500">💻</span>
            </div>
            <h3 className="font-medium">Coder</h3>
          </div>
        </Grid>
      </Section>
    </div>
  );
};

export default Profile;