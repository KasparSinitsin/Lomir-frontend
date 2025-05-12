import React from 'react';

const InfoCard = ({ title, children, icon }) => {
  return (
    <div className="w-1/3 rounded-xl shadow-soft overflow-hidden bg-opacity-70 mb-6 mr-4 p-6 sm:p-7 border border-base-200 hover:shadow-md transition-shadow duration-300 bg-base-100">
      <div className="flex flex-col items-center">
        {icon && <div className="mb-4">{icon}</div>}
        {title && <h3 className="text-lg font-medium text-primary text-center mb-2">{title}</h3>}
        {children}
      </div>
    </div>
  );
};

export default InfoCard;