import React from "react";
import { MapPin, Globe, Tag, Award, Ruler } from "lucide-react";
import Tooltip from "./Tooltip";

const ListViewRow = ({
  locationText,
  locationTooltip,
  isRemote = false,
  distance = null,
  tagsSummary,
  tagsTooltip,
  badgesSummary,
  badgesTooltip,
  actionSlot = null,
  locationVisibilityClassName = "flex",
  locationWidthClassName = "",
  locationInsetClassName = "",
  tagsWidthClassName = "",
  badgesWidthClassName = "",
  locationBreakpoint = "sm",
  className = "",
}) => {
  const LocationIcon = isRemote ? Globe : MapPin;
  const shortBreakpointClass = locationBreakpoint === "md" ? "md:hidden" : "sm:hidden";
  const fullBreakpointClass = locationBreakpoint === "md" ? "hidden md:block" : "hidden sm:block";

  return (
    <div className={`flex items-stretch ${className}`}>
      <div
        className={`box-border ${locationVisibilityClassName} w-24 flex-shrink-0 items-center gap-3 overflow-hidden sm:w-56 ${locationWidthClassName} ${locationInsetClassName}`}
      >
        {distance != null && (
          <div className="hidden w-16 flex-shrink-0 overflow-hidden md:block">
            <div className="text-xs text-base-content flex items-center gap-1 overflow-hidden">
              <Tooltip content={`${Math.round(distance)} km away from you`}>
                <div className="flex items-center gap-1">
                  <Ruler size={9} className="flex-shrink-0" />
                  <span className="whitespace-nowrap">{Math.round(distance)} km</span>
                </div>
              </Tooltip>
            </div>
          </div>
        )}

        {locationText && (
          <div className="min-w-0 text-xs text-base-content/60 flex items-center gap-1 overflow-hidden">
            <Tooltip
              content={locationTooltip || locationText}
              wrapperClassName="flex min-w-0 w-full items-center overflow-hidden"
            >
              <div className="flex min-w-0 w-full items-center gap-1 overflow-hidden">
                <LocationIcon size={9} className="flex-shrink-0" />
                <span className={`min-w-0 flex-1 truncate ${shortBreakpointClass}`}>
                  {locationText}
                </span>
                <span className={`min-w-0 flex-1 truncate ${fullBreakpointClass}`}>
                  {locationTooltip || locationText}
                </span>
              </div>
            </Tooltip>
          </div>
        )}
      </div>

      <div
        className={`hidden w-52 flex-shrink-0 text-xs text-base-content/60 lg:flex items-center gap-1 overflow-hidden ${tagsWidthClassName}`}
      >
        {tagsSummary && (
          <Tooltip
            content={tagsTooltip || tagsSummary}
            wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full"
          >
            <Tag size={9} className="flex-shrink-0" />
            <span className="truncate">{tagsSummary}</span>
          </Tooltip>
        )}
      </div>

      <div
        className={`hidden w-48 flex-shrink-0 text-xs text-base-content/60 xl:flex items-center gap-1 overflow-hidden ${badgesWidthClassName}`}
      >
        {badgesSummary && (
          <Tooltip
            content={badgesTooltip || badgesSummary}
            wrapperClassName="flex items-center gap-1 min-w-0 overflow-hidden w-full"
          >
            <Award size={9} className="flex-shrink-0" />
            <span className="truncate">{badgesSummary}</span>
          </Tooltip>
        )}
      </div>

      {actionSlot && (
        <div className="w-20 flex-shrink-0 flex items-center justify-end gap-2">
          {actionSlot}
        </div>
      )}
    </div>
  );
};

export default ListViewRow;
