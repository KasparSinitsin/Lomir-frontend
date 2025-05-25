import { useState, useEffect } from "react";
import { geocodingService } from "../services/geocodingService";

export const useLocation = (postalCode, countryCode = "DE") => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      if (!postalCode) {
        setLocation(null);
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
