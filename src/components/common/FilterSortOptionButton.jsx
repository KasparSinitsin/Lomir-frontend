import React from "react";

const BASE_CLASS_NAME =
  "flex items-center gap-0.5 px-1 text-xs leading-[1.05] sm:gap-1 sm:leading-normal rounded transition-colors shrink-0";
const ACTIVE_CLASS_NAME = "text-[var(--color-primary)] font-bold";
const INACTIVE_CLASS_NAME =
  "text-[var(--color-primary-focus)]/70 hover:text-[var(--color-primary-focus)] hover:font-medium";
const ICON_CLASS_NAME =
  "w-[0.735rem] h-[0.735rem] sm:w-3.5 sm:h-3.5 shrink-0";

const FilterSortOptionButton = React.forwardRef(
  (
    {
      icon: Icon,
      label,
      mobileLabel,
      prefix = null,
      active = false,
      className = "",
      iconClassName = "",
      children,
      type = "button",
      ...buttonProps
    },
    ref,
  ) => {
    const hasResponsiveLabel = mobileLabel && mobileLabel !== label;
    const iconNode = Icon ? (
      <Icon className={`${ICON_CLASS_NAME} ${iconClassName}`.trim()} />
    ) : null;

    return (
      <button
        ref={ref}
        type={type}
        className={`${BASE_CLASS_NAME} ${
          active ? ACTIVE_CLASS_NAME : INACTIVE_CLASS_NAME
        } ${className}`}
        {...buttonProps}
      >
        {prefix ? (
          <span className="inline-flex items-center gap-px">
            <span className="leading-none">{prefix}</span>
            {iconNode}
          </span>
        ) : (
          iconNode
        )}
        {children ??
          (hasResponsiveLabel ? (
            <>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
            </>
          ) : (
            <span>{label}</span>
          ))}
      </button>
    );
  },
);

FilterSortOptionButton.displayName = "FilterSortOptionButton";

export default FilterSortOptionButton;
