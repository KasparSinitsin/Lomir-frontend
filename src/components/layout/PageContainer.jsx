import React from 'react';

const PageContainer = ({ 
  children, 
  title, 
  subtitle,
  action,
  className = "",
  fullWidth = false,
  titleAlignment = "left" // Add this new prop with "left" as default
}) => {
  return (
    <div className="bg-base-100 rounded-xl shadow-soft p-4 sm:p-6">
      <div className={`mx-auto ${!fullWidth ? 'max-w-5xl' : ''} ${className}`}>
        {(title || action) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <div className={titleAlignment === "center" ? "w-full text-center" : ""}>
              {title && <h1 className="text-2xl sm:text-3xl font-medium text-primary mb-1">{title}</h1>}
              {subtitle && <p className="text-base-content/70">{subtitle}</p>}
            </div>
            {action && <div className="mt-4 sm:mt-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageContainer;