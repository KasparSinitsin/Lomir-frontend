import React from "react";

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
  imageAlt = "",
  imageSize = "medium",
  imageShape = "circle",
  onClick = null, 
}) => {
  // Function to generate initials from a name
  const generateInitials = (name) => {
    if (typeof name !== "string") {
      return "";
    }
    const words = name.split(" ");
    return words.map((word) => word.charAt(0).toUpperCase()).join("");
  };

  // Function to render the image/avatar
  const renderImage = () => {
    if (!image) return null;

    // Determine image size class
    const sizeClass =
      {
        small: "w-12 h-12",
        medium: "w-16 h-16",
        large: "w-24 h-24",
      }[imageSize] || "w-16 h-16";

    // Determine shape class
    const shapeClass = imageShape === "circle" ? "rounded-full" : "rounded-lg";

    return (
      <div className="flex justify-top mb-4 pb-4">
        <div className="avatar placeholder">
          <div
            className={`bg-primary text-primary-content ${shapeClass} ${sizeClass} flex items-center justify-center`}
          >
            {typeof image === "string" &&
            (image.startsWith("http") ||
              image.startsWith("https") ||
              image.startsWith("data:")) ? (
              // If image is a URL, render an img tag
              <img
                src={image}
                alt={imageAlt}
                className={`${shapeClass} object-cover w-full h-full`}
              />
            ) : (
              // Otherwise render the initials/placeholder
              <span className={imageSize === "large" ? "text-2xl" : "text-xl"}>
                {typeof image === "string" ? generateInitials(image) : image}
              </span>
            )}
          </div>
        </div>
      </div>
    );
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
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
    >
      {title && (
        <div className="p-6 sm:p-7 border-base-200">
          <div className="flex gap-3">
            <div>
              {renderImage()}
            </div>

            <div>
              <h3 className="text-lg font-medium text-primary">{title}</h3>
              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-7">{children}</div>

      {footer && (
        <div className="p-6 sm:p-7 bg-base-200/50 border-t border-base-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;