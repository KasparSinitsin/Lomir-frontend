import { useState, useEffect, useCallback } from "react";
import { useLocation } from "./useLocation";
import { getCountryCode } from "../utils/locationUtils";

/**
 * useLocationAutoFill Hook
 *
 * Encapsulates location auto-fill logic for forms.
 * Automatically looks up city/country from postal code and provides
 * suggested updates that can be applied to form state.
 *
 * Features:
 * - Auto-fill city when postal code + country are provided
 * - Auto-fill country when postal code lookup returns a country
 * - Respects existing values (won't overwrite user input)
 * - Works with both user profile and team edit forms
 *
 * @param {Object} options
 * @param {string} options.postalCode - Current postal code value
 * @param {string} options.city - Current city value
 * @param {string} options.country - Current country code (e.g., "DE")
 * @param {boolean} options.isEditing - Whether the form is in edit mode
 * @param {boolean} options.isRemote - Whether this is a remote team (skips lookup)
 * @returns {Object} { location, loading, error, getSuggestedUpdates }
 */
export const useLocationAutoFill = ({
  postalCode = "",
  city = "",
  country = "",
  isEditing = true,
  isRemote = false,
}) => {
  // Track which fields the user has manually edited
  const [userEditedFields, setUserEditedFields] = useState({
    city: false,
    country: false,
  });

  // Use the existing location lookup hook
  // Pass country if available, otherwise let it auto-detect
  const { location, loading, error } = useLocation(
    isRemote ? null : postalCode,
    country || null,
  );

  // Reset user-edited tracking when postal code changes significantly
  useEffect(() => {
    if (!postalCode) {
      setUserEditedFields({ city: false, country: false });
    }
  }, [postalCode]);

  /**
   * Get suggested field updates based on the looked-up location
   * Only suggests updates for empty fields that user hasn't manually edited
   *
   * @param {Object} currentValues - Current form values { city, country }
   * @returns {Object} Updates to apply to form state (may be empty)
   */
  const getSuggestedUpdates = useCallback(() => {
    if (!location || !isEditing || isRemote) {
      return {};
    }

    const updates = {};

    // Auto-fill city if:
    // 1. We have a looked-up city
    // 2. Current city is empty
    // 3. User hasn't manually edited the city field
    if (location.city && !city && !userEditedFields.city) {
      updates.city = location.city;
    }

    // Auto-fill country if:
    // 1. We have a looked-up country
    // 2. Current country is empty
    // 3. User hasn't manually edited the country field
    if (location.country && !country && !userEditedFields.country) {
      // Convert country name to code for dropdown compatibility
      const countryCode = getCountryCode(location.country);
      if (countryCode) {
        updates.country = countryCode;
      }
    }

    return updates;
  }, [location, isEditing, isRemote, city, country, userEditedFields]);

  /**
   * Mark a field as manually edited by user
   * Call this when user types in city or country fields
   *
   * @param {string} fieldName - "city" or "country"
   */
  const markFieldAsEdited = useCallback((fieldName) => {
    if (fieldName === "city" || fieldName === "country") {
      setUserEditedFields((prev) => ({
        ...prev,
        [fieldName]: true,
      }));
    }
  }, []);

  /**
   * Reset the user-edited tracking
   * Useful when form is reset or when entering edit mode
   */
  const resetEditTracking = useCallback(() => {
    setUserEditedFields({ city: false, country: false });
  }, []);

  return {
    // The looked-up location data
    location,
    // Loading state from the geocoding lookup
    loading,
    // Any error from the lookup
    error,
    // Get suggested updates to apply to form
    getSuggestedUpdates,
    // Mark a field as user-edited (prevents auto-fill)
    markFieldAsEdited,
    // Reset edit tracking
    resetEditTracking,
  };
};

export default useLocationAutoFill;
