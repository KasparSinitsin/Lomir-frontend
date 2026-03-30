import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const Section = ({
  children,
  title,
  subtitle,
  action,
  subtitleAction, // Optional element rendered between subtitle text and chevron
  icon, // Optional icon element
  titleSize = "default", // 'default' | 'sm'
  collapsible = false, // Whether the section content can be collapsed
  defaultCollapsed = false, // Initial collapsed state (only used if collapsible)
  className = "",
  titleClassName = "",
  spacing = "mb-8",
  id,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(
    collapsible ? defaultCollapsed : false,
  );

  // Define title styles based on size
  const titleStyles = {
    default: "text-xl font-medium text-primary", // Original style (h2)
    sm: "font-medium", // Smaller style (h3), matches UserSkillsSection
  };

  // Use h2 for default, h3 for small
  const TitleTag = titleSize === "sm" ? "h3" : "h2";

  const ChevronIcon = isCollapsed ? ChevronDown : ChevronUp;

  return (
    <section id={id} className={`${spacing} ${className}`}>
      {(title || action) && (
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center mb-4">
          <div className="w-full">
            {title && (
              <TitleTag
                className={`${titleStyles[titleSize]} ${titleClassName}`}
              >
                {icon && (
                  <span className="inline-flex items-center">
                    <span className="mr-2 flex-shrink-0">{icon}</span>
                    {title}
                  </span>
                )}
                {!icon && title}
              </TitleTag>
            )}
            {subtitle && (
              <div
                className={`flex items-center justify-between mt-1 ${
                  collapsible ? "cursor-pointer select-none group" : ""
                }`}
                onClick={
                  collapsible
                    ? () => setIsCollapsed((prev) => !prev)
                    : undefined
                }
              >
                <p className="text-base-content/70 text-sm">{subtitle}</p>
                <div className="flex items-center gap-2 mr-4">
                  <div onClick={(e) => e.stopPropagation()}>
                    {subtitleAction}
                  </div>
                  {collapsible && (
                    <ChevronIcon
                      size={22}
                      className="text-success group-hover:text-success/70 transition-colors flex-shrink-0"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          {action && <div className="mt-2 xs:mt-0 flex-shrink-0">{action}</div>}
        </div>
      )}
      {(!collapsible || !isCollapsed) && children}
    </section>
  );
};

export default Section;
