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
      background-opacity 
      ${bordered ? 'border border-base-200' : ''} 
      ${hoverable ? 'hover:shadow-md transition-shadow duration-300' : ''} 
      shadow-soft 
      rounded-xl 
      overflow-hidden
      ${compact ? 'card-compact' : ''} 
      ${className}
      bg-opacity-70  // Apply opacity to card background
    `}>
      {title && (
        <div className="p-6 sm:p-7 border-b border-base-200">
          <h3 className="text-lg font-medium text-primary">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-base-content/70">{subtitle}</p>}
        </div>
      )}
      <div className="p-6 sm:p-7"> 
        {children}
      </div>
      {footer && (
        <div className="p-6 sm:p-7 bg-base-200/50 border-t border-base-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;