import React from 'react';

const Card = ({ 
  title, 
  children, 
  footer,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`card bg-base-100 border border-base-200 shadow-soft hover:shadow-md transition-shadow duration-300 ${compact ? 'card-compact' : ''} ${className}`}>
      {title && (
  <div className="card-title p-4 border-b border-base-200 text-primary font-medium tracking-wide">
    {title}
  </div>
)}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-actions justify-end p-4 border-t border-base-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;