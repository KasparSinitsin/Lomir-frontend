import React from 'react';

const FormGroup = ({
  children,
  label,
  htmlFor,
  helperText,
  error,
  required = false,
  className = ''
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-base-content mb-1">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      {children}
      {helperText && !error && (
        <p className="mt-1 text-xs text-base-content/70">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
};

export default FormGroup;