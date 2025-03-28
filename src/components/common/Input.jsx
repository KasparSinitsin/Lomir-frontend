import React from 'react';

const Input = ({
  type = 'text',
  placeholder = '',
  label = '',
  name,
  value,
  onChange,
  error = '',
  required = false,
  className = '',
}) => {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text">{label}{required && <span className="text-error"> *</span>}</span>
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        className={`input input-bordered w-full ${error ? 'input-error' : ''} ${className}`}
        required={required}
      />
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};

export default Input;