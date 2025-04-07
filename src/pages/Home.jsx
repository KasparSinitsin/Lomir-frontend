import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <PageContainer>
      <div className="hero min-h-[80vh] bg-base-200 rounded-lg shadow-soft">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-medium tracking-tight text-primary">Lomir</h1>
            <p className="py-6 text-lg font-light">Build your perfect team for any collaborative project — or simply to have a great time.</p>
            <div className="flex gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <Link to="/register" className="btn btn-outline btn-primary">Sign Up</Link>
                  <Link to="/login" className="btn btn-outline btn-primary">Login</Link>
                </>
              ) : (
                <>
                  <Link to="/teams" className="btn btn-primary font-medium">Browse Teams</Link>
                  <Link to="/teams/create" className="btn btn-outline btn-primary font-medium">Create Team</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card bg-base-100 shadow-soft hover:shadow-md transition-shadow duration-300 border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-primary font-medium">Find Your People</h2>
            <p className="font-normal">Search for people nearby or worldwide</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-soft hover:shadow-md transition-shadow duration-300 border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-primary font-medium">Build Together</h2>
            <p className="font-normal">Share your interests and contribute with your unique talents and skills.</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-soft hover:shadow-md transition-shadow duration-300 border border-base-200">
          <div className="card-body">
            <h2 className="card-title text-primary font-medium">Stay in Touch</h2>
            <p className="font-normal">Make the most of your time together!</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Home;