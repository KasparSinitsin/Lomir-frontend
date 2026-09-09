import React from "react";
import { useTranslation } from "react-i18next";
import { UserSearch, EyeClosed, EyeIcon, FlaskConical } from "lucide-react";
import Tooltip from "../common/Tooltip";

/**
 * Shared leaf indicators for the TeamCard subtitle rows.
 *
 * These three blocks are byte-identical between the card/mini and list
 * subtitles apart from icon size (and the demo wrapper class), so they live
 * here as size-parameterized, self-gating primitives used by both
 * TeamCardSubtitle and TeamCardListSubtitle. Each returns null when it should
 * not render, keeping the call sites to a single tag.
 */

export const OpenRolesIndicator = React.memo(function OpenRolesIndicator({
  size,
  shouldShow,
  openRoleCount,
}) {
  const { t } = useTranslation("teams");

  if (!(shouldShow && openRoleCount > 0)) return null;
  return (
    <Tooltip
      content={t("teamCard.indicators.openRoles", { count: openRoleCount })}
    >
      <span className="flex items-center">
        <UserSearch size={size} className="text-orange-500 mr-0.5" />
        <span>{openRoleCount}</span>
      </span>
    </Tooltip>
  );
});

export const VisibilityIndicator = React.memo(function VisibilityIndicator({
  size,
  show,
  isPublic,
}) {
  const { t } = useTranslation("teams");

  if (!show) return null;
  return (
    <Tooltip
      content={
        isPublic
          ? t("teamCard.indicators.publicTeam")
          : t("teamCard.indicators.privateTeam")
      }
    >
      {isPublic ? (
        <EyeIcon size={size} className="text-green-600" />
      ) : (
        <EyeClosed size={size} className="text-gray-500" />
      )}
    </Tooltip>
  );
});

export const DemoIndicator = React.memo(function DemoIndicator({
  size,
  show,
  tooltip,
  wrapperClassName,
}) {
  if (!show) return null;
  return (
    <Tooltip content={tooltip} wrapperClassName={wrapperClassName}>
      <FlaskConical size={size} className="flex-shrink-0" />
    </Tooltip>
  );
});
