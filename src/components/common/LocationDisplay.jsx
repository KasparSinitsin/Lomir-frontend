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
}) => {
  const { location, loading, error } = useLocation(postalCode, countryCode);

  if (!postalCode) {
    return null;
  }

  const displayText = location?.displayName
    ? `${postalCode}, ${location.displayName}`
    : postalCode;

  return (
    <div
      className={`flex items-center text-sm text-base-content/70 ${className}`}
    >
      {showIcon && <MapPin size={iconSize} className="mr-1 flex-shrink-0" />}
      <span>
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
