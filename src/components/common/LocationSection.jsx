import React from "react";
import { MapPin, Globe, Ruler, Check } from "lucide-react";
import {
  normalizeLocationData,
  formatLocation,
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
 * @param {string} props.title - Section title (default: "Location")
 * @param {boolean} props.showTitle - Whether to show section title (default: true for full, false for compact)
 *  * @param {number} props.distance - Distance in km (optional, for search results)
 * @param {boolean} props.showDefaultHeaderRight - Whether to render the built-in remote/distance header info
 */
const LocationSection = ({
  entity,
  entityType = "user",
  compact = false,
  className = "",
  title = "Location",
  showTitle,
  distance = null,
  headerRight = null,
  showDefaultHeaderRight = true,
  iconSize = 16,
}) => {
  // Normalize the location data (handles snake_case/camelCase)
  const location = normalizeLocationData(entity);

  // Don't render if no location data
  if (!location.hasLocation) {
    return null;
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
    : "text-base-content/70";

  // Choose the appropriate icon
  const IconComponent = isRemote ? Globe : MapPin;

  // Compact version for cards - consistent with UserCard display
  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-start text-sm text-base-content/70 ${className} ${iconSize < 16 ? "gap-x-2 gap-y-1" : "gap-x-3 gap-y-2"}`}
      >
        {/* Location info */}
        <div className="flex items-start">
          <IconComponent
            size={iconSize}
            className="mr-1 flex-shrink-0 mt-0.5"
          />
          {isRemote ? (
            <span>Remote</span>
          ) : (
            <span>
              {formatLocation(location, {
                displayType: "full",
                showPostalCode: true,
                showState: false,
                showCountry: true,
              })}
            </span>
          )}
        </div>

        {/* Distance info - only show for non-remote entities with valid distance */}
        {hasDistance && (
          <div className="flex items-start text-base-content">
            <Ruler size={iconSize} className="mr-1 flex-shrink-0 mt-0.5" />
            <span>{Math.round(distance)} km away</span>
          </div>
        )}
      </div>
    );
  }

  const defaultHeaderRight = !showDefaultHeaderRight
    ? null
    : isRemote ? (
        <span className="flex items-center gap-1.5 text-sm text-success">
          <Check size={14} className="flex-shrink-0" />
          <span>No location boundaries</span>
        </span>
      ) : hasDistance ? (
          <span
            className={`flex items-center gap-1.5 text-sm ${distanceToneClass}`}
          >
            <Ruler size={14} className="flex-shrink-0" />
            <span>{Math.round(distance)} km away</span>
          </span>
        ) : null;

  const resolvedHeaderRight = headerRight ?? defaultHeaderRight;

  // Full version for modals/details view
  return (
    <div className={className}>
      {/* Title row - icon and title together */}
      {shouldShowTitle && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <IconComponent
              size={18}
              className="mr-2 text-primary flex-shrink-0"
            />
            <h3 className="font-medium">{title}</h3>
          </div>
          {resolvedHeaderRight}
        </div>
      )}

      {/* Content */}
      <div>
        {isRemote ? (
          <div className="flex items-center text-sm text-base-content/70">
            <span>Remote Team</span>
            <span className="text-xs text-base-content/50 ml-2">
              (No physical location)
            </span>
          </div>
        ) : location.city || location.postalCode ? (
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
              })}
            </span>
          </div>
        ) : (
          <p className="text-base-content/50">Not specified</p>
        )}
      </div>
    </div>
  );
};

export default LocationSection;
