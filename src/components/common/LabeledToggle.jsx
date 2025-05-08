import React from 'react';

const LabeledToggle = ({
  leftLabel,     // Label for the "off" state (left side)
  rightLabel,    // Label for the "on" state (right side)
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
      <div className="flex items-center justify-between space-x-4">
        <span className={`text-sm font-medium ${!checked ? 'text-primary font-semibold' : 'text-base-content/70'}`}>
          {leftLabel}
        </span>
        
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
          <span className="sr-only">Toggle {name}</span>
        </label>
        
        <span className={`text-sm font-medium ${checked ? 'text-primary font-semibold' : 'text-base-content/70'}`}>
          {rightLabel}
        </span>
      </div>
    </div>
  );
};

export default LabeledToggle;