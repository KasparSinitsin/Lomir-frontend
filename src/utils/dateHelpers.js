import { parseISO } from "date-fns";
import i18n from "../i18n";
import { getActiveLocale } from "./languageUtils";

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

// Set by AuthContext after the user profile is loaded.
let _userTimezone = null;

/**
 * Call this from AuthContext whenever user data changes.
 *
 * ⚠️ Timezone only. This function used to derive a *locale* from the profile
 * country as well, through its own country and city sets - a second rule
 * answering the same question as resolveLanguage(), and one that knew nothing
 * about preferred_language. A user in Germany who chose English got an
 * English UI with German dates. The one rule now lives in
 * utils/languageUtils.js and reaches this file as i18n.language.
 */
export const setUserTimezone = (user) => {
  if (!user) { _userTimezone = null; return; }

  const country = (user.country || user.country_code || "").trim();
  const city = (user.city || "").trim();
  const cityLower = city.toLowerCase();

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
    return;
  }

  _userTimezone = null;
  console.warn("[dateHelpers] Could not resolve timezone from user profile. country =", JSON.stringify(country), "| postal =", JSON.stringify(postal));
};

// Display chat timestamps in the viewer's device timezone. Profile location only
// decides locale style (12-hour vs 24-hour), not the actual clock conversion.
const resolveTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || _userTimezone || "UTC";

// Intl.DateTimeFormat construction is the expensive part, formatting is cheap,
// and these run per rendered message. Keyed by locale so a language change
// simply misses the cache instead of needing invalidation.
const formatterCache = new Map();
const getDateFormatter = (options) => {
  const locale = getActiveLocale();
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
};

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

/**
 * The app's date formats, as named intentions rather than patterns.
 *
 * These replace ~43 date-fns format() calls that carried their own pattern
 * string (`MMM d, yyyy`, `MM/dd/yy`, …). A pattern cannot be localized:
 * passing a German locale to `MMM d, yyyy` fixes the month name and leaves
 * the American order, so the correct-looking fix would need a pattern table
 * per language. Intl style options get name *and* order right from CLDR, for
 * every language, with nothing to maintain.
 *
 * Verified output, en / de:
 *   Numeric      09/04/26          04/09/26
 *   Medium       Sep 4, 2026       4. Sept. 2026
 *   Long         September 4, 2026 4. September 2026
 *   MonthYear    September 2026    September 2026
 *   MonthNumeric 09/26             09/26
 *
 * ⚠️ Exported but not called yet - the ~43 call sites move over in the
 * follow-up branch feature/i18n-formatting. Not dead code; unfinished work.
 */
const dateFormatter = (options) => (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  return getDateFormatter(options).format(date);
};

/**
 * The all-numeric formats keep the slash in every language.
 *
 * German writes 04.09.26 and English 09/04/26 - two things differ, the field
 * order and the separator. Only the *order* is information; the separator is
 * part of how the UI looks, and letting it change per language would mean the
 * same control renders in two visual styles. So Intl decides the order, from
 * CLDR, and the separator is set here.
 *
 * Works by dropping the locale's own separators from formatToParts and
 * rejoining. Sound for the languages Lomir offers, where every literal
 * between the fields *is* a separator; a language that inserts a word between
 * the parts would need this revisited.
 */
const slashFormatter = (options) => (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  return getDateFormatter(options)
    .formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join("/");
};

export const formatDateNumeric = slashFormatter({
  day: "2-digit", month: "2-digit", year: "2-digit",
});
export const formatDateMedium = dateFormatter({
  day: "numeric", month: "short", year: "numeric",
});
export const formatDateLong = dateFormatter({
  day: "numeric", month: "long", year: "numeric",
});
export const formatMonthYear = dateFormatter({
  month: "long", year: "numeric",
});
export const formatMonthNumeric = slashFormatter({
  month: "2-digit", year: "2-digit",
});

// Largest unit first; the search stops at the first one that fits.
const RELATIVE_UNITS = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * Relative time, e.g. "5 minutes ago" / "vor 5 Minuten".
 *
 * ⚠️ This replaces date-fns formatDistanceToNow, and it is not only about
 * the language. The old code post-processed the English output with
 * .replace("about ", "") and .replace("less than a minute ago", …) - string
 * hacks that stop matching the moment the output is German, silently, with
 * the unpatched text coming back instead. Intl.RelativeTimeFormat needs no
 * post-processing, ships with the browser (no locale bundle to import) and is
 * correct in every language.
 *
 * numeric: "always" keeps the current wording: "1 day ago", not "yesterday".
 */
const formatRelative = (date, { short = false } = {}) => {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  // 30 s, not 60 s, and that is on purpose: date-fns switched to "1 minute
  // ago" at 30 s, and a probe against the old implementation caught the
  // difference. Rounding below does the rest, so 45 s still reads "1 minute
  // ago" - the output is unchanged in English at every threshold.
  if (absMs < 30 * 1000) {
    return i18n.t(short ? "datetime.justNowShort" : "datetime.justNow");
  }

  // Anything between 30 s and a minute falls through the list; minute is the
  // floor, so it is the fallback rather than an undefined destructure.
  const [unit, unitMs] =
    RELATIVE_UNITS.find(([, size]) => absMs >= size) ||
    RELATIVE_UNITS[RELATIVE_UNITS.length - 1];

  return new Intl.RelativeTimeFormat(getActiveLocale(), {
    numeric: "always",
  }).format(Math.round(diffMs / unitMs), unit);
};

export const formatRelativeChatTimestamp = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";

  return formatRelative(date);
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
  if (remainingMs <= 0) return i18n.t("datetime.archiveRemainingUnderAnHour");

  const remainingHours = remainingMs / (60 * 60 * 1000);
  if (remainingHours < 24) {
    const hours = Math.max(1, Math.ceil(remainingHours));
    return i18n.t("datetime.archiveRemainingHours", { count: hours });
  }

  const days = Math.floor(remainingHours / 24);
  return i18n.t("datetime.archiveRemainingDays", { count: days });
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
  const date = normalizeTimestampToDate(value);
  if (!date) return "";

  return formatRelative(date, { short: true });
};

export const formatLocalTime = (value) => {
  const date = normalizeTimestampToDate(value);
  if (!date) return "";
  // hour12 is no longer decided here: Intl derives it from the locale
  // (en -> 2:05 PM, de -> 14:05), which is the same answer the old country
  // sets tried to give. "Uhr" is a German convention Intl does not add, so it
  // lives in the translation as a whole message with a named placeholder -
  // never as a suffix concatenated in code.
  const time = getDateFormatter({
    hour: "numeric",
    minute: "2-digit",
    timeZone: resolveTimezone(),
  }).format(date);
  return i18n.t("datetime.timeOfDay", { time });
};

// Returns "YYYY-MM-DD" in the user's local timezone — used to group messages by day.
//
// ⚠️ en-CA is deliberate and must NOT follow the user's language. This is a
// sort/compare key, not a display format: German would produce "4.9.2026",
// the string comparisons in formatDateHeading and getDateGroupKey would stop
// matching, and every message would land in its own day group.
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
  if (dateStr === todayStr) return i18n.t("datetime.today");
  if (dateStr === yesterdayStr) return i18n.t("datetime.yesterday");
  return getDateFormatter({
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
