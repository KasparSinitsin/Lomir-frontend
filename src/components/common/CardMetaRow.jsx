import React from "react";

const CardMetaRow = ({ children, className = "", maxRows = 2, style }) => {
  const rowStyle =
    maxRows > 0
      ? {
          maxHeight: `${maxRows * 1.05}em`,
          ...style,
        }
      : style;

  return (
    <div
      className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 overflow-hidden text-xs [&>[data-tooltip-trigger]]:shrink-0 ${className}`}
      style={rowStyle}
    >
      {children}
    </div>
  );
};

export default CardMetaRow;
