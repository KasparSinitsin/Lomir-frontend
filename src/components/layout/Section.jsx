import React from 'react';

const Section = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  titleClassName = '',
  spacing = 'mb-8'
}) => {
  return (
    <section className={`${spacing} ${className}`}>
      {(title || action) && (
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-4">
          <div>
            {title && <h2 className={`text-xl font-medium text-primary ${titleClassName}`}>{title}</h2>}
            {subtitle && <p className="text-base-content/70 text-sm mt-1">{subtitle}</p>}
          </div>
          {action && <div className="mt-2 xs:mt-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
};

export default Section;