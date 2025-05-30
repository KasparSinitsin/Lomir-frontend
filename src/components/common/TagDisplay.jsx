import React from 'react';

const TagDisplay = ({ 
  tags = [], 
  maxVisible = null, 
  size = 'md', 
  variant = 'outline',
  showCategory = false,
  className = ''
}) => {
  if (!tags || tags.length === 0) {
    return (
      <span className="text-sm text-base-content/60 italic">
        No tags selected
      </span>
    );
  }

  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible && tags.length > maxVisible 
    ? tags.length - maxVisible 
    : 0;

  const sizeClasses = {
    sm: 'badge-sm text-xs',
    md: 'text-sm',
    lg: 'badge-lg text-base'
  };

  const variantClasses = {
    outline: 'badge-outline',
    primary: 'badge-primary',
    secondary: 'badge-secondary'
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {visibleTags.map((tag) => (
        <span
          key={tag.id || tag.tag_id}
          className={`badge ${variantClasses[variant]} ${sizeClasses[size]} px-3 py-1`}
          title={showCategory && tag.category ? `${tag.category}: ${tag.name}` : tag.name}
        >
          {showCategory && tag.category && (
            <span className="opacity-70 mr-1">{tag.category}:</span>
          )}
          {tag.name}
        </span>
      ))}
      
      {hiddenCount > 0 && (
        <span className={`badge badge-ghost ${sizeClasses[size]} px-2`}>
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
};

export default TagDisplay;