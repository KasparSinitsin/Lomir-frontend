import React from "react";
import { MapPin } from "lucide-react";
import { useLocation } from "../../hooks/useLocation";

const LocationDisplay = ({
  postalCode,
  countryCode = "DE",
  showIcon = true,
  className = "",
  iconSize = 16,
  showLoadingSpinner = true,
  displayType = "detailed", // "detailed", "short", "city-only"
  showPostalCode = false, // New prop to show/hide postal code
}) => {
  const { location, loading, error } = useLocation(postalCode, countryCode);

  if (!postalCode) {
    return null;
  }

  // Choose display format based on displayType prop
  const getDisplayText = () => {
    if (!location) return postalCode;

    let displayText;
    switch (displayType) {
      case "detailed":
        displayText =
          location.detailedDisplayName || location.displayName || postalCode;
        break;
      case "short":
        displayText =
          location.shortDisplayName || location.displayName || postalCode;
        break;
      case "city-only":
        displayText = location.city || postalCode;
        break;
      default:
        displayText =
          location.detailedDisplayName || location.displayName || postalCode;
    }

    // Add postal code to the display text if requested
    if (showPostalCode && postalCode) {
      return `${postalCode} ${displayText}`;
    }

    return displayText;
  };

  const displayText = getDisplayText();

  return (
  <div
    className={`flex items-start text-sm text-base-content/70 ${className}`}
  >
    {showIcon && <MapPin size={iconSize} className="mr-1 flex-shrink-0 mt-0.5" />}
      <span
        title={
          location?.rawAddress
            ? JSON.stringify(location.rawAddress, null, 2)
            : undefined
        }
      >
        {loading && showLoadingSpinner ? (
          <span className="flex items-center">
            <span className="loading loading-spinner loading-xs mr-1"></span>
            {postalCode}
          </span>
        ) : (
          displayText
        )}
      </span>
      {import.meta.env.DEV && error && (
        <span className="text-xs text-error ml-1">(Geocoding failed)</span>
      )}
    </div>
  );
};

export default LocationDisplay;
