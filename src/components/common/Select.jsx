import React from 'react';

const Select = ({
  label = '',
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
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
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`select select-bordered w-full ${error ? 'select-error' : ''} ${className}`}
        required={required}
      >
        <option disabled value="">{placeholder}</option>
        {options.map((option) => (
          <option 
            key={typeof option === 'object' ? option.value : option} 
            value={typeof option === 'object' ? option.value : option}
          >
            {typeof option === 'object' ? option.label : option}
          </option>
        ))}
      </select>
      {error && (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      )}
    </div>
  );
};

export default Select;