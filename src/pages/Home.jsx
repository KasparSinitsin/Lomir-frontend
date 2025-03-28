import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';

const Home = () => {
  return (
    <PageContainer>
      <div className="hero min-h-[80vh] bg-base-200 rounded-lg">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Lomir</h1>
            <p className="py-6">Lomir is an app that helps you build a team for any collaborative project — or simply to have a great time.</p>
            <div className="flex gap-4 justify-center">
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
              <Link to="/login" className="btn btn-outline">Login</Link>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Home;