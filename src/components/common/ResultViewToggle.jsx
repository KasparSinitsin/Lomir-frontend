import React from "react";
import { useTranslation } from "react-i18next";
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

const VIEW_MODE_ICONS = {
  card: Grid3x2Icon,
  mini: Grid3x3,
  list: ListIcon,
  map: MapIcon,
};

const ResultViewToggle = ({
  value,
  onChange,
  modes = ["card", "mini", "list"],
  align = "end",
  className = "",
}) => {
  const { t } = useTranslation();
  const alignmentClassName =
    align === "responsive-start" ? "justify-start sm:justify-end" : "justify-end";

  // Written out per mode rather than built from `mode` as a template literal:
  // `npm run i18n:check` only sees literal keys, and a dynamic one would drop
  // all twelve out of the guard.
  const viewModeLabels = {
    card: {
      label: t("resultView.card.label"),
      ariaLabel: t("resultView.card.aria"),
      tooltip: t("resultView.card.tooltip"),
    },
    mini: {
      label: t("resultView.mini.label"),
      ariaLabel: t("resultView.mini.aria"),
      tooltip: t("resultView.mini.tooltip"),
    },
    list: {
      label: t("resultView.list.label"),
      ariaLabel: t("resultView.list.aria"),
      tooltip: t("resultView.list.tooltip"),
    },
    map: {
      label: t("resultView.map.label"),
      ariaLabel: t("resultView.map.aria"),
      tooltip: t("resultView.map.tooltip"),
    },
  };

  return (
    <div
      className={`flex flex-wrap items-center ${alignmentClassName} text-sm leading-[1.15] font-normal text-base-content/60 gap-x-1.5 gap-y-1 sm:gap-x-3 ${className}`}
      role="group"
      aria-label={t("resultView.groupLabel")}
    >
      {modes.map((mode) => {
        const option = viewModeLabels[mode];
        const Icon = VIEW_MODE_ICONS[mode];
        if (!option || !Icon) return null;

        const isActive = value === mode;

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={isActive}
            aria-label={option.ariaLabel}
            data-tip={
              isActive
                ? option.tooltip
                : t("resultView.switchTo", { view: option.tooltip })
            }
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
};

export default ResultViewToggle;
