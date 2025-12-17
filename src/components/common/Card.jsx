import React, { useState, useEffect } from "react";

const Card = ({
  title,
  subtitle,
  children,
  footer,
  className = "",
  compact = false,
  hoverable = true,
  bordered = true,
  image = null,
  imageFallback = null,
  imageAlt = "",
  imageSize = "medium",
  imageShape = "circle",
  onClick = null,
  truncateContent = 3,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when image prop changes
  useEffect(() => {
    setImageError(false);
  }, [image]);
  // Function to generate initials from a name
  const generateInitials = (name) => {
    if (typeof name !== "string") {
      return "";
    }
    const words = name.split(" ");
    return words.map((word) => word.charAt(0).toUpperCase()).join("");
  };

  // Function to render the image/avatar
  // Function to render the image/avatar
  const renderImage = () => {
    if (!image && !imageFallback) return null;

    // Determine image size class
    const sizeClass =
      {
        small: "w-12 h-12",
        medium: "w-16 h-16",
        large: "w-24 h-24",
      }[imageSize] || "w-16 h-16";

    // Determine shape class
    const shapeClass = imageShape === "circle" ? "rounded-full" : "rounded-lg";

    // Check if image is a URL
    const isUrl =
      typeof image === "string" &&
      (image.startsWith("http") ||
        image.startsWith("https") ||
        image.startsWith("data:"));

    // Determine fallback content (use imageFallback prop, or generate from image string, or "?")
    const fallbackContent =
      imageFallback ||
      (typeof image === "string" && !isUrl ? generateInitials(image) : "?");

    return (
      <div className="flex justify-top mb-4 pb-4">
        <div className="avatar placeholder">
          <div
            className={`bg-primary text-primary-content ${shapeClass} ${sizeClass} flex items-center justify-center`}
          >
            {isUrl && !imageError ? (
              // If image is a URL and hasn't errored, render an img tag
              <img
                src={image}
                alt={imageAlt}
                className={`${shapeClass} object-cover w-full h-full`}
                onError={() => setImageError(true)}
              />
            ) : (
              // Otherwise render the initials/placeholder
              <span className={imageSize === "large" ? "text-2xl" : "text-xl"}>
                {fallbackContent}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 🔹 Helper to compute truncation classes for the first direct <p>
  const getTruncateClasses = () => {
    if (!truncateContent) return "";

    const lines =
      typeof truncateContent === "number" && truncateContent > 0
        ? truncateContent
        : 3; // default: 3 lines

    if (lines === 1) {
      return "[&>p:first-of-type]:line-clamp-1 [&>p:first-of-type]:-mt-4";
    }
    if (lines === 2) {
      return "[&>p:first-of-type]:line-clamp-2 [&>p:first-of-type]:-mt-4";
    }
    // fallback + default: 3 lines
    return "[&>p:first-of-type]:line-clamp-3 [&>p:first-of-type]:-mt-4";
  };

  return (
    <div
      className={`
      background-opacity
      ${bordered ? "border border-base-200" : ""}
      ${hoverable ? "hover:shadow-md transition-shadow duration-300" : ""}
      shadow-soft
      rounded-xl
      overflow-hidden
      ${compact ? "card-compact" : ""}
      ${onClick ? "cursor-pointer" : ""}
      ${className}
      bg-opacity-70
      mb-6
      mr-4
    `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
    >
      {title && (
        <div className="p-6 sm:p-7 border-base-200">
          <div className="flex gap-3">
            <div>{renderImage()}</div>

            <div>
              <h3 className="text-lg font-medium text-primary">{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Only the first direct <p> inside this wrapper will be clamped */}
      <div className={`p-4 sm:p-7 ${getTruncateClasses()}`}>{children}</div>

      {footer && (
        <div className="p-6 sm:p-7 bg-base-200/50 border-t border-base-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
