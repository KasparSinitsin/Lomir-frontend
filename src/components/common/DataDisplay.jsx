import React from 'react';

const DataDisplay = ({
  label,
  value,
  icon,
  className = ''
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center mb-1">
        {icon && <span className="mr-2 text-base-content/70">{icon}</span>}
        <span className="text-sm font-medium text-base-content/70">{label}</span>
      </div>
      <div className="text-base font-medium text-base-content">{value}</div>
    </div>
  );
};

export default DataDisplay;