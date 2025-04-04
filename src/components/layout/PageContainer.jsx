import React from 'react';

const PageContainer = ({ children, title }) => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {title && <h1 className="text-3xl font-bold mb-6 text-primary">{title}</h1>}
      {children}
    </div>
  );
};

export default PageContainer;