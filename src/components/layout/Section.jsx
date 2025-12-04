import React from 'react';

const Section = ({
  children,
  title,
  subtitle,
  action,
  icon,                          // Optional icon element
  titleSize = 'default',         // 'default' | 'sm'
  className = '',
  titleClassName = '',
  spacing = 'mb-8'
}) => {
  // Define title styles based on size
  const titleStyles = {
    default: 'text-xl font-medium text-primary',  // Original style (h2)
    sm: 'font-medium'                              // Smaller style (h3), matches UserSkillsSection
  };

  // Use h2 for default, h3 for small
  const TitleTag = titleSize === 'sm' ? 'h3' : 'h2';

  return (
    <section className={`${spacing} ${className}`}>
      {(title || action) && (
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-4">
          <div>
            {title && (
              <TitleTag className={`${titleStyles[titleSize]} ${titleClassName}`}>
                {icon && (
                  <span className="inline-flex items-center">
                    <span className="mr-2 flex-shrink-0">{icon}</span>
                    {title}
                  </span>
                )}
                {!icon && title}
              </TitleTag>
            )}
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