import { useState, useEffect } from "react";
import { geocodingService } from "../services/geocodingService";

const MIN_POSTAL_CODE_LENGTH_BY_COUNTRY = {
  AT: 4,
  BE: 4,
  CA: 6,
  CH: 4,
  CO: 6,
  DE: 5,
  DK: 4,
  ES: 5,
  FR: 5,
  GB: 5,
  IT: 5,
  NL: 4,
  NO: 4,
  PL: 5,
  PT: 8,
  SE: 5,
  ZA: 4,
};

const compactPostalCode = (postalCode) =>
  String(postalCode || "").replace(/[\s-]/g, "").trim();

export const isLocationLookupReady = (postalCode, countryCode = null) => {
  const compactCode = compactPostalCode(postalCode);

  if (!compactCode) return false;

  const normalizedCountry =
    typeof countryCode === "string" ? countryCode.trim().toUpperCase() : null;
  const minLength = normalizedCountry
    ? MIN_POSTAL_CODE_LENGTH_BY_COUNTRY[normalizedCountry] || 3
    : /^\d+$/.test(compactCode)
      ? 5
      : 5;

  return compactCode.length >= minLength;
};

export const useLocation = (postalCode, countryCode = "DE") => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      if (!isLocationLookupReady(postalCode, countryCode)) {
        setLocation(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const locationData = await geocodingService.getLocationFromPostalCode(
          postalCode,
          countryCode
        );

        if (isMounted) {
          setLocation(locationData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          console.error("Location fetch error:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLocation();

    return () => {
      isMounted = false;
    };
  }, [postalCode, countryCode]);

  return { location, loading, error };
};
