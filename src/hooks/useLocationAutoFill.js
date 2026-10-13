import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "./useLocation";
import { useCityInCountry } from "./useCityInCountry";
import {
  getBrowserDefaultCountryCode,
  getCountryCode,
  cityAgreesWithLookup,
  getCountryDisplayName,
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
/**
 * What a blocking mismatch means for a form: which field carries the value that
 * could not be confirmed, and what to tell the user.
 *
 * Lives here rather than in each form so that the five forms using this hook
 * cannot drift apart, and so a new mismatch type is handled everywhere at once.
 *
 * @param {Object} mismatch - from `locationMismatch`
 * @returns {Object} { clearField, message } - clearField is "postalCode",
 *   "city" or null when the user has to decide rather than lose a value
 */
export const describeLocationBlock = (mismatch) => {
  if (!mismatch) return { clearField: null, message: null };

  if (mismatch.type === "postalCodeNotFound") {
    return {
      clearField: "postalCode",
      message: `Postal code ${mismatch.postalCode} does not exist in ${mismatch.countryName} and was removed. Save again to store the rest of your location.`,
    };
  }

  if (mismatch.type === "cityNotInCountry") {
    return {
      clearField: "city",
      message: `${mismatch.city} was not found in ${mismatch.countryName} and was removed. Save again to store the rest of your location.`,
    };
  }

  return {
    clearField: null,
    message: `${mismatch.suggestedCity} is the city for ${mismatch.postalCode}. Choose which value to keep before saving.`,
  };
};

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

  // Without a postal code nothing above can check the city, so it is verified
  // against the country directly. With one, the postal-code lookup already
  // settles the place and asking twice would warn twice about the same thing.
  const { verification: cityVerification } = useCityInCountry(
    city,
    country,
    isEditing && !isRemote && !postalCode,
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
   * What the lookup says about the values the user entered.
   *
   * - `postalCodeNotFound`: the code did not resolve. **With a country chosen
   *   this blocks saving**: the country is the user's own statement, so a code
   *   that does not exist in it is the unverifiable half of the pair, and
   *   storing it produces records like "63837 Sulzbach am Main" where the town
   *   is real and the code is not. Without a chosen country it stays advisory,
   *   because the lookup then ran against a guessed country and failing there
   *   proves nothing.
   * - `cityNotInCountry`: there is no postal code, and the town does not exist
   *   in the chosen country - the case that let "Berlin, Austria" be saved.
   *   The country comes from a fixed list and the town is free text, so the
   *   town is the unverifiable half.
   * - `cityMismatch`: the code resolved somewhere with nothing in common with
   *   the city that was typed. This one **must be answered before saving**
   *   (`blocksSubmit`), because the combination is not merely unverified: the
   *   backend geocodes postal code, city and country as a single query, so a
   *   contradictory pair yields wrong coordinates or none at all.
   *
   * Both answers resolve the contradiction in the data rather than agreeing to
   * store it: taking the looked-up city keeps the postal code, keeping the
   * typed city drops the postal code. Nothing that names two different places
   * can be saved. The cost is real and accepted: someone in a neighbouring
   * village sharing a postal code the lookup does not name loses the postal
   * code rather than the city.
   */
  const locationMismatch = useMemo(() => {
    if (!isEditing || isRemote) return null;

    // No postal code: the only thing that can be checked is whether the town
    // exists in the chosen country.
    if (!postalCode) {
      if (city && country && cityVerification?.found === false) {
        return {
          type: "cityNotInCountry",
          city,
          countryName: getCountryDisplayName(country),
          blocksSubmit: true,
        };
      }

      return null;
    }

    if (loading || error) return null;
    if (!location) return null;

    if (!location.city) {
      const countryName = country ? getCountryDisplayName(country) : null;

      return {
        type: "postalCodeNotFound",
        postalCode,
        countryName,
        blocksSubmit: Boolean(countryName),
      };
    }

    if (city && !cityAgreesWithLookup(city, location)) {
      return {
        type: "cityMismatch",
        postalCode,
        suggestedCity: location.city,
        blocksSubmit: true,
      };
    }

    return null;
  }, [
    isEditing,
    isRemote,
    postalCode,
    loading,
    error,
    location,
    city,
    country,
    cityVerification,
  ]);

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
    // Disagreement between the entered values and the lookup, or null
    locationMismatch,
    // Mark a field as user-edited (prevents auto-fill)
    markFieldAsEdited,
    // Reset edit tracking
    resetEditTracking,
  };
};

export default useLocationAutoFill;
