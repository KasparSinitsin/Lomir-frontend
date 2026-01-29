import React from "react";
import { MapPin, Globe } from "lucide-react";
import CountrySelect from "../common/CountrySelect";

/**
 * TeamLocationInput Component
 * Location input fields for team creation/editing forms
 *
 * Provides two options:
 * 1. Physical location (postal code, city, country)
 * 2. Remote (no physical location)
 *
 * Consistent with user registration form layout
 */
const TeamLocationInput = ({
  formData,
  onChange,
  errors = {},
  disabled = false,
}) => {
  const isRemote = formData.is_remote || formData.isRemote || false;

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

    // If switching to remote, optionally clear location fields
    if (newIsRemote) {
      // Clear location fields when switching to remote
      onChange({ target: { name: "postal_code", value: "" } });
      onChange({ target: { name: "city", value: "" } });
      onChange({ target: { name: "country", value: "" } });
    }
  };

  return (
    <div className="space-y-4">
      {/* Location Section Divider */}
      <div className="divider text-sm text-base-content/60">
        <MapPin size={14} className="mr-1" />
        Location
      </div>

      {/* Remote Toggle */}
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

      {/* Location Fields - Only show if not remote */}
      {!isRemote && (
        <div className="space-y-4 animate-fadeIn">
          {/* Country Select */}
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Country</span>
            </label>
            <CountrySelect
              value={formData.country || ""}
              onChange={onChange}
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
          <div className="grid grid-cols-2 gap-4">
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
                value={formData.postal_code || formData.postalCode || ""}
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
                value={formData.city || ""}
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

          {/* Location fine print */}
          <p className="text-xs text-base-content/50 -mt-2 px-1">
            Location info is optional but helps users find teams nearby.
          </p>
        </div>
      )}
    </div>
  );
};

export default TeamLocationInput;
