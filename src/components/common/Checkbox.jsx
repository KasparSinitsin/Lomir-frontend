import React from 'react';
import Colors from '../../utils/Colors';

const Checkbox = ({ 
  label, 
  name, 
  checked, 
  onChange, 
  className = '',
  labelClassName = '',
  required = false,
  disabled = false,
  id = undefined
}) => {
  // Generate a unique ID if none is provided
  const inputId = id || `checkbox-${name}-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="form-control">
      <label 
        htmlFor={inputId} 
        className={`label cursor-pointer justify-start gap-2 ${disabled ? 'opacity-50' : ''}`}
      >
        <input
          id={inputId}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`checkbox ${className}`}
        />
        {label && (
          <span className={`label-text ${labelClassName}`}>{label}</span>
        )}
      </label>
    </div>
  );
};

export default Checkbox;