import React from "react";
import { Globe, MapPin } from "lucide-react";

/**
 * LocationModeToggle
 *
 * Controlled toggle: ON = team has location (isRemote = false)
 * OFF = remote team (isRemote = true)
 *
 * Mirrors VisibilityToggle styling (input-like wrapper + helper text).
 */
const LocationModeToggle = ({
  name = "isRemote",
  checked, // boolean: true => "Team with location"
  onChange,
  label = "Team Location",
  locationLabel = "This is a team with a location",
  remoteLabel = "This is a remote team",
  locationHelper = "Provide location information for your team. This information is optional.",
  remoteHelper = "Remote teams don't have a physical meeting location.",
  disabled = false,
  className = "",
}) => {
  const isLocationTeam = !!checked;

  return (
    <div className={`form-control w-full ${className}`}>
      <label className="label">
        <span className="label-text">{label}</span>
      </label>

      <div className="input input-bordered w-full h-auto px-4 py-3 flex flex-col items-start gap-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center min-w-0">
            {isLocationTeam ? (
              <MapPin
                className="text-primary mr-3 flex-shrink-0 opacity-90"
                size={22}
              />
            ) : (
              <Globe
                className="text-base-content mr-3 flex-shrink-0 opacity-60"
                size={22}
              />
            )}

            <span className="text-base-content font-normal truncate">
              {isLocationTeam ? locationLabel : remoteLabel}
            </span>
          </div>

          {/* Toggle on the right */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="toggle toggle-primary"
              name={name}
              checked={isLocationTeam}
              onChange={(e) => {
                // checked=true means "team with location"
                // so isRemote should become false
                // We delegate the mapping to parent in onChange.
                onChange?.(e);
              }}
              disabled={disabled}
            />
            <span className="sr-only">Toggle location mode</span>
          </label>
        </div>

        <p className="form-helper-text">
          {isLocationTeam ? locationHelper : remoteHelper}
        </p>
      </div>
    </div>
  );
};

export default LocationModeToggle;
