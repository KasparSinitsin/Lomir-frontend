import { useState, useEffect } from "react";
import { geocodingService } from "../services/geocodingService";

// Long enough that typing a town name does not fire a request per keystroke -
// the geocoding endpoint is rate limited to 60 requests per 15 minutes.
const DEBOUNCE_MS = 700;

// Two letters is the shortest real place name (Ai, Uz); anything below that is
// someone mid-word.
const MIN_CITY_LENGTH = 2;

/**
 * Checks whether a town exists in the selected country.
 *
 * Only runs when there is no postal code: with one, the postal-code lookup
 * already establishes the place, and asking twice would produce two warnings
 * about the same thing.
 *
 * @param {string} city
 * @param {string} countryCode
 * @param {boolean} enabled - callers switch this off for remote teams etc.
 * @returns {Object} { verification, loading } - verification is null while
 *   nothing can be concluded, which is not the same as "not found"
 */
export const useCityInCountry = (city, countryCode, enabled = true) => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);

  const trimmedCity = String(city || "").trim();
  const country = String(countryCode || "").trim();

  useEffect(() => {
    if (!enabled || !country || trimmedCity.length < MIN_CITY_LENGTH) {
      setVerification(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      const result = await geocodingService.verifyCityInCountry(
        trimmedCity,
        country,
      );

      if (!active) return;

      // Keep the answer tied to what was asked, so a stale response cannot be
      // read against a name the user has since changed.
      setVerification(
        result ? { ...result, city: trimmedCity, country } : null,
      );
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmedCity, country, enabled]);

  return { verification, loading };
};

export default useCityInCountry;
