import React from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeClosed } from "lucide-react";

const VisibilityToggle = ({
  name,
  checked,
  onChange,

  // NEW: field-like props
  label, // e.g. "Profile Visibility"
  helperText, // optional small text shown on the right of the label row
  error, // optional string

  // Backwards compat: keep your current API. The defaults are resolved with
  // t() in the body rather than here, so a caller that passes nothing gets the
  // active language instead of a string frozen at module scope.
  title,
  visibleLabel,
  hiddenLabel,
  visibleDescription,
  hiddenDescription,
  entityType = "", // e.g. "team", "profile"
  className = "",
  disabled = false,
  id = undefined,
  showDescription = true,
}) => {
  const { t } = useTranslation();

  // Generate a unique ID if none is provided
  const inputId =
    id || `toggle-${name}-${Math.random().toString(36).substr(2, 9)}`;

  // Force boolean
  const isChecked = checked === true;

  // Use label if provided, else fall back to title (so existing usage still works)
  const fieldLabel = label ?? title ?? t("visibility.title");

  // A description passed by the caller wins, then entityType supplies a better
  // default than the generic one. This is the precedence `label`,
  // `visibleLabel` and `hiddenLabel` already follow.
  //
  // It used to be the other way round, and that made a prop silently dead:
  // RegisterForm passes entityType="profile" *and* its own hiddenDescription,
  // so the sentence about the profile staying private until the email is
  // verified never rendered, in either language.
  const getVisibleDescription = () => {
    if (visibleDescription != null) return visibleDescription;
    if (entityType === "team") return t("visibility.teamVisibleDescription");
    if (entityType === "profile")
      return t("visibility.profileVisibleDescription");
    return t("visibility.visibleDescription");
  };

  const getHiddenDescription = () => {
    if (hiddenDescription != null) return hiddenDescription;
    if (entityType === "team") return t("visibility.teamHiddenDescription");
    if (entityType === "profile")
      return t("visibility.profileHiddenDescription");
    return t("visibility.hiddenDescription");
  };

  const description = isChecked
    ? getVisibleDescription()
    : getHiddenDescription();

  return (
    <div className={`form-control w-full ${className}`}>
      {/* Label row (matches other inputs) */}
      {fieldLabel && (
        <label className="label">
          <span className={`label-text ${error ? "text-error" : ""}`}>
            {fieldLabel}
          </span>
          {helperText && (
            <span className="label-text-alt text-base-content/60">
              {helperText}
            </span>
          )}
        </label>
      )}

{/* Field body (input-like container) */}
<div
  className={`input input-bordered w-full h-auto px-4 py-3 ${
  error ? "input-error" : ""
} ${disabled ? "opacity-60 cursor-not-allowed" : ""} flex flex-col items-start gap-0`}
>
  {/* Row 1: icon + state text + toggle */}
  <div className="flex items-center justify-between w-full gap-3">
    <div className="flex items-center min-w-0">
      {isChecked ? (
        <Eye size={24} className="text-primary mr-3 flex-shrink-0" />
      ) : (
        <EyeClosed
          size={24}
          className="text-base-content opacity-60 mr-3 flex-shrink-0"
        />
      )}

      <span className="text-base-content font-normal min-w-0 break-words">
        {isChecked
          ? (visibleLabel ?? t("visibility.visible"))
          : (hiddenLabel ?? t("visibility.hidden"))}
      </span>
    </div>

    <label
      htmlFor={inputId}
      className={`relative inline-flex flex-shrink-0 items-center ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        id={inputId}
        type="checkbox"
        name={name}
        checked={isChecked}
        onChange={onChange}
        disabled={disabled}
        className="toggle toggle-primary"
      />
      <span className="sr-only">{t("visibility.toggleAria")}</span>
    </label>
  </div>

  {/* Row 2: helper/error */}
  {error ? (
    <p className="form-helper-text text-error">{error}</p>
  ) : (
    showDescription && <p className="form-helper-text">{description}</p>
  )}
</div>

    </div>
  );
};

export default VisibilityToggle;
