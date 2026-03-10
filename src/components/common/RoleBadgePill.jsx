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
      className={`badge ${badgeColorClass} badge-sm gap-1 rounded-full font-normal normal-case ${
        interactive
          ? "hover:shadow-md transition-all duration-200 cursor-pointer"
          : ""
      } ${onClick ? "border-0 outline-none appearance-none" : ""} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span className="leading-none">{label}</span>
      {loading && <span className="loading loading-spinner loading-xs" />}
    </Component>
  );
};

export default RoleBadgePill;