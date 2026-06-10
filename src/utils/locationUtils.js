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
  CO: "Colombia",
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
  KE: "Kenya",
  NG: "Nigeria",
  GH: "Ghana",
  EG: "Egypt",
  MA: "Morocco",
  TZ: "Tanzania",
  ET: "Ethiopia",
  UG: "Uganda",
  ZW: "Zimbabwe",
  KR: "South Korea",
  KP: "North Korea",
  TH: "Thailand",
  VN: "Vietnam",
  MY: "Malaysia",
  SG: "Singapore",
  PH: "Philippines",
  ID: "Indonesia",
  PK: "Pakistan",
  BD: "Bangladesh",
  NZ: "New Zealand",
  AR: "Argentina",
  CL: "Chile",
  PE: "Peru",
  CO: "Colombia",
  VE: "Venezuela",
  UA: "Ukraine",
  TR: "Turkey",
  IL: "Israel",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  QA: "Qatar",
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
  Colombia: "CO",
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
  Colombie: "CO",
  Kolumbien: "CO",
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
const firstPresent = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const normalizePostalCode = (value) =>
  value === null || value === undefined ? "" : String(value).trim().toUpperCase();

const normalizeLocationKey = (value) =>
  value === null || value === undefined
    ? ""
    : String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const sameLocationPart = (left, right) =>
  normalizeLocationKey(left) === normalizeLocationKey(right);

const appendUniqueLocationPart = (parts, value) => {
  if (!value) return;
  if (!parts.some((part) => sameLocationPart(part, value))) {
    parts.push(value);
  }
};

const BERLIN_POSTAL_CODE_DISTRICTS = {
  10115: "Mitte",
  10117: "Mitte",
  10119: "Mitte",
  10178: "Mitte",
  10179: "Mitte",
  10243: "Friedrichshain",
  10245: "Friedrichshain",
  10247: "Friedrichshain",
  10249: "Friedrichshain",
  10315: "Lichtenberg",
  10317: "Lichtenberg",
  10318: "Karlshorst",
  10319: "Friedrichsfelde",
  10365: "Lichtenberg",
  10367: "Lichtenberg",
  10369: "Lichtenberg",
  10405: "Prenzlauer Berg",
  10407: "Prenzlauer Berg",
  10409: "Prenzlauer Berg",
  10435: "Prenzlauer Berg",
  10437: "Prenzlauer Berg",
  10439: "Prenzlauer Berg",
  10551: "Moabit",
  10553: "Moabit",
  10555: "Moabit",
  10557: "Tiergarten",
  10559: "Moabit",
  10585: "Charlottenburg",
  10587: "Charlottenburg",
  10589: "Charlottenburg",
  10623: "Charlottenburg",
  10625: "Charlottenburg",
  10627: "Charlottenburg",
  10629: "Charlottenburg",
  10707: "Wilmersdorf",
  10709: "Wilmersdorf",
  10711: "Halensee",
  10713: "Wilmersdorf",
  10715: "Wilmersdorf",
  10717: "Wilmersdorf",
  10719: "Charlottenburg",
  10777: "Schöneberg",
  10779: "Schöneberg",
  10781: "Schöneberg",
  10783: "Schöneberg",
  10785: "Tiergarten",
  10787: "Schöneberg",
  10789: "Charlottenburg",
  10823: "Schöneberg",
  10825: "Schöneberg",
  10827: "Schöneberg",
  10829: "Schöneberg",
  10961: "Kreuzberg",
  10963: "Kreuzberg",
  10965: "Kreuzberg",
  10967: "Kreuzberg",
  10969: "Kreuzberg",
  10997: "Kreuzberg",
  10999: "Kreuzberg",
  12043: "Neukölln",
  12045: "Neukölln",
  12047: "Neukölln",
  12049: "Neukölln",
  12051: "Neukölln",
  12053: "Neukölln",
  12055: "Neukölln",
  12057: "Neukölln",
  12059: "Neukölln",
  12101: "Tempelhof",
  12103: "Tempelhof",
  12105: "Tempelhof",
  12107: "Tempelhof",
  12109: "Tempelhof",
  12157: "Steglitz",
  12159: "Friedenau",
  12161: "Friedenau",
  12163: "Steglitz",
  12165: "Steglitz",
  12167: "Steglitz",
  12169: "Steglitz",
  12203: "Lichterfelde",
  12205: "Lichterfelde",
  12207: "Lichterfelde",
  12209: "Lichterfelde",
  12247: "Lankwitz",
  12249: "Lankwitz",
  12277: "Marienfelde",
  12279: "Marienfelde",
  12305: "Lichtenrade",
  12307: "Lichtenrade",
  12309: "Lichtenrade",
  12347: "Britz",
  12349: "Buckow",
  12351: "Buckow",
  12353: "Buckow",
  12355: "Rudow",
  12357: "Rudow",
  12359: "Britz",
  12435: "Alt-Treptow",
  12437: "Baumschulenweg",
  12439: "Niederschöneweide",
  12459: "Oberschöneweide",
  12487: "Johannisthal",
  12489: "Adlershof",
  12524: "Altglienicke",
  12526: "Bohnsdorf",
  12527: "Grünau",
  12555: "Köpenick",
  12557: "Köpenick",
  12559: "Köpenick",
  12587: "Friedrichshagen",
  12589: "Rahnsdorf",
  12619: "Kaulsdorf",
  12621: "Kaulsdorf",
  12623: "Mahlsdorf",
  12627: "Hellersdorf",
  12629: "Hellersdorf",
  12679: "Marzahn",
  12681: "Marzahn",
  12683: "Biesdorf",
  12685: "Marzahn",
  12687: "Marzahn",
  12689: "Marzahn",
  13051: "Wartenberg",
  13053: "Hohenschönhausen",
  13055: "Hohenschönhausen",
  13057: "Hohenschönhausen",
  13059: "Wartenberg",
  13086: "Weißensee",
  13088: "Weißensee",
  13089: "Heinersdorf",
  13125: "Buch",
  13127: "Pankow",
  13129: "Blankenburg",
  13156: "Niederschönhausen",
  13158: "Rosenthal",
  13159: "Blankenfelde",
  13187: "Pankow",
  13189: "Pankow",
  13347: "Wedding",
  13349: "Wedding",
  13351: "Wedding",
  13353: "Wedding",
  13355: "Gesundbrunnen",
  13357: "Gesundbrunnen",
  13359: "Gesundbrunnen",
  13403: "Reinickendorf",
  13405: "Reinickendorf",
  13407: "Reinickendorf",
  13409: "Reinickendorf",
  13435: "Märkisches Viertel",
  13437: "Wittenau",
  13439: "Märkisches Viertel",
  13465: "Frohnau",
  13467: "Hermsdorf",
  13469: "Waidmannslust",
  13503: "Heiligensee",
  13505: "Konradshöhe",
  13507: "Tegel",
  13509: "Tegel",
  13581: "Spandau",
  13583: "Spandau",
  13585: "Spandau",
  13587: "Hakenfelde",
  13589: "Falkenhagener Feld",
  13591: "Staaken",
  13593: "Wilhelmstadt",
  13595: "Wilhelmstadt",
  13597: "Spandau",
  13599: "Haselhorst",
  13627: "Charlottenburg",
  13629: "Siemensstadt",
  14050: "Westend",
  14052: "Westend",
  14053: "Westend",
  14055: "Westend",
  14057: "Charlottenburg",
  14059: "Charlottenburg",
  14089: "Kladow",
  14109: "Wannsee",
  14129: "Nikolassee",
  14163: "Zehlendorf",
  14165: "Zehlendorf",
  14167: "Zehlendorf",
  14169: "Zehlendorf",
  14193: "Grunewald",
  14195: "Dahlem",
  14197: "Wilmersdorf",
  14199: "Wilmersdorf",
};

const FRANKFURT_POSTAL_CODE_DISTRICTS = {
  60308: "Westend-Süd",
  60310: "Innenstadt",
  60311: "Innenstadt",
  60313: "Innenstadt",
  60329: "Bahnhofsviertel",
  60389: "Nordend-Ost",
  65933: "Griesheim",
  65934: "Höchst",
  65936: "Nied",
};

export const deriveLocationFromPostalCode = (postalCode, country) => {
  const code = normalizePostalCode(postalCode);
  if (!code) return {};

  const countryCode = getCountryCode(country) || (country ? String(country).toUpperCase() : null);
  if (countryCode && countryCode !== "DE") return {};

  const berlinDistrict = BERLIN_POSTAL_CODE_DISTRICTS[code];
  if (berlinDistrict) {
    return {
      city: "Berlin",
      state: "Berlin",
      country: "Germany",
      district: berlinDistrict,
    };
  }

  if (/^10\d{3}$|^11\d{3}$|^12\d{3}$|^13\d{3}$|^14[01]\d{2}$/.test(code)) {
    return { city: "Berlin", state: "Berlin", country: "Germany" };
  }

  const frankfurtDistrict = FRANKFURT_POSTAL_CODE_DISTRICTS[code];
  if (frankfurtDistrict) {
    return {
      city: "Frankfurt am Main",
      state: "Hessen",
      country: "Germany",
      district: frankfurtDistrict,
    };
  }

  if (/^60\d{3}$|^65\d{3}$/.test(code)) {
    return { city: "Frankfurt am Main", state: "Hessen", country: "Germany" };
  }

  return {};
};

export const normalizeLocationData = (entity) => {
  if (!entity) {
    return {
      postalCode: null,
      district: null,
      city: null,
      state: null,
      country: null,
      countryName: null,
      countryCode: null,
      latitude: null,
      longitude: null,
      isRemote: false,
      hasLocation: false,
    };
  }

  const postalCode = firstPresent(
    entity.postal_code,
    entity.postalCode,
    entity.location?.postal_code,
    entity.location?.postalCode,
    entity.role_location?.postal_code,
    entity.role_location?.postalCode,
    entity.roleLocation?.postal_code,
    entity.roleLocation?.postalCode,
  ) ?? null;
  const country = firstPresent(
    entity.country,
    entity.location?.country,
    entity.role_location?.country,
    entity.roleLocation?.country,
  ) ?? null;
  const derivedLocation = deriveLocationFromPostalCode(postalCode, country);
  const city = firstPresent(
    entity.city,
    entity.location?.city,
    entity.role_location?.city,
    entity.roleLocation?.city,
    derivedLocation.city,
  ) ?? null;
  const state = firstPresent(
    entity.state,
    entity.location?.state,
    entity.role_location?.state,
    entity.roleLocation?.state,
    derivedLocation.state,
  ) ?? null;
  const district = firstPresent(
    entity.district,
    entity.suburb,
    entity.borough,
    entity.cityDistrict,
    entity.city_district,
    entity.location?.district,
    entity.location?.suburb,
    entity.location?.borough,
    entity.location?.cityDistrict,
    entity.location?.city_district,
    entity.role_location?.district,
    entity.role_location?.suburb,
    entity.role_location?.borough,
    entity.role_location?.cityDistrict,
    entity.role_location?.city_district,
    entity.roleLocation?.district,
    entity.roleLocation?.suburb,
    entity.roleLocation?.borough,
    entity.roleLocation?.cityDistrict,
    entity.roleLocation?.city_district,
    derivedLocation.district,
  ) ?? null;
  const countryCode = getCountryCode(country);
  const latitude = firstPresent(
    entity.latitude,
    entity.lat,
    entity.location?.latitude,
    entity.location?.lat,
    entity.role_location?.latitude,
    entity.role_location?.lat,
    entity.roleLocation?.latitude,
    entity.roleLocation?.lat,
  ) ?? null;
  const longitude = firstPresent(
    entity.longitude,
    entity.lng,
    entity.lon,
    entity.location?.longitude,
    entity.location?.lng,
    entity.location?.lon,
    entity.role_location?.longitude,
    entity.role_location?.lng,
    entity.role_location?.lon,
    entity.roleLocation?.longitude,
    entity.roleLocation?.lng,
    entity.roleLocation?.lon,
  ) ?? null;
  const isRemote = entity.is_remote === true || entity.isRemote === true;

  // Determine if we have any location data
  const hasLocation = isRemote || !!(district || city || postalCode || state || country);

  return {
    postalCode,
    district,
    city,
    state,
    country,
    countryName: getCountryDisplayName(country),
    countryCode,
    latitude,
    longitude,
    isRemote,
    hasLocation,
  };
};

const normalizeComparableLocationValue = (value) =>
  value == null ? "" : String(value).trim().toLowerCase();

const normalizeComparableCountry = (value) =>
  getCountryCode(value == null ? null : String(value)) ??
  normalizeComparableLocationValue(value);

export const locationsHaveDifferentKnownParts = (source, target) => {
  const from = normalizeLocationData(source);
  const to = normalizeLocationData(target);
  const postalCodeFrom = normalizeComparableLocationValue(from.postalCode);
  const postalCodeTo = normalizeComparableLocationValue(to.postalCode);
  const cityFrom = normalizeComparableLocationValue(from.city);
  const cityTo = normalizeComparableLocationValue(to.city);
  const stateFrom = normalizeComparableLocationValue(from.state);
  const stateTo = normalizeComparableLocationValue(to.state);
  const countryFrom = normalizeComparableCountry(from.country);
  const countryTo = normalizeComparableCountry(to.country);

  const differs = (left, right) => left && right && left !== right;

  if (differs(countryFrom, countryTo) || differs(cityFrom, cityTo)) {
    return true;
  }

  if (cityFrom && cityFrom === cityTo) {
    return false;
  }

  return (
    differs(stateFrom, stateTo) ||
    differs(postalCodeFrom, postalCodeTo)
  );
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
 * @param {boolean} options.showCountryCode - Include ISO country code in output
 * @returns {string} Formatted location string
 */
export const formatLocation = (locationData, options = {}) => {
  const {
    displayType = "short",
    showPostalCode = false,
    showState = false,
    showCountry = true,
    showCountryCode = true,
  } = options;

  const { postalCode, district, city, state, countryName, countryCode } = locationData;

  if (!district && !city && !postalCode && !state && !countryName && !countryCode) {
    return "";
  }

  const appendCountryParts = () => {
    if (!showCountry) return;
    appendUniqueLocationPart(parts, countryName);
    if (showCountryCode && countryCode && !sameLocationPart(countryCode, countryName)) {
      appendUniqueLocationPart(parts, countryCode);
    }
  };

  const parts = [];

  switch (displayType) {
    case "city-only":
      appendUniqueLocationPart(parts, district || city);
      break;

    case "full":
      // Full format: postal code + district/city, state, country
      if (showPostalCode && postalCode && district) {
        parts.push(`${postalCode} ${district}`);
        appendUniqueLocationPart(parts, city);
      } else if (showPostalCode && postalCode && city) {
        parts.push(`${postalCode} ${city}`);
      } else if (district) {
        parts.push(district);
        appendUniqueLocationPart(parts, city);
      } else if (city) {
        parts.push(city);
      } else if (postalCode) {
        parts.push(postalCode);
      }

      if (
        showState &&
        state &&
        !sameLocationPart(state, city) &&
        !sameLocationPart(state, district)
      ) {
        appendUniqueLocationPart(parts, state);
      }

      appendCountryParts();
      break;

    case "short":
    default:
      // Short format: district/city, optional state, country
      if (district) {
        parts.push(district);
        appendUniqueLocationPart(parts, city);
      } else if (city) {
        parts.push(city);
      } else if (postalCode) {
        parts.push(postalCode);
      }

      if (
        showState &&
        state &&
        !sameLocationPart(state, city) &&
        !sameLocationPart(state, district)
      ) {
        appendUniqueLocationPart(parts, state);
      }

      appendCountryParts();
      break;
  }

  return parts.filter(Boolean).join(", ");
};

/**
 * Format location for list-style display.
 *
 * Returns a compact short string (city, country code) and a full string
 * (city, country name) while preserving the existing "Remote" behavior.
 *
 * @param {Object} entity - Entity with location fields (raw or normalized)
 * @param {Object} options
 * @param {boolean} options.isRemote - Whether the entity is remote
 * @returns {{ short: string, full: string }} Short and full location strings
 */
export const formatListLocation = (entity, { isRemote = false } = {}) => {
  if (isRemote) {
    return { short: "Remote", full: "Remote" };
  }

  const normalized = normalizeLocationData(entity);
  const full = [normalized.city, normalized.countryName].filter(Boolean).join(", ");
  const short =
    [normalized.city, normalized.countryCode].filter(Boolean).join(", ") || full;

  return { short, full };
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
  if (value === null || value === undefined || value === "") {
    return null;
  }

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

  const distanceKm = earthRadiusKm * c;

  if (distanceKm <= 0.5 && locationsHaveDifferentKnownParts(source, target)) {
    return null;
  }

  return distanceKm;
};

export default {
  COUNTRY_NAMES,
  COUNTRY_NAME_TO_CODE,
  getCountryDisplayName,
  getCountryCode,
  deriveLocationFromPostalCode,
  normalizeLocationData,
  formatLocation,
  hasLocationChanged,
  calculateDistanceKm,
  locationsHaveDifferentKnownParts,
};
