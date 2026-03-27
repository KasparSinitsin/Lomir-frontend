import React from "react";
import Tooltip from "./Tooltip";

const SearchResultTypeOverlay = ({
  icon,
  bgClassName = "bg-primary",
  tooltip = null,
  viewMode = "card",
}) => {
  const isListView = viewMode === "list";
  const overlay = (
    <div
      className={`absolute -top-0.5 -left-0.5 z-10 rounded-full ring-2 ring-white flex items-center justify-center text-white ${
        isListView ? "w-[14px] h-[14px]" : "w-5 h-5"
      } ${bgClassName}`}
    >
      {React.createElement(icon, {
        size: isListView ? 7 : 10,
        className: "text-white",
        strokeWidth: 2.5,
      })}
    </div>
  );

  if (!tooltip) {
    return overlay;
  }

  return <Tooltip content={tooltip}>{overlay}</Tooltip>;
};

export default SearchResultTypeOverlay;
