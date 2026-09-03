import React from "react";
import { MapPin, Globe, X } from "lucide-react";
import CountrySelect from "./CountrySelect";
import { getBrowserDefaultCountryCode } from "../../utils/locationUtils";
import FormSectionDivider from "./FormSectionDivider";
import { LOCATION_PRIVACY_NOTICE } from "../../constants/privacyText";

/**
 * LocationInput Component
 * Unified location input fields for both user and team forms
 *
 * Responsive layout:
 * - Mobile: All fields stacked vertically (1 column)
 * - Tablet (sm-lg): Country full width, Postal Code + City side by side (2 columns)
 * - Desktop (lg+): All three fields in one row (3 columns)
 *
 * @param {Object} props
 * @param {Object} props.formData - Form data object containing location fields
 * @param {Function} props.onChange - Change handler for form fields
 * @param {Object} props.errors - Validation errors object
 * @param {boolean} props.disabled - Disable all inputs
 * @param {boolean} props.showRemoteToggle - Show "Remote team" toggle (for teams only)
 * @param {boolean} props.showDivider - Show section divider with icon
 * @param {string} props.dividerText - Text for the divider (default: "Location")
 * @param {boolean} props.required - Mark fields as required
 * @param {Function} props.onFieldEdited - Called with "city" or "country" on manual edits
 * @param {Object} props.mismatch - Lookup disagreement to warn about, or null
 * @param {string} props.privacyNotice - Helper text shown below location fields
 * @param {string} props.className - Additional CSS classes
 */
/**
 * A text input with a clear button on the right, matching the one CountrySelect
 * already has. Having it in the field is what lets the warnings below stay
 * short: emptying a field is a click here, not a sentence there.
 *
 * `hasWarning` marks the value the lookup could not confirm, so the field
 * itself carries the state instead of only the sentence underneath. An error
 * outranks it - a value can be invalid and unconfirmed at once, and invalid is
 * the more serious of the two.
 */
const ClearableInput = ({
  name,
  value,
  placeholder,
  disabled,
  hasError,
  hasWarning,
  onChange,
  onClear,
  clearLabel,
}) => (
  <div className="relative">
    <input
      type="text"
      name={name}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      disabled={disabled}
      className={`input input-bordered w-full ${value ? "pr-10" : ""} ${
        hasError ? "input-error" : hasWarning ? "input-warning text-warning" : ""
      }`}
    />
    {value && !disabled && (
      <button
        type="button"
        onClick={onClear}
        className="absolute inset-y-0 right-2 my-auto h-7 w-7 flex items-center justify-center p-1 hover:bg-base-200 rounded transition-colors"
        aria-label={clearLabel}
      >
        <X size={14} className="text-base-content/50" />
      </button>
    )}
  </div>
);

const LocationInput = ({
  formData,
  onChange,
  errors = {},
  disabled = false,
  showRemoteToggle = false,
  showDivider = true,
  dividerText = "Location",
  required = false,
  // Called when the user types in city or edits country, so the auto-fill can
  // stop overwriting a value someone entered by hand.
  onFieldEdited = () => {},
  // { type: "postalCodeNotFound" | "cityMismatch", ... } from useLocationAutoFill
  mismatch = null,
  privacyNotice = LOCATION_PRIVACY_NOTICE,
  className = "",
}) => {
  // Normalize form data - handle both snake_case and camelCase
  const isRemote = formData.is_remote || formData.isRemote || false;
  const postalCode = formData.postal_code ?? formData.postalCode ?? "";
  const city = formData.city ?? "";
  const country = formData.country ?? "";

  // A postal code cannot be looked up without a country. Where none is
  // selected, the browser's time zone stands in - so the hint below is shown
  // only when even that is unavailable and the lookup genuinely cannot run.
  const lookupNeedsCountry =
    Boolean(postalCode) && !country && !getBrowserDefaultCountryCode();

  // Handle the remote toggle
  const handleRemoteToggle = (e) => {
    const newIsRemote = e.target.checked;

    // Create synthetic event for onChange handler
    onChange({
      target: {
        name: "is_remote",
        value: newIsRemote,
        type: "checkbox",
        checked: newIsRemote,
      },
    });

    // If switching to remote, clear location fields
    if (newIsRemote) {
      onChange({ target: { name: "postal_code", value: "" } });
      onChange({ target: { name: "city", value: "" } });
      onChange({ target: { name: "country", value: "" } });
    }
  };

  // Handle country select change (may have different event format)
  const handleCountryChange = (e) => {
    // Includes clearing the field via the X, which must also stop the auto-fill
    // from immediately putting the country back.
    onFieldEdited("country");

    // CountrySelect might pass value directly or as event
    if (typeof e === "string") {
      onChange({ target: { name: "country", value: e } });
    } else {
      onChange(e);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Divider */}
      {showDivider && <FormSectionDivider text={dividerText} icon={MapPin} />}

      {/* Remote Toggle - only for teams */}
      {showRemoteToggle && (
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              name="is_remote"
              checked={isRemote}
              onChange={handleRemoteToggle}
              className="checkbox checkbox-primary"
              disabled={disabled}
            />
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-primary" />
              <span className="label-text">This is a remote team</span>
            </div>
          </label>
          <p className="form-helper-text ml-10">
            Remote teams don't have a physical meeting location
          </p>
        </div>
      )}

      {/* Location Fields - hidden if remote */}
      {(!showRemoteToggle || !isRemote) && (
        <div className="space-y-4 animate-fadeIn">
          {/*
            Field order is Country -> Postal Code -> City, following what
            depends on what: the country makes the lookup possible, the postal
            code triggers it, and the city is the result it fills in. Asking for
            the city first would invite typing a value the lookup was about to
            supply - and a manually edited city suppresses the auto-fill.

            Responsive grid layout:
            - Mobile (default): 1 column - all fields stacked
            - Tablet (sm to lg): 2 columns - Country spans both on its own row,
              Postal + City side by side below it
            - Desktop (lg+): 3 columns - all fields in one row
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Country - asked first: it is what makes the postal-code lookup
                possible. Full width on tablet, 1/3 on desktop. */}
            <div className="form-control w-full sm:col-span-2 lg:col-span-1">
              <label className="label">
                <span className="label-text">
                  Country
                  {required ? (
                    <span className="text-error ml-1">*</span>
                  ) : (
                    " (optional)"
                  )}
                </span>
              </label>
              <CountrySelect
                value={country}
                onChange={handleCountryChange}
                name="country"
                placeholder="Select country"
                disabled={disabled}
              />
              {errors.country && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.country}
                  </span>
                </label>
              )}
            </div>
            {/* Postal Code */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Postal Code (optional)</span>
              </label>
              <ClearableInput
                name="postal_code"
                value={postalCode}
                placeholder="e.g., 12345"
                disabled={disabled}
                hasError={Boolean(errors.postal_code)}
                hasWarning={mismatch?.type === "postalCodeNotFound"}
                onChange={onChange}
                onClear={() =>
                  onChange({ target: { name: "postal_code", value: "" } })
                }
                clearLabel="Clear postal code"
              />
              {errors.postal_code && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.postal_code}
                  </span>
                </label>
              )}
              {!errors.postal_code && lookupNeedsCountry && (
                <p className="form-helper-text px-1">
                  Select a country to look this up
                </p>
              )}
              {!errors.postal_code &&
                !lookupNeedsCountry &&
                mismatch?.type === "postalCodeNotFound" && (
                  <p className="text-xs text-warning mt-2 px-1">
                    {mismatch.countryName
                      ? `Not found in ${mismatch.countryName}.`
                      : "Select a country to look this up."}
                  </p>
                )}
            </div>

            {/* City / Town */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">City / Town (optional)</span>
              </label>
              <ClearableInput
                name="city"
                value={city}
                placeholder="e.g., Berlin"
                disabled={disabled}
                hasError={Boolean(errors.city)}
                hasWarning={
                  mismatch?.type === "cityMismatch" ||
                  mismatch?.type === "cityNotInCountry"
                }
                onChange={(e) => {
                  onFieldEdited("city");
                  onChange(e);
                }}
                onClear={() => {
                  // Counts as a manual edit, or the lookup fills it straight
                  // back in - the same rule the country's clear button follows.
                  onFieldEdited("city");
                  onChange({ target: { name: "city", value: "" } });
                }}
                clearLabel="Clear city"
              />
              {errors.city && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.city}
                  </span>
                </label>
              )}
              {mismatch?.type === "cityNotInCountry" && (
                <p className="text-xs text-warning mt-2 px-1">
                  {`Not found in ${mismatch.countryName}.`}
                </p>
              )}
              {mismatch?.type === "cityMismatch" && (
                <p className="text-xs text-warning mt-2 px-1">
                  {`${mismatch.suggestedCity} is the city for ${mismatch.postalCode}. `}
                  <button
                    type="button"
                    className="link link-primary"
                    aria-label={`Use ${mismatch.suggestedCity}`}
                    onClick={() => {
                      onFieldEdited("city");
                      onChange({
                        target: {
                          name: "city",
                          value: mismatch.suggestedCity,
                        },
                      });
                    }}
                  >
                    Use it
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Helper text */}
          <p className="form-helper-text -mt-2 px-1">
            {privacyNotice}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationInput;
