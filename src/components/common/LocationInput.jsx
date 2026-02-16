import React from "react";
import { MapPin, Globe } from "lucide-react";
import CountrySelect from "./CountrySelect";
import FormSectionDivider from "./FormSectionDivider";

/**
 * LocationInput Component
 * Unified location input fields for both user and team forms
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
 * @param {string} props.className - Additional CSS classes
 */
const LocationInput = ({
  formData,
  onChange,
  errors = {},
  disabled = false,
  showRemoteToggle = false,
  showDivider = true,
  dividerText = "Location",
  required = false,
  className = "",
}) => {
  // Normalize form data - handle both snake_case and camelCase
  const isRemote = formData.is_remote || formData.isRemote || false;
  const postalCode = formData.postal_code ?? formData.postalCode ?? "";
  const city = formData.city ?? "";
  const country = formData.country ?? "";

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
          <p className="text-xs text-base-content/50 ml-10">
            Remote teams don't have a physical meeting location
          </p>
        </div>
      )}

      {/* Location Fields - hidden if remote */}
      {(!showRemoteToggle || !isRemote) && (
        <div className="space-y-4 animate-fadeIn">
          {/* Country Select */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">
                Country
                {required && <span className="text-error ml-1">*</span>}
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

          {/* Postal Code and City in a grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Postal Code</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 12345"
                className={`input input-bordered w-full ${
                  errors.postal_code ? "input-error" : ""
                }`}
                value={postalCode}
                onChange={onChange}
                name="postal_code"
                disabled={disabled}
              />
              {errors.postal_code && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.postal_code}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">City / Town</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Berlin"
                className={`input input-bordered w-full ${
                  errors.city ? "input-error" : ""
                }`}
                value={city}
                onChange={onChange}
                name="city"
                disabled={disabled}
              />
              {errors.city && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.city}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Helper text */}
          <p className="text-xs text-base-content/50 -mt-2 px-1">
            Location helps others find you nearby. This information is optional.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationInput;
