import React from 'react';

const Card = ({ 
  title, 
  subtitle,
  children, 
  footer,
  className = '',
  compact = false,
  hoverable = true,
  bordered = true,
  image = null, // Add new image prop
  imageAlt = '', // Add image alt text prop
  imageSize = 'medium', // Add image size prop with default 'medium'
  imageShape = 'circle' // Add image shape prop with default 'circle'
}) => {
  // Function to render the image/avatar when provided
  const renderImage = () => {
    if (!image) return null;
    
    // Determine image size class
    const sizeClass = {
      small: 'w-12 h-12',
      medium: 'w-16 h-16',
      large: 'w-24 h-24'
    }[imageSize] || 'w-16 h-16';
    
    // Determine shape class
    const shapeClass = imageShape === 'circle' ? 'rounded-full' : 'rounded-lg';
    
    return (
      <div className="flex justify-center mb-4">
        <div className="avatar placeholder">
          <div className={`bg-primary text-primary-content ${shapeClass} ${sizeClass}`}>
            {typeof image === 'string' ? (
              <img 
                src={image} 
                alt={imageAlt}
                className={`${shapeClass} object-cover w-full h-full`}
              />
            ) : (
              <span className={imageSize === 'large' ? 'text-2xl' : 'text-xl'}>
                {image}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      mb-6           // Add bottom margin
      mr-4           // Add horizontal margin
    `}>
      {title && (
        <div className="p-6 sm:p-7 border-b border-base-200">
          <h3 className="text-lg font-medium text-primary">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-base-content/70">{subtitle}</p>}
        </div>
      )}
      <div className="p-6 sm:p-7"> 
        {renderImage()} {/* Add image before the content */}
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