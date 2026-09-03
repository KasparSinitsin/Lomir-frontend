import { useState, useEffect, useCallback } from "react";
import { useLocation } from "./useLocation";
import {
  getBrowserDefaultCountryCode,
  getCountryCode,
} from "../utils/locationUtils";

/**
 * useLocationAutoFill Hook
 *
 * Encapsulates location auto-fill logic for forms.
 * Automatically looks up city/country from postal code and provides
 * suggested updates that can be applied to form state.
 *
 * Features:
 * - Auto-fill city and country when a postal code resolves
 * - Respects user input: a field the user typed or cleared is never overwritten
 *   (the forms report that through LocationInput's onFieldEdited)
 * - Works with both user profile and team edit forms
 *
 * City and country are both filled from the same lookup, the one the user
 * triggers by typing their postal code. They are equally derived, equally
 * visible and equally removable - and the country is what the backend needs:
 * `resolveLocationData` skips geocoding entirely without one, so a profile
 * saved with no country gets no coordinates, and with them no distance search
 * and no map pin.
 *
 * What is deliberately NOT done is filling anything before the user has typed
 * at all. The browser's time zone is used as a hint **for the lookup** when no
 * country is selected, but it never lands in the form on its own: prefilling
 * from the device would record where someone is before they have said anything,
 * and the privacy notice under these fields promises the country can be left
 * empty.
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

  // The user's choice wins; the browser hint only keeps the lookup working
  // while the field is empty. It is never written back into the form.
  const lookupCountry = country || getBrowserDefaultCountryCode();

  const { location, loading, error } = useLocation(
    !isEditing || isRemote ? null : postalCode,
    lookupCountry || null,
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

    // Auto-fill city if the lookup returned one and the user has not typed a
    // city by hand. It deliberately overwrites a value that is merely present:
    // in edit mode the city always is, so requiring an empty field meant that
    // changing a postal code never updated the city - Munich stayed Munich
    // after the code moved to another town.
    if (location.city && !userEditedFields.city && location.city !== city) {
      updates.city = location.city;
    }

    // Auto-fill country if:
    // Same rule as the city: the lookup wins unless the user chose a country
    // themselves. Clearing the field via the X counts as choosing, so it is
    // not silently refilled.
    if (location.country && !userEditedFields.country) {
      // Convert country name to code for dropdown compatibility
      const countryCode = getCountryCode(location.country);
      if (countryCode && countryCode !== country) {
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
