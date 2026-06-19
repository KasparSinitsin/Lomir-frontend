import React from "react";
import Tooltip from "./Tooltip";

const MatchScoreOverlay = ({
  matchTier,
  icon: IconOverride,
  tooltipText,
  sizeClassName = "w-5 h-5",
  iconSize = 10,
  iconClassName = "text-white",
  positionClassName = "absolute -top-0.5 -left-0.5 z-10",
  className = "",
  style,
  strokeWidth = 2.5,
}) => {
  if (!matchTier) {
    return null;
  }

  const Icon = IconOverride || matchTier.Icon;

  const overlay = (
    <div
      aria-label={tooltipText}
      className={[
        "rounded-full ring-2 ring-white flex items-center justify-center",
        matchTier.bg,
        sizeClassName,
        positionClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <Icon
        size={iconSize}
        className={iconClassName}
        strokeWidth={strokeWidth}
      />
    </div>
  );

  if (!tooltipText) {
    return overlay;
  }

  return <Tooltip content={tooltipText}>{overlay}</Tooltip>;
};

export default MatchScoreOverlay;
