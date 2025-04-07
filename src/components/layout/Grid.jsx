import React from 'react';

const Grid = ({ 
  children, 
  cols = 1,
  sm = null,
  md = null,
  lg = null,
  xl = null,
  gap = 4,
  className = ''
}) => {
  const getColClasses = () => {
    return `grid-cols-${cols} ${sm ? `sm:grid-cols-${sm}` : ''} ${md ? `md:grid-cols-${md}` : ''} ${lg ? `lg:grid-cols-${lg}` : ''} ${xl ? `xl:grid-cols-${xl}` : ''}`;
  };
  
  return (
    <div className={`grid ${getColClasses()} gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

export default Grid;