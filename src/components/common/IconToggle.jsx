import React from 'react';
import { Eye, EyeClosed } from 'lucide-react'; 

const IconToggle = ({
  name,
  checked,
  onChange,
  title = "Visibility",
  visibleLabel = "Visible for all Users",
  hiddenLabel = "Hidden",
  visibleDescription = "Anyone can find and view this",
  hiddenDescription = "Only you can see this",
  entityType = "", // e.g. "team", "profile"
  className = '',
  disabled = false,
  id = undefined,
  showDescription = true
}) => {
  // Generate a unique ID if none is provided
  const inputId = id || `toggle-${name}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Force the checked prop to be a boolean
  const isChecked = checked === true;
  
  // Customize descriptions based on entityType if provided
  const getVisibleDescription = () => {
    if (entityType === "team") return "Anyone can find and view your team";
    if (entityType === "profile") return "Your profile will be discoverable by other users";
    return visibleDescription;
  };
  
  const getHiddenDescription = () => {
    if (entityType === "team") return "Only members can see this team";
    if (entityType === "profile") return "Your profile will be hidden from search results";
    return hiddenDescription;
  };
  
  return (
    <div className="form-control">
      {title && <h3 className="font-medium mb-2">{title}</h3>}
      <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
        <div className="flex items-center">
          {isChecked ? 
            <Eye size={30} className="text-primary mr-2" /> : 
            <EyeClosed size={30} className="text-base-content/70 mr-2" />
          }
          <span className="font-medium">
            {isChecked ? visibleLabel : hiddenLabel}
          </span>
        </div>
        
        <label htmlFor={inputId} className="relative inline-flex items-center cursor-pointer">
          <input
            id={inputId}
            type="checkbox"
            name={name}
            checked={isChecked}
            onChange={onChange}
            disabled={disabled}
            className={`toggle toggle-primary ${className}`}
          />
          <span className="sr-only">Toggle visibility</span>
        </label>
      </div>
      {showDescription && (
        <p className="text-sm text-base-content/70 mt-2">
          {isChecked ? getVisibleDescription() : getHiddenDescription()}
        </p>
      )}
    </div>
  );
};

export default IconToggle;