// src/components/common/Card.jsx
import React from 'react';

const Card = ({ 
  title, 
  subtitle,
  children, 
  footer,
  className = '',
  compact = false,
  hoverable = true,
  bordered = true
}) => {
  return (
    <div className={`
      bg-base-100 
      ${bordered ? 'border border-base-200' : ''} 
      ${hoverable ? 'hover:shadow-md transition-shadow duration-300' : ''} 
      shadow-soft 
      rounded-xl 
      overflow-hidden
      ${compact ? 'card-compact' : ''} 
      ${className}
    `}>
      {title && (
        <div className="p-4 sm:p-5 border-b border-base-200">
          <h3 className="text-lg font-medium text-primary">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-base-content/70">{subtitle}</p>}
        </div>
      )}
      <div className="p-4 sm:p-5">
        {children}
      </div>
      {footer && (
        <div className="p-4 sm:p-5 bg-base-200/50 border-t border-base-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;