import React from 'react';

const PageContainer = ({ children, title }) => {
  return (
    <div className="mx-auto px-4 py-6 w-full max-w-7xl">
      {title && <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-primary">{title}</h1>}
      {children}
    </div>
  );
};

export default PageContainer;