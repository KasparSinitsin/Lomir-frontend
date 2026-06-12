import React from "react";
import Tooltip from "./Tooltip";

const MatchScoreSubtitle = ({ matchTier, tooltipText, iconSize = 12 }) => {
  if (!matchTier) return null;

  return (
    <Tooltip content={tooltipText}>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap leading-none flex-shrink-0">
        <matchTier.Icon
          size={iconSize}
          className={`${matchTier.text} flex-shrink-0`}
        />
        <span className="text-base-content">{matchTier.pct}%</span>
      </span>
    </Tooltip>
  );
};

export default MatchScoreSubtitle;
