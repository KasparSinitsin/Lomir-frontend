import React from 'react';

const Card = ({ 
  title, 
  children, 
  footer,
  className = '',
  compact = false,
}) => {
  return (
    <div className={`card bg-base-100 border border-base-300 shadow-sm ${compact ? 'card-compact' : ''} ${className}`}>
      {title && (
        <div className="card-title p-4 border-b border-base-300">
          {title}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-actions justify-end p-4 border-t border-base-300">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;