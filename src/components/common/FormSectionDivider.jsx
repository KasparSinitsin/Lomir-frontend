import React from "react";

const FormSectionDivider = ({
  text,
  icon: Icon,
  className = "",
  topSpacing = "mt-8",
  spacing,
}) => {
  const resolvedTopSpacing = topSpacing ?? spacing ?? "mt-8";

  return (
    <div
      className={[
        "divider my-0 text-sm text-primary-focus",
        "lomir-section-divider",      
        "gap-1.5",                    
        resolvedTopSpacing,
        className,
      ].join(" ")}
    >
      {Icon && <Icon size={14} className="flex-shrink-0" />}
      {text}
    </div>
  );
};

export default FormSectionDivider;
