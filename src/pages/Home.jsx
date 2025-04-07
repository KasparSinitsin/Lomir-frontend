import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import Section from '../components/layout/Section';
import Grid from '../components/layout/Grid';
import Card from '../components/common/Card';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="space-y-8">
      <div className="hero bg-base-200 rounded-xl shadow-soft overflow-hidden">
        <div className="hero-content text-center py-12 px-4">
          <div className="max-w-md">
            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-primary mb-2">Lomir</h1>
            <p className="text-lg font-light text-base-content/80 mb-8">Build your perfect team for any collaborative project — or simply to have a great time.</p>
            <div className="flex gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn btn-primary">Sign Up</Link>
                  <Link to="/login" className="btn btn-outline btn-primary">Login</Link>
                </>
              ) : (
                <>
                  <Link to="/teams" className="btn btn-primary">Browse Teams</Link>
                  <Link to="/teams/create" className="btn btn-outline btn-primary">Create Team</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Section 
        title="Why Choose Lomir?" 
        subtitle="Discover what makes our platform unique"
      >
        <Grid cols={1} md={3} gap={6}>
          <Card 
            title="Find Your People" 
            hoverable={true}
          >
            <p className="text-base-content/80">Search for people nearby or worldwide who share your interests and skills.</p>
          </Card>
          <Card 
            title="Build Together" 
            hoverable={true}
          >
            <p className="text-base-content/80">Share your interests and contribute with your unique talents and skills on meaningful projects.</p>
          </Card>
          <Card 
            title="Stay in Touch" 
            hoverable={true}
          >
            <p className="text-base-content/80">Communicate effectively and make the most of your collaborative experience.</p>
          </Card>
        </Grid>
      </Section>
    </div>
  );
};

export default Home;