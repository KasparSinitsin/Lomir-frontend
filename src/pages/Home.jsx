import React from 'react';
import { Users, Handshake, MessageCircle } from 'lucide-react'; // Correct way to import icons
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import Section from '../components/layout/Section';
import Card from '../components/common/Card';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="align-items-center text-center space-y-12">
      {/* Hero Section */}
      <div className="background-opacity rounded-xl shadow-soft overflow-hidden">
        <div className="hero-content text-center py-16 px-6">
          <div className="max-w-md">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-primary mb-2">Lomir</h1>
            <p className="text-lg font-light text-base-content/80 mb-8">Build your perfect team for any collaborative project — <br></br>or simply to have a great time.</p>
            <div className="flex gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn btn-outline btn-primary">Sign Up</Link>
                  <Link to="/login" className="btn btn-outline btn-primary">Login</Link>
                </>
              ) : (
                <>
                  <Link to="/teams" className="btn btn-outline btn-primary">Browse Teams</Link>
                  <Link to="/teams/create" className="btn btn-outline btn-primary">Create Team</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section with cards */}
      <Section>

      <div className="text-center mb-8"> {/* Wrapper für zentrierten Text */}
  <h2 className="text-xl font-medium text-primary">Why Choose Lomir?</h2>
  <p className="text-base-content/70 text-sm mt-1 mb-4">Discover what makes our platform unique.</p>
</div>

        <div className="flex justify-between gap-x-4">
          <Card className="w-1/3" title="Find Your People" hoverable={true}>
            <div className="flex justify-center mb-4"> 
              <Users className="w-8 h-8 text-primary"/>
            </div>
            <p className="text-base-content/80">Search for people nearby or worldwide who share your interests and skills.</p>
          </Card>
          <Card className="w-1/3" title="Build Together" hoverable={true}>
            <div className="flex justify-center mb-4">
              <Handshake className="w-8 h-8 text-primary"/>
            </div>
            <p className="text-base-content/80">Share your interests and contribute with your unique talents and skills on meaningful projects.</p>
          </Card>
          <Card className="w-1/3" title="Stay in Touch" hoverable={true}>
            <div className="flex justify-center mb-4"> 
              <MessageCircle className="w-8 h-8 text-primary"/>
            </div>
            <p className="text-base-content/80">Communicate effectively and make the most of your collaborative experience.</p>
          </Card>
        </div>
      </Section>
    </div>
  );
};

export default Home;