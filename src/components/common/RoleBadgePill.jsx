import React from "react";

const RoleBadgePill = ({
  icon: Icon,
  label,
  badgeColorClass = "badge-neutral",
  interactive = false,
  loading = false,
  onClick,
  className = "",
}) => {
  const Component = onClick ? "button" : "span";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group inline-flex items-center h-6 rounded-full overflow-hidden
  text-xs font-medium
  ${badgeColorClass}
  ${interactive ? "cursor-pointer hover:shadow-md transition-all duration-200" : ""}
  ${onClick ? "border-0 outline-none appearance-none" : ""}
  ${className}`}
    >
      {/* Icon circle area */}
      <span className="inline-flex items-center justify-center w-6 h-6 shrink-0">
        {Icon && <Icon className="w-3 h-3 shrink-0" />}
      </span>

      {/* Expanding label */}
      <span
  className={`text-xs font-medium leading-none
    max-w-0 overflow-hidden whitespace-nowrap opacity-0
    transition-all duration-200 ease-out
    group-hover:max-w-[80px] group-hover:opacity-100
    group-focus-visible:max-w-[80px] group-focus-visible:opacity-100
    pr-0 group-hover:pr-2 group-focus-visible:pr-2`}
>
  {label}
</span>

      {/* Optional loading spinner */}
      {loading && (
        <span className="pr-2">
          <span className="loading loading-spinner loading-xs" />
        </span>
      )}
    </Component>
  );
};

export default RoleBadgePill;