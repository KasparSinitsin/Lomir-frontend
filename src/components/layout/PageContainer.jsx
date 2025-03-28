import React from 'react';

const PageContainer = ({ children }) => {
  return (
    <div className="container mx-auto px-4 py-6">
      {children}
    </div>
  );
};

export default PageContainer;