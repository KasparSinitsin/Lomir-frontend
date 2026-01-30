import React from "react";
import { MapPin, Globe } from "lucide-react";
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
 */
const LocationSection = ({
  entity,
  entityType = "user",
  compact = false,
  className = "",
  title = "Location",
  showTitle,
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

  // Choose the appropriate icon
  const IconComponent = isRemote ? Globe : MapPin;

  // Compact version for cards - consistent with UserCard display
  if (compact) {
    return (
      <div
        className={`flex items-start text-sm text-base-content/70 ${className}`}
      >
        <IconComponent size={16} className="mr-1 flex-shrink-0 mt-0.5" />
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
    );
  }

  // Full version for modals/details view
  return (
    <div className={className}>
      {/* Title row - icon and title together */}
      {shouldShowTitle && (
        <div className="flex items-center mb-2">
          <IconComponent
            size={18}
            className="mr-2 text-primary flex-shrink-0"
          />
          <h3 className="font-medium">{title}</h3>
        </div>
      )}

      {/* Content */}
      <div>
        {isRemote ? (
          <div className="flex items-center bg-base-200/50 rounded-lg py-2 px-3">
            <span className="text-base-content">Remote Team</span>
            <span className="text-xs text-base-content/50 ml-2">
              (No physical location)
            </span>
          </div>
        ) : location.city || location.postalCode ? (
          <div className="flex items-start text-sm text-base-content/70 bg-base-200/50 rounded-lg py-2 px-3">
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
