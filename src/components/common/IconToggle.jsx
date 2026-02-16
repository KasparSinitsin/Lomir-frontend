import React from "react";
import { Eye, EyeClosed } from "lucide-react";

const IconToggle = ({
  name,
  checked,
  onChange,

  // NEW: field-like props
  label, // e.g. "Profile Visibility"
  helperText, // optional small text shown on the right of the label row
  error, // optional string

  // Backwards compat: keep your current API
  title = "Visibility",
  visibleLabel = "Visible for all Users",
  hiddenLabel = "Hidden",
  visibleDescription = "Anyone can find and view this",
  hiddenDescription = "Only you can see this",
  entityType = "", // e.g. "team", "profile"
  className = "",
  disabled = false,
  id = undefined,
  showDescription = true,
}) => {
  // Generate a unique ID if none is provided
  const inputId =
    id || `toggle-${name}-${Math.random().toString(36).substr(2, 9)}`;

  // Force boolean
  const isChecked = checked === true;

  // Use label if provided, else fall back to title (so existing usage still works)
  const fieldLabel = label ?? title;

  // Customize descriptions based on entityType if provided
  const getVisibleDescription = () => {
    if (entityType === "team") return "Anyone can find and view your team";
    if (entityType === "profile")
      return "Your profile will be discoverable by other users";
    return visibleDescription;
  };

  const getHiddenDescription = () => {
    if (entityType === "team") return "Only members can see this team";
    if (entityType === "profile")
      return "Your profile will be hidden from search results";
    return hiddenDescription;
  };

  const description =
    isChecked ? getVisibleDescription() : getHiddenDescription();

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
        className={`flex items-center justify-between rounded-xl border p-4 ${
          error ? "border-error" : "border-base-300"
        } bg-base-100/60`}
      >
        <div className="flex items-center">
          {isChecked ? (
            <Eye size={24} className="text-primary mr-3 flex-shrink-0" />
          ) : (
            <EyeClosed
              size={24}
              className="text-base-content/70 mr-3 flex-shrink-0"
            />
          )}

          <span className="font-medium">
            {isChecked ? visibleLabel : hiddenLabel}
          </span>
        </div>

        <label
          htmlFor={inputId}
          className={`relative inline-flex items-center ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
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
          <span className="sr-only">Toggle visibility</span>
        </label>
      </div>

      {/* Helper / error row (matches other inputs) */}
      {error ? (
        <label className="label">
          <span className="label-text-alt text-error">{error}</span>
        </label>
      ) : (
        showDescription && (
          <label className="label">
            <span className="label-text-alt text-base-content/60">
              {description}
            </span>
          </label>
        )
      )}
    </div>
  );
};

export default IconToggle;
