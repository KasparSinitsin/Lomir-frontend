import React from "react";
import { useTranslation } from "react-i18next";
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
  label,
  locationLabel,
  remoteLabel,
  locationHelper,
  remoteHelper,
  disabled = false,
  className = "",
}) => {
  const { t } = useTranslation();

  // Resolved here, never in the parameter list: a default there is evaluated
  // once at import and `changeLanguage` can never move it.
  const resolvedLabel = label ?? t("location.locationMode.label");
  const resolvedLocationLabel =
    locationLabel ?? t("location.locationMode.locationLabel");
  const resolvedRemoteLabel =
    remoteLabel ?? t("location.locationMode.remoteLabel");
  const resolvedLocationHelper =
    locationHelper ?? t("location.locationMode.locationHelper");
  const resolvedRemoteHelper =
    remoteHelper ?? t("location.locationMode.remoteHelper");

  const isLocationTeam = !!checked;

  return (
    <div className={`form-control w-full ${className}`}>
      <label className="label">
        <span className="label-text">{resolvedLabel}</span>
      </label>

      {/* Toggle row — kept inside the input-styled box (single row, no wrapping issues) */}
      <div className="input input-bordered w-full px-4 py-3 flex items-center justify-between">
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
            {isLocationTeam ? resolvedLocationLabel : resolvedRemoteLabel}
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
          <span className="sr-only">
            {t("location.locationMode.toggleAria")}
          </span>
        </label>
      </div>

      {/* Helper text lives OUTSIDE the .input container so DaisyUI's
          white-space:nowrap / overflow:hidden can't clip it */}
      <p className="form-helper-text mt-1 px-1">
        {isLocationTeam ? resolvedLocationHelper : resolvedRemoteHelper}
      </p>
    </div>
  );
};

export default LocationModeToggle;
