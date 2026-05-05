import { parseISO } from "date-fns";

// Maps country names (Nominatim) and ISO-2 codes to IANA timezone identifiers.
// Country names come from the geocoding service (OpenStreetMap/Nominatim).
// Nominatim may return names in English OR in the local language of the country,
// so both variants are included here.
const COUNTRY_TIMEZONES = {
  // ISO-2 codes
  DE: "Europe/Berlin",   AT: "Europe/Vienna",   CH: "Europe/Zurich",
  NL: "Europe/Amsterdam", BE: "Europe/Brussels", FR: "Europe/Paris",
  ES: "Europe/Madrid",   IT: "Europe/Rome",     PT: "Europe/Lisbon",
  GB: "Europe/London",   IE: "Europe/Dublin",   PL: "Europe/Warsaw",
  CZ: "Europe/Prague",   SK: "Europe/Bratislava", HU: "Europe/Budapest",
  SE: "Europe/Stockholm", NO: "Europe/Oslo",    DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki", EE: "Europe/Tallinn",  LV: "Europe/Riga",
  LT: "Europe/Vilnius",  RO: "Europe/Bucharest", BG: "Europe/Sofia",
  HR: "Europe/Zagreb",   SI: "Europe/Ljubljana", GR: "Europe/Athens",
  ZA: "Africa/Johannesburg", CO: "America/Bogota",
  // English names
  Germany: "Europe/Berlin",       Austria: "Europe/Vienna",
  Switzerland: "Europe/Zurich",   Netherlands: "Europe/Amsterdam",
  Belgium: "Europe/Brussels",     France: "Europe/Paris",
  Spain: "Europe/Madrid",         Italy: "Europe/Rome",
  Portugal: "Europe/Lisbon",      "United Kingdom": "Europe/London",
  Ireland: "Europe/Dublin",       Poland: "Europe/Warsaw",
  "Czech Republic": "Europe/Prague", Czechia: "Europe/Prague",
  Slovakia: "Europe/Bratislava",  Hungary: "Europe/Budapest",
  Sweden: "Europe/Stockholm",     Norway: "Europe/Oslo",
  Denmark: "Europe/Copenhagen",   Finland: "Europe/Helsinki",
  Estonia: "Europe/Tallinn",      Latvia: "Europe/Riga",
  Lithuania: "Europe/Vilnius",    Romania: "Europe/Bucharest",
  Bulgaria: "Europe/Sofia",       Croatia: "Europe/Zagreb",
  Slovenia: "Europe/Ljubljana",   Greece: "Europe/Athens",
  "South Africa": "Africa/Johannesburg", Colombia: "America/Bogota",
  // Local language names (Nominatim returns these when no language is specified)
  Deutschland: "Europe/Berlin",   Österreich: "Europe/Vienna",
  Schweiz: "Europe/Zurich",       Suisse: "Europe/Zurich",
  Svizzera: "Europe/Zurich",      Nederland: "Europe/Amsterdam",
  Frankreich: "Europe/Paris",     Spanien: "Europe/Madrid",
  Italien: "Europe/Rome",         Polen: "Europe/Warsaw",
  Tschechien: "Europe/Prague",    Slowakei: "Europe/Bratislava",
  Ungarn: "Europe/Budapest",      Schweden: "Europe/Stockholm",
  Norwegen: "Europe/Oslo",        Dänemark: "Europe/Copenhagen",
  Finnland: "Europe/Helsinki",    Estland: "Europe/Tallinn",
  Lettland: "Europe/Riga",        Litauen: "Europe/Vilnius",
  Rumänien: "Europe/Bucharest",   Bulgarien: "Europe/Sofia",
  Kroatien: "Europe/Zagreb",      Slowenien: "Europe/Ljubljana",
  Griechenland: "Europe/Athens",
};

// Set by AuthContext after the user profile is loaded.
let _userTimezone = null;

// Call this from AuthContext whenever user data changes.
export const setUserTimezone = (user) => {
  if (!user) { _userTimezone = null; return; }

  const country = (user.country || user.country_code || "").trim();

  // Direct match
  if (COUNTRY_TIMEZONES[country]) {
    _userTimezone = COUNTRY_TIMEZONES[country];
    return;
  }

  // Case-insensitive match (handles lowercase country codes etc.)
  const lower = country.toLowerCase();
  const match = Object.keys(COUNTRY_TIMEZONES).find(k => k.toLowerCase() === lower);
  if (match) {
    _userTimezone = COUNTRY_TIMEZONES[match];
    return;
  }

  // Postal code fallback: 5-digit German postal codes are unambiguous
  const postal = (user.postalCode || user.postal_code || "").trim();
  if (/^\d{5}$/.test(postal)) {
    _userTimezone = "Europe/Berlin";
    return;
  }

  _userTimezone = null;
  console.warn("[dateHelpers] Could not resolve timezone from user profile. country =", JSON.stringify(country), "| postal =", JSON.stringify(postal));
};

// Returns the best available timezone: profile-derived > browser > UTC.
const resolveTimezone = () =>
  _userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const hasTimezoneOffset = (value) => /[zZ]$|[+-]\d{2}(?::?\d{2})?$/.test(value);

const normalizeServerTimestamp = (value) => {
  if (value instanceof Date) return value;
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return new Date(Number(raw));
  }

  const normalized = raw.replace(" ", "T");
  if (!hasTimezoneOffset(normalized)) {
    // Server stores timestamps in UTC without a timezone marker — treat as UTC.
    return parseISO(normalized + "Z");
  }

  return parseISO(normalized);
};

export const normalizeTimestampToDate = (value) => {
  const date = normalizeServerTimestamp(value);
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

export const formatLocalTime = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: resolveTimezone(),
  }).format(date);
};

// Returns "YYYY-MM-DD" in the user's local timezone — used to group messages by day.
const toLocalDateString = (date, tz) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const formatDateHeading = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  const tz = resolveTimezone();
  const dateStr = toLocalDateString(date, tz);
  const todayStr = toLocalDateString(new Date(), tz);
  const yesterday = new Date(Date.now() - 86_400_000);
  const yesterdayStr = toLocalDateString(yesterday, tz);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const getDateGroupKey = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  return toLocalDateString(date, resolveTimezone());
};
