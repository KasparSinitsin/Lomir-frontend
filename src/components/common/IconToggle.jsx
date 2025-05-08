import React from 'react';
import { Eye, EyeClosed } from 'lucide-react'; 

const IconToggle = ({
  name,
  checked,
  onChange,
  className = '',
  disabled = false,
  id = undefined
}) => {
  // Generate a unique ID if none is provided
  const inputId = id || `toggle-${name}-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="form-control">
      <h3 className="font-medium mb-2">Team Visibility</h3>
      <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
        <div className="flex items-center">
          {checked ? 
            <Eye size={30} className="text-primary mr-2" /> : 
            <EyeClosed size={30} className="text-base-content/70 mr-2" />
          }
          <span className="font-medium">
            {checked ? 'Visible for all Users' : 'Hidden'}
          </span>
        </div>
        
        <label htmlFor={inputId} className="relative inline-flex items-center cursor-pointer">
          <input
            id={inputId}
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={`toggle toggle-primary ${className}`}
          />
          <span className="sr-only">Toggle visibility</span>
        </label>
      </div>
      <p className="text-sm text-base-content/70 mt-2">
        {checked
          ? 'Anyone can find and view your team'
          : 'Only members can see this team'}
      </p>
    </div>
  );
};

export default IconToggle;