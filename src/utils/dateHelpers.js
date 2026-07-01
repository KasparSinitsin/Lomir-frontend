import { formatDistanceToNow, parseISO } from "date-fns";

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
  ZA: "Africa/Johannesburg", CO: "America/Bogota", AU: "Australia/Sydney",
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
  Australia: "Australia/Sydney",
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
  Griechenland: "Europe/Athens",  Australien: "Australia/Sydney",
};

const CITY_TIMEZONES = {
  Adelaide: "Australia/Adelaide",
  Sydney: "Australia/Sydney",
  Melbourne: "Australia/Melbourne",
  Brisbane: "Australia/Brisbane",
  Perth: "Australia/Perth",
  Darwin: "Australia/Darwin",
  Hobart: "Australia/Hobart",
  Canberra: "Australia/Sydney",
};

// ISO-2 codes and names for German-speaking countries.
const GERMAN_LOCALE_COUNTRIES = new Set([
  "DE", "AT", "CH", "LI",
  "Germany", "Austria", "Switzerland", "Liechtenstein",
  "Deutschland", "Österreich", "Schweiz", "Suisse", "Svizzera",
]);

// ISO-2 codes and names for English-speaking countries (AM/PM convention).
const ENGLISH_LOCALE_COUNTRIES = new Set([
  "US", "CA", "AU", "NZ", "IE", "GB", "ZA", "BS", "PH", "SG", "MY",
  "United States", "Canada", "Australia", "New Zealand", "Ireland",
  "United Kingdom", "South Africa", "Bahamas", "Philippines",
  "Singapore", "Malaysia", "Australien",
]);

const ENGLISH_LOCALE_CITIES = new Set([
  "Adelaide", "Sydney", "Melbourne", "Brisbane", "Perth", "Darwin",
  "Hobart", "Canberra",
]);

// Set by AuthContext after the user profile is loaded.
let _userTimezone = null;
let _userLocale = null;

// Call this from AuthContext whenever user data changes.
export const setUserTimezone = (user) => {
  if (!user) { _userTimezone = null; _userLocale = null; return; }

  const country = (user.country || user.country_code || "").trim();
  const city = (user.city || "").trim();

  // Derive locale from profile country.
  const countryLower = country.toLowerCase();
  const cityLower = city.toLowerCase();
  const isGerman = GERMAN_LOCALE_COUNTRIES.has(country) ||
    [...GERMAN_LOCALE_COUNTRIES].some(k => k.toLowerCase() === countryLower);
  const isEnglish = !isGerman && (
    ENGLISH_LOCALE_COUNTRIES.has(country) ||
    [...ENGLISH_LOCALE_COUNTRIES].some(k => k.toLowerCase() === countryLower) ||
    [...ENGLISH_LOCALE_CITIES].some(k => k.toLowerCase() === cityLower)
  );
  _userLocale = isGerman ? "de-DE" : isEnglish ? "en-US" : null;

  const cityMatch = Object.keys(CITY_TIMEZONES).find(k => k.toLowerCase() === cityLower);
  if (cityMatch) {
    _userTimezone = CITY_TIMEZONES[cityMatch];
    return;
  }

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
    _userLocale = "de-DE";
    return;
  }

  _userTimezone = null;
  console.warn("[dateHelpers] Could not resolve timezone from user profile. country =", JSON.stringify(country), "| postal =", JSON.stringify(postal));
};

// Display chat timestamps in the viewer's device timezone. Profile location only
// decides locale style (12-hour vs 24-hour), not the actual clock conversion.
const resolveTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || _userTimezone || "UTC";

// Returns the best available locale: profile-derived > browser default.
const resolveLocale = () =>
  _userLocale || navigator.language || undefined;

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

export const formatRelativeChatTimestamp = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";

  return formatDistanceToNow(date, { addSuffix: true }).replace("about ", "");
};

// Default archive grace period in days — mirrors the backend
// ARCHIVED_TEAM_GRACE_DAYS default. Kept in sync manually.
export const ARCHIVE_GRACE_DAYS = 14;

// Human-readable time left before an archived team (and its chat) is permanently
// deleted: whole days while more than a day remains, then remaining hours on the
// final day. Returns null when the archive date is missing/invalid.
export const formatArchiveTimeRemaining = (
  archivedAt,
  graceDays = ARCHIVE_GRACE_DAYS,
) => {
  const archivedDate = normalizeTimestampToDate(archivedAt);
  if (!archivedDate) return null;

  const deletionMs =
    archivedDate.getTime() + graceDays * 24 * 60 * 60 * 1000;
  const remainingMs = deletionMs - Date.now();
  if (remainingMs <= 0) return "less than an hour";

  const remainingHours = remainingMs / (60 * 60 * 1000);
  if (remainingHours < 24) {
    const hours = Math.max(1, Math.ceil(remainingHours));
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  const days = Math.floor(remainingHours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
};

// Milliseconds until formatArchiveTimeRemaining would next change its output:
// the next whole-day boundary while more than a day remains, otherwise the next
// hour boundary. Lets a caller refresh the countdown once per day (then hourly
// on the final day) instead of on every render. Returns null once the grace
// period has elapsed (nothing left to update).
export const msUntilNextArchiveChange = (
  archivedAt,
  graceDays = ARCHIVE_GRACE_DAYS,
) => {
  const archivedDate = normalizeTimestampToDate(archivedAt);
  if (!archivedDate) return null;

  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const remainingMs =
    archivedDate.getTime() + graceDays * DAY - Date.now();
  if (remainingMs <= 0) return null;

  const unit = remainingMs < DAY ? HOUR : DAY;
  const untilNext = remainingMs % unit;
  // +1s buffer so the recompute lands just past the boundary.
  return (untilNext === 0 ? unit : untilNext) + 1000;
};

export const formatShortRelativeChatTimestamp = (value) => {
  return formatRelativeChatTimestamp(value).replace(
    "less than a minute ago",
    "< minute ago",
  );
};

export const formatLocalTime = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  const locale = resolveLocale();
  const isGerman = _userLocale != null && _userLocale.startsWith("de");
  const isEnglish = _userLocale != null && _userLocale.startsWith("en");
  const formatted = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: isGerman ? false : isEnglish ? true : undefined,
    timeZone: resolveTimezone(),
  }).format(date);
  return isGerman ? `${formatted} Uhr` : formatted;
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
