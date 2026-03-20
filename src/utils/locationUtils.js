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
 * Reverse mapping: Country name to ISO code
 * Includes common variations and local names
 * Used for converting geocoding results to dropdown-compatible codes
 */
export const COUNTRY_NAME_TO_CODE = {
  // English names (from COUNTRY_NAMES)
  Germany: "DE",
  Austria: "AT",
  Switzerland: "CH",
  Netherlands: "NL",
  Belgium: "BE",
  France: "FR",
  "United Kingdom": "GB",
  Italy: "IT",
  Spain: "ES",
  Poland: "PL",
  "Czech Republic": "CZ",
  Denmark: "DK",
  Sweden: "SE",
  Norway: "NO",
  Finland: "FI",
  "United States": "US",
  Canada: "CA",
  Australia: "AU",
  Japan: "JP",
  China: "CN",
  India: "IN",
  Brazil: "BR",
  Mexico: "MX",
  "South Africa": "ZA",
  Portugal: "PT",
  Ireland: "IE",
  Greece: "GR",
  Hungary: "HU",
  Romania: "RO",
  Bulgaria: "BG",
  Croatia: "HR",
  Slovakia: "SK",
  Slovenia: "SI",
  Lithuania: "LT",
  Latvia: "LV",
  Estonia: "EE",
  Luxembourg: "LU",
  Bahamas: "BS",

  // Local language variations
  Deutschland: "DE",
  Österreich: "AT",
  Schweiz: "CH",
  "Schweiz/Suisse/Svizzera": "CH",
  Suisse: "CH",
  Svizzera: "CH",
  Nederland: "NL",
  "The Netherlands": "NL",
  "Belgique/België": "BE",
  België: "BE",
  Belgique: "BE",
  Italia: "IT",
  España: "ES",
  Polska: "PL",
  "Česká republika": "CZ",
  Czechia: "CZ",
  Danmark: "DK",
  Sverige: "SE",
  Norge: "NO",
  Suomi: "FI",
  "United States of America": "US",
  USA: "US",
  UK: "GB",
  "Great Britain": "GB",
  England: "GB",
  Éire: "IE",
  Magyarország: "HU",
  România: "RO",
  България: "BG",
  Hrvatska: "HR",
  Slovensko: "SK",
  Slovenija: "SI",
  Lietuva: "LT",
  Latvija: "LV",
  Eesti: "EE",
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
 * Get the ISO country code from a country name
 * Handles various name formats and local language variations
 *
 * @param {string} countryName - Country name in any supported language
 * @returns {string|null} - ISO country code (e.g., "DE") or null if not found
 */
export const getCountryCode = (countryName) => {
  if (!countryName) return null;

  // If it's already a 2-letter code, validate and return
  if (countryName.length === 2) {
    const upperCode = countryName.toUpperCase();
    if (COUNTRY_NAMES[upperCode]) {
      return upperCode;
    }
  }

  // Look up the name in our mapping
  const code = COUNTRY_NAME_TO_CODE[countryName];
  if (code) return code;

  // Try case-insensitive search
  const lowerName = countryName.toLowerCase();
  for (const [name, code] of Object.entries(COUNTRY_NAME_TO_CODE)) {
    if (name.toLowerCase() === lowerName) {
      return code;
    }
  }

  return null;
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

const toCoordinate = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/**
 * Calculate the great-circle distance in kilometers between two entities
 * with latitude/longitude values.
 *
 * @param {Object} source - First entity with latitude/longitude
 * @param {Object} target - Second entity with latitude/longitude
 * @returns {number|null} Distance in km or null when coordinates are missing
 */
export const calculateDistanceKm = (source, target) => {
  const from = normalizeLocationData(source);
  const to = normalizeLocationData(target);

  const lat1 = toCoordinate(from.latitude);
  const lon1 = toCoordinate(from.longitude);
  const lat2 = toCoordinate(to.latitude);
  const lon2 = toCoordinate(to.longitude);

  if ([lat1, lon1, lat2, lon2].some((value) => value === null)) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

export default {
  COUNTRY_NAMES,
  COUNTRY_NAME_TO_CODE,
  getCountryDisplayName,
  getCountryCode,
  normalizeLocationData,
  formatLocation,
  hasLocationChanged,
  calculateDistanceKm,
};
