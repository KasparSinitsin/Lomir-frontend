// Placeholder Component for Pages Under Construction
import React from 'react';
import PageContainer from '../layout/PageContainer';

const Placeholder = ({ pageName }) => {
  return (
    <PageContainer>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold">{pageName} Page</h2>
          <p>This page is under construction.</p>
          <div className="mt-4">
            <div className="w-full h-4 bg-base-200 rounded animate-pulse"></div>
            <div className="w-2/3 h-4 bg-base-200 rounded animate-pulse mt-2"></div>
            <div className="w-5/6 h-4 bg-base-200 rounded animate-pulse mt-2"></div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Placeholder;