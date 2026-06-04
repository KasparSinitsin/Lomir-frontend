import React from "react";
import {
  Grid3x3,
  List as ListIcon,
  Map as MapIcon,
  createLucideIcon,
} from "lucide-react";

const Grid3x2Icon = createLucideIcon("Grid3x2", [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "grid-3x2-frame" }],
  ["path", { d: "M3 12h18", key: "grid-3x2-row" }],
  ["path", { d: "M9 3v18", key: "grid-3x2-col-1" }],
  ["path", { d: "M15 3v18", key: "grid-3x2-col-2" }],
]);

const VIEW_MODE_OPTIONS = {
  card: {
    label: "Card",
    ariaLabel: "Card view",
    tooltip: "Card View",
    Icon: Grid3x2Icon,
  },
  mini: {
    label: "Mini Card",
    ariaLabel: "Mini card view",
    tooltip: "Mini Card View",
    Icon: Grid3x3,
  },
  list: {
    label: "List",
    ariaLabel: "List view",
    tooltip: "List View",
    Icon: ListIcon,
  },
  map: {
    label: "Map",
    ariaLabel: "Map view",
    tooltip: "Map View",
    Icon: MapIcon,
  },
};

const ResultViewToggle = ({
  value,
  onChange,
  modes = ["card", "mini", "list"],
  className = "",
}) => (
  <div
    className={`flex flex-wrap items-center justify-end text-sm leading-[1.15] font-normal text-base-content/60 gap-x-1.5 gap-y-1 sm:gap-x-3 ${className}`}
    role="group"
    aria-label="Result view"
  >
    {modes.map((mode) => {
      const option = VIEW_MODE_OPTIONS[mode];
      if (!option) return null;

      const isActive = value === mode;
      const Icon = option.Icon;

      return (
        <button
          key={mode}
          type="button"
          aria-pressed={isActive}
          aria-label={option.ariaLabel}
          data-tip={isActive ? option.tooltip : `Switch to ${option.tooltip}`}
          onClick={() => onChange(mode)}
          className={`tooltip tooltip-top tooltip-lomir inline-flex items-center gap-1 rounded p-1 sm:p-0 hover:text-base-content transition-colors ${
            isActive ? "font-bold text-base-content" : ""
          }`}
        >
          <Icon
            className="inline-block w-[0.735rem] h-[0.735rem] shrink-0"
            strokeWidth={isActive ? 3 : 2}
            aria-hidden="true"
            focusable="false"
          />
          <span className="hidden sm:inline" aria-hidden="true">
            {option.label}
          </span>
        </button>
      );
    })}
  </div>
);

export default ResultViewToggle;
