import React from "react";
import { useTranslation } from "react-i18next";
import { MapPin, MapPinX, Globe, Ruler, CheckCheck } from "lucide-react";
import {
  formatDistanceKm,
  formatLocation,
  normalizeLocationData,
} from "../../utils/locationUtils";

/**
 * LocationSection Component
 * Unified component for displaying location for both users and teams
 *
 * Replaces UserLocationSection and TeamLocationSection
 *
 * @param {Object} props
 * @param {Object} props.entity - User or team object containing location data
 * @param {string} props.entityType - "user" | "team" (affects remote team handling)
 * @param {boolean} props.compact - Use compact display (for cards) vs full display (for modals)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.title - Section title (defaults to the translated
 *   "Location"; a caller-supplied value still wins)
 * @param {boolean} props.showTitle - Whether to show section title (default: true for full, false for compact)
 *  * @param {number} props.distance - Distance in km (optional, for search results)
 * @param {boolean} props.showDefaultHeaderRight - Whether to render the built-in remote/distance header info
 */
const LocationSection = ({
  entity,
  entityType = "user",
  compact = false,
  className = "",
  title,
  showTitle,
  distance = null,
  headerRight = null,
  showDefaultHeaderRight = true,
  iconSize = 16,
  showCountryCode = true,
}) => {
  const { t } = useTranslation();

  // Resolved in the body, not in the parameter list: a default there is
  // evaluated once at import and `changeLanguage` can never move it.
  const resolvedTitle = title ?? t("location.section.title");

  // Normalize the location data (handles snake_case/camelCase)
  const location = normalizeLocationData(entity);

  // Don't render if no location data.
  //
  // ⚠️ Cards are the exception: they show the crossed-out pin, mirroring the
  // map, so "no location" is stated rather than left blank next to a
  // meaningless "0 km". The icon carries the meaning and needs no
  // translation; the tooltip holds the wording. The test is the DATA flag
  // `hasLocation` (`isRemote || district || city || postalCode || state ||
  // country`), never a comparison against a display string.
  if (!location.hasLocation) {
    if (!compact) return null;

    return (
      <div
        className={`flex flex-wrap items-start leading-[110%] text-sm text-base-content/70 ${className} ${iconSize < 16 ? "gap-x-2 gap-y-1" : "gap-x-3 gap-y-2"}`}
      >
        <div className="flex items-start text-base-content/50">
          <MapPinX size={iconSize} className="mr-1 flex-shrink-0 mt-0.5" />
          <span>{t("location.section.unavailable")}</span>
        </div>
      </div>
    );
  }

  // Determine if we should show the title
  const shouldShowTitle = showTitle !== undefined ? showTitle : !compact;

  // For teams, check if it's remote
  const isRemote = entityType === "team" && location.isRemote;
  const hasDistance =
    !isRemote &&
    distance !== null &&
    distance !== undefined &&
    distance < 999999;
  const isNearbyDistance = hasDistance && Number(distance) <= 1000;
  const distanceToneClass = isNearbyDistance
    ? "text-success"
    : "text-slate-500";

  // Choose the appropriate icon
  const IconComponent = isRemote ? Globe : MapPin;

  // Compact version for cards - consistent with UserCard display
  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-start leading-[110%] text-sm text-base-content/70 ${className} ${iconSize < 16 ? "gap-x-2 gap-y-1" : "gap-x-3 gap-y-2"}`}
      >
        {/* Location info */}
        <div className="flex items-start">
          <IconComponent
            size={iconSize}
            className="mr-1 flex-shrink-0 mt-0.5"
          />
          {isRemote ? (
            <span>{t("location.section.remote")}</span>
          ) : (
            <span>
              {formatLocation(location, {
                displayType: "full",
                showPostalCode: true,
                showState: true,
                showCountry: true,
                showCountryCode,
              })}
            </span>
          )}
        </div>

        {/* Distance info - only show for non-remote entities with valid distance */}
        {hasDistance && (
          <div className="flex items-start">
            <Ruler size={iconSize} className="mr-1 flex-shrink-0 mt-0.5" />
            <span>
              {t("location.section.distanceAway", {
                distance: formatDistanceKm(distance),
              })}
            </span>
          </div>
        )}
      </div>
    );
  }

  const defaultHeaderRight = !showDefaultHeaderRight
    ? null
    : isRemote ? (
        <span className="flex items-center gap-1.5 text-sm text-success">
          <CheckCheck size={14} className="flex-shrink-0" />
          <span>{t("location.section.noLocationBoundaries")}</span>
        </span>
      ) : hasDistance ? (
          <span
            className={`flex items-center gap-1.5 text-sm ${distanceToneClass}`}
          >
            <Ruler size={14} className="flex-shrink-0" />
            <span>
              {t("location.section.distanceAway", {
                distance: formatDistanceKm(distance),
              })}
            </span>
          </span>
        ) : null;

  const resolvedHeaderRight = headerRight ?? defaultHeaderRight;

  // Full version for modals/details view
  return (
    <div className={className}>
      {/* Title row - icon and title together */}
      {shouldShowTitle && (
        <div className="flex items-start gap-2 mb-1">
          <IconComponent
            size={18}
            className="mt-0.5 text-primary flex-shrink-0"
          />
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-x-3 gap-y-0.5">
            <h3 className="font-medium leading-[1.1]">{resolvedTitle}</h3>
            {resolvedHeaderRight && (
              <div className="shrink-0">{resolvedHeaderRight}</div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        {isRemote ? (
          <div className="flex items-center text-sm text-base-content/70">
            <span>{t("location.section.remoteTeam")}</span>
            <span className="text-xs text-base-content/50 ml-2">
              {t("location.section.noPhysicalLocation")}
            </span>
          </div>
        ) : location.hasLocation ? (
          <div className="flex items-start text-sm text-base-content/70">
            {!shouldShowTitle && (
              <MapPin size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            )}
            <span>
              {formatLocation(location, {
                displayType: "full",
                showPostalCode: true,
                showState: true,
                showCountry: true,
                showCountryCode,
              })}
            </span>
          </div>
        ) : (
          <p className="text-base-content/50">
            {t("location.section.notSpecified")}
          </p>
        )}
      </div>
    </div>
  );
};

export default LocationSection;
