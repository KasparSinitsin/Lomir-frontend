/**
 * Location Utilities
 * Shared utilities for location handling across users and teams
 * Single source of truth for country mappings and location data normalization
 */

// Country code to English name mapping
export const COUNTRY_NAMES = {
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
  BS: "Bahamas",
  // Add more as needed
};

/**
 * Get the display name for a country
 * @param {string} countryCode - ISO country code (e.g., "DE") or full name
 * @returns {string|null} - Country name in English or null
 */
export const getCountryDisplayName = (countryCode) => {
  if (!countryCode) return null;

  // If it's already a full name (longer than 3 chars), return as-is
  if (countryCode.length > 3) return countryCode;

  // Look up the code
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
};

/**
 * Normalize location data from an entity (user or team)
 * Handles both snake_case and camelCase property names
 *
 * @param {Object} entity - User or team object
 * @returns {Object} Normalized location data
 */
export const normalizeLocationData = (entity) => {
  if (!entity) {
    return {
      postalCode: null,
      city: null,
      state: null,
      country: null,
      countryName: null,
      latitude: null,
      longitude: null,
      isRemote: false,
      hasLocation: false,
    };
  }

  const postalCode = entity.postal_code || entity.postalCode || null;
  const city = entity.city || null;
  const state = entity.state || null;
  const country = entity.country || null;
  const latitude = entity.latitude || null;
  const longitude = entity.longitude || null;
  const isRemote = entity.is_remote === true || entity.isRemote === true;

  // Determine if we have any location data
  const hasLocation = isRemote || !!(city || postalCode || state || country);

  return {
    postalCode,
    city,
    state,
    country,
    countryName: getCountryDisplayName(country),
    latitude,
    longitude,
    isRemote,
    hasLocation,
  };
};

/**
 * Format location for display
 *
 * @param {Object} locationData - Normalized location data
 * @param {Object} options - Formatting options
 * @param {string} options.displayType - "short" | "full" | "city-only"
 * @param {boolean} options.showPostalCode - Include postal code in output
 * @param {boolean} options.showState - Include state/region in output
 * @param {boolean} options.showCountry - Include country in output
 * @returns {string} Formatted location string
 */
export const formatLocation = (locationData, options = {}) => {
  const {
    displayType = "short",
    showPostalCode = false,
    showState = false,
    showCountry = true,
  } = options;

  const { postalCode, city, state, countryName } = locationData;

  if (!city && !postalCode) {
    return "";
  }

  const parts = [];

  switch (displayType) {
    case "city-only":
      if (city) parts.push(city);
      break;

    case "full":
      // Full format: postal code + city, state, country
      if (showPostalCode && postalCode && city) {
        parts.push(`${postalCode} ${city}`);
      } else if (city) {
        parts.push(city);
      } else if (postalCode) {
        parts.push(postalCode);
      }

      if (showState && state) {
        parts.push(state);
      }

      if (showCountry && countryName) {
        parts.push(countryName);
      }
      break;

    case "short":
    default:
      // Short format: city, country
      if (city) {
        parts.push(city);
      } else if (postalCode) {
        parts.push(postalCode);
      }

      if (showCountry && countryName) {
        parts.push(countryName);
      }
      break;
  }

  return parts.filter(Boolean).join(", ");
};

/**
 * Check if location data has changed between two objects
 * Used to determine if geocoding is needed
 *
 * @param {Object} newData - New location data
 * @param {Object} oldData - Previous location data
 * @returns {boolean} True if location has changed
 */
export const hasLocationChanged = (newData, oldData) => {
  const newNormalized = normalizeLocationData(newData);
  const oldNormalized = normalizeLocationData(oldData);

  return (
    newNormalized.postalCode !== oldNormalized.postalCode ||
    newNormalized.city !== oldNormalized.city ||
    newNormalized.country !== oldNormalized.country
  );
};

export default {
  COUNTRY_NAMES,
  getCountryDisplayName,
  normalizeLocationData,
  formatLocation,
  hasLocationChanged,
};
