import React from "react";
import { MapPin } from "lucide-react";
import { useLocation } from "../../hooks/useLocation";

// Country code to English name mapping
const COUNTRY_NAMES = {
  DE: "Germany",
  AT: "Austria",
  CH: "Switzerland",
  NL: "Netherlands",
  BE: "Belgium",
  FR: "France",
  GB: "United Kingdom",
  IT: "Italy",
  ES: "Spain",
  PL: "Poland",
  CZ: "Czech Republic",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  CN: "China",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  PT: "Portugal",
  IE: "Ireland",
  GR: "Greece",
  HU: "Hungary",
  RO: "Romania",
  BG: "Bulgaria",
  HR: "Croatia",
  SK: "Slovakia",
  SI: "Slovenia",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  LU: "Luxembourg",
  // Add more as needed
};

/**
 * Get the display name for a country
 * @param {string} countryCode - ISO country code (e.g., "DE") or full name
 * @returns {string} - Country name in English
 */
const getCountryDisplayName = (countryCode) => {
  if (!countryCode) return null;

  // If it's already a full name (longer than 3 chars), return as-is
  if (countryCode.length > 3) return countryCode;

  // Look up the code
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
};

const LocationDisplay = ({
  postalCode,
  city = null, // Manually entered city - takes priority over geocoding
  state = null, // State/region from database
  country = null, // Country code (e.g., "DE") or full name
  countryCode = null,
  showIcon = true,
  className = "",
  iconSize = 16,
  showLoadingSpinner = true,
  displayType = "detailed", // "detailed", "short", "city-only", "full"
  showPostalCode = false, // Show postal code prefix
  showState = true, // Show state/region
  showCountry = true, // Show country
}) => {
  // Only use geocoding if no city is manually provided AND postalCode exists
  const shouldGeocode = !city && postalCode;
  const { location, loading, error } = useLocation(
    shouldGeocode ? postalCode : null,
    country || countryCode,
  );

  // Return null only if we have neither city nor postal code
  if (!postalCode && !city) {
    return null;
  }

  // Get the country display name
  const countryDisplayName = country ? getCountryDisplayName(country) : null;

  // Choose display format based on displayType prop
  const getDisplayText = () => {
    // If city is manually provided, build the display string
    if (city) {
      const parts = [];

      // Add postal code + city
      if (showPostalCode && postalCode) {
        parts.push(`${postalCode} ${city}`);
      } else {
        parts.push(city);
      }

      // Add state if available and requested
      if (
        showState &&
        state &&
        displayType !== "city-only" &&
        displayType !== "short"
      ) {
        parts.push(state);
      }

      // Add country if available and requested
      if (showCountry && countryDisplayName && displayType !== "city-only") {
        parts.push(countryDisplayName);
      }

      return parts.join(", ");
    }

    // Fall back to geocoded location
    if (!location) {
      // Still loading or no result - show postal code as fallback
      return postalCode || "";
    }

    // Build display from geocoded data
    let displayText;
    switch (displayType) {
      case "full":
        // Full format: postal code + city, state, country
        const fullParts = [];
        if (showPostalCode && postalCode) {
          fullParts.push(`${postalCode} ${location.city || ""}`);
        } else {
          fullParts.push(location.city || "");
        }
        if (showState && (state || location.state)) {
          fullParts.push(state || location.state);
        }
        if (showCountry && (countryDisplayName || location.country)) {
          fullParts.push(countryDisplayName || location.country);
        }
        displayText = fullParts.filter(Boolean).join(", ");
        break;

      case "detailed":
        // Detailed format from geocoding service
        displayText =
          location.detailedDisplayName || location.displayName || postalCode;
        // Add postal code prefix if requested
        if (
          showPostalCode &&
          postalCode &&
          !displayText.startsWith(postalCode)
        ) {
          displayText = `${postalCode} ${displayText}`;
        }
        break;

      case "short":
        // Short format: city, country only
        displayText =
          location.shortDisplayName || location.displayName || postalCode;
        if (
          showPostalCode &&
          postalCode &&
          !displayText.startsWith(postalCode)
        ) {
          displayText = `${postalCode} ${displayText}`;
        }
        break;

      case "city-only":
        displayText = location.city || postalCode;
        if (showPostalCode && postalCode) {
          displayText = `${postalCode} ${displayText}`;
        }
        break;

      default:
        displayText =
          location.detailedDisplayName || location.displayName || postalCode;
        if (
          showPostalCode &&
          postalCode &&
          !displayText.startsWith(postalCode)
        ) {
          displayText = `${postalCode} ${displayText}`;
        }
    }

    return displayText;
  };

  const displayText = getDisplayText();

  // Determine if we should show loading state
  // Only show loading when we're actually geocoding (no city provided, has postal code)
  const showLoading = loading && showLoadingSpinner && shouldGeocode;

  return (
    <div
      className={`flex items-start text-sm text-base-content/70 ${className}`}
    >
      {showIcon && (
        <MapPin size={iconSize} className="mr-1 flex-shrink-0 mt-0.5" />
      )}
      <span
        title={
          location?.rawAddress
            ? JSON.stringify(location.rawAddress, null, 2)
            : undefined
        }
      >
        {showLoading ? (
          <span className="flex items-center">
            <span className="loading loading-spinner loading-xs mr-1"></span>
            <span className="text-base-content/50">Loading...</span>
          </span>
        ) : (
          displayText || postalCode
        )}
      </span>
    </div>
  );
};

export default LocationDisplay;
