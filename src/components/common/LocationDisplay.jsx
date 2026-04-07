import React from "react";
import { MapPin } from "lucide-react";
import { normalizeLocationData, formatLocation } from "../../utils/locationUtils";

/**
 * LocationDisplay Component
 * Simplified inline location display without geocoding
 * 
 * Since we now store city in the database, we don't need to geocode on the frontend.
 * This component just formats and displays the location data passed to it.
 * 
 * @param {Object} props
 * @param {string} props.postalCode - Postal/ZIP code
 * @param {string} props.city - City name
 * @param {string} props.state - State/region
 * @param {string} props.country - Country code or name
 * @param {boolean} props.showIcon - Show map pin icon (default: true)
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.iconSize - Icon size in pixels (default: 16)
 * @param {string} props.displayType - "short" | "full" | "city-only" (default: "short")
 * @param {boolean} props.showPostalCode - Include postal code (default: false)
 * @param {boolean} props.showState - Include state/region (default: false for short, true for full)
 * @param {boolean} props.showCountry - Include country (default: true)
 */
const LocationDisplay = ({
  postalCode,
  city = null,
  state = null,
  country = null,
  showIcon = true,
  className = "",
  iconSize = 16,
  displayType = "short",
  showPostalCode = false,
  showState,
  showCountry = true,
}) => {
  // Create a location object and normalize it
  const locationData = normalizeLocationData({
    postal_code: postalCode,
    city,
    state,
    country,
  });

  // Return null if no location data
  if (!locationData.hasLocation) {
    return null;
  }

  // Determine showState default based on displayType
  const shouldShowState = showState !== undefined 
    ? showState 
    : (displayType === "full");

  // Format the location string
  const displayText = formatLocation(locationData, {
    displayType,
    showPostalCode,
    showState: shouldShowState,
    showCountry,
  });

  if (!displayText) {
    return null;
  }

  return (
    <div
      className={`flex items-start text-sm text-base-content/70 ${className}`}
    >
      {showIcon && (
        <MapPin size={iconSize} className="mr-1 flex-shrink-0 mt-0.5" />
      )}
      <span>{displayText}</span>
    </div>
  );
};

export default LocationDisplay;
