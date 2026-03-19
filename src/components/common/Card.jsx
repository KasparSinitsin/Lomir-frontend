import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Tooltip from "./Tooltip";

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
  transparent = false,
  contentClassName = "",
  headerClassName = "",
  imageWrapperClassName = "",
  titleClassName = "",
  marginClassName = "",
  viewMode = "card",
  clickTooltip = null,
}) => {
  const [imageError, setImageError] = useState(false);
  const [rowTooltipVisible, setRowTooltipVisible] = useState(false);
  const [rowTooltipPosition, setRowTooltipPosition] = useState(null);
  const rowTooltipVisibleRef = useRef(false);
  const tooltipDimensionsRef = useRef({ width: 280, height: 52 });

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
      <div
        className={`flex justify-top ${imageWrapperClassName || "mb-4 pb-4"}`}
      >
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

  // Helper to compute truncation classes for the first direct <p>
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

  const handleRowMouseOver = clickTooltip
    ? (e) => {
        const shouldShow = !e.target.closest("[data-tooltip-trigger]");
        if (shouldShow !== rowTooltipVisibleRef.current) {
          rowTooltipVisibleRef.current = shouldShow;
          setRowTooltipVisible(shouldShow);
        }
      }
    : undefined;

  const handleRowMouseMove = clickTooltip
    ? (e) => {
        const shouldShow = !e.target.closest("[data-tooltip-trigger]");
        if (!shouldShow) {
          if (rowTooltipVisibleRef.current) {
            rowTooltipVisibleRef.current = false;
            setRowTooltipVisible(false);
          }
          return;
        }

        if (!rowTooltipVisibleRef.current) {
          rowTooltipVisibleRef.current = true;
          setRowTooltipVisible(true);
        }

        const tooltipGap = 14;
        const viewportPadding = 12;
        const { width, height } = tooltipDimensionsRef.current;

        const left = Math.min(
          Math.max(viewportPadding, e.clientX + 10),
          window.innerWidth - width - viewportPadding,
        );
        const top = Math.min(
          Math.max(viewportPadding, e.clientY + tooltipGap),
          window.innerHeight - height - viewportPadding,
        );

        setRowTooltipPosition({ top, left });
      }
    : undefined;

  const handleRowMouseLeave = clickTooltip
    ? () => {
        rowTooltipVisibleRef.current = false;
        setRowTooltipVisible(false);
        setRowTooltipPosition(null);
      }
    : undefined;

  if (viewMode === "list") {
    return (
      <>
      <div
        className={`
          flex items-center gap-3 px-4 py-2.5
          hover:shadow-md transition-shadow duration-300
          first:rounded-t-xl last:rounded-b-xl
          ${onClick ? "cursor-pointer" : ""}
          ${className}
        `}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onMouseOver={handleRowMouseOver}
        onMouseMove={handleRowMouseMove}
        onMouseLeave={handleRowMouseLeave}
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
        {(image || imageFallback) && (
          <div className="avatar placeholder flex-shrink-0">
            <div className="bg-primary text-primary-content rounded-full w-9 h-9 flex items-center justify-center">
              {typeof image === "string" &&
              (image.startsWith("http") ||
                image.startsWith("https") ||
                image.startsWith("data:")) &&
              !imageError ? (
                <img
                  src={image}
                  alt={imageAlt}
                  className="rounded-full object-cover w-full h-full"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-sm">
                  {imageFallback ||
                    (typeof image === "string"
                      ? generateInitials(image)
                      : "?")}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Tooltip content={title} wrapperClassName="block min-w-0 overflow-hidden">
            <div className="font-medium text-sm text-primary truncate">{title}</div>
          </Tooltip>
          {subtitle && (
            <div className="text-xs text-base-content/60 mt-px">{subtitle}</div>
          )}
        </div>

        {children}

        <Tooltip content={clickTooltip}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-base-content/30 flex-shrink-0"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Tooltip>
      </div>

      {rowTooltipVisible && rowTooltipPosition && clickTooltip && createPortal(
        <div
          role="tooltip"
          className="fixed z-[9999] bg-white text-[var(--color-primary-focus)] rounded-lg whitespace-pre-line text-left max-w-[280px] pointer-events-none"
          style={{
            top: `${rowTooltipPosition.top}px`,
            left: `${rowTooltipPosition.left}px`,
            padding: "0.5rem 0.75rem",
            fontSize: "0.775rem",
            fontWeight: 450,
            boxShadow: "0 2px 8px rgba(4, 80, 20, 0.15)",
          }}
          ref={(node) => {
            if (!node) return;

            tooltipDimensionsRef.current = {
              width: node.offsetWidth || tooltipDimensionsRef.current.width,
              height: node.offsetHeight || tooltipDimensionsRef.current.height,
            };
          }}
        >
          {clickTooltip}
        </div>,
        document.body
      )}
      </>
    );
  }

  return (
    <>
      <div
        className={`
        ${transparent ? "bg-transparent" : "background-opacity"}
        ${bordered ? "border border-base-200" : ""}
        ${hoverable ? "hover:shadow-md transition-shadow duration-300" : ""}
        shadow-soft
        rounded-xl
        overflow-hidden
        flex flex-col
        ${compact ? "card-compact" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
        bg-opacity-70
        ${marginClassName || "mb-6"}
      `}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onMouseOver={handleRowMouseOver}
        onMouseMove={handleRowMouseMove}
        onMouseLeave={handleRowMouseLeave}
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
          <div
            className={`p-6 sm:p-7 pb-0 sm:pb-1 border-base-200 ${headerClassName}`}
          >
            <div className="flex gap-3">
              <div>{renderImage()}</div>

              <div className="min-w-0 flex-1">
                <h3
                  className={`font-medium text-primary leading-[120%] mb-1 ${titleClassName || "text-lg"}`}
                >
                  {title}
                </h3>
                {subtitle && (
                  <p className={titleClassName ? "text-xs" : ""}>{subtitle}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Only the first direct <p> inside this wrapper will be clamped */}
        <div
          className={`p-4 sm:p-7 pt-0.5 sm:pt-1 flex-1 flex flex-col ${getTruncateClasses()} ${contentClassName}`}
        >
          {children}
        </div>

        {footer && (
          <div className="p-6 sm:p-7 bg-base-200/50 border-t border-base-200">
            {footer}
          </div>
        )}
      </div>

      {rowTooltipVisible && rowTooltipPosition && clickTooltip && createPortal(
        <div
          role="tooltip"
          className="fixed z-[9999] bg-white text-[var(--color-primary-focus)] rounded-lg whitespace-pre-line text-left max-w-[280px] pointer-events-none"
          style={{
            top: `${rowTooltipPosition.top}px`,
            left: `${rowTooltipPosition.left}px`,
            padding: "0.5rem 0.75rem",
            fontSize: "0.775rem",
            fontWeight: 450,
            boxShadow: "0 2px 8px rgba(4, 80, 20, 0.15)",
          }}
          ref={(node) => {
            if (!node) return;

            tooltipDimensionsRef.current = {
              width: node.offsetWidth || tooltipDimensionsRef.current.width,
              height: node.offsetHeight || tooltipDimensionsRef.current.height,
            };
          }}
        >
          {clickTooltip}
        </div>,
        document.body
      )}
    </>
  );
};

export default Card;
