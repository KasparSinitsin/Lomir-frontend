import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Modal Component
 *
 * A flexible modal component that renders via portal to document.body.
 *
 * Z-Index Options:
 * - Use zIndexClass/boxZIndexClass for static Tailwind classes (e.g., "z-[999]")
 * - Use zIndexStyle/boxZIndexStyle for dynamic inline styles (e.g., { zIndex: 1100 })
 * - Inline styles take precedence over classes when both are provided
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Function} onClose - Callback when modal should close
 * @param {ReactNode} title - Modal title (string or JSX)
 * @param {ReactNode} children - Modal content
 * @param {ReactNode} footer - Optional footer content
 * @param {string} position - "center" or "top"
 * @param {string} size - "small", "default", "large", or "lg"
 * @param {string} maxHeight - Max height class (default: "max-h-[90vh]")
 * @param {string} minHeight - Min height class
 * @param {boolean} closeOnBackdrop - Close when clicking backdrop
 * @param {boolean} closeOnEscape - Close when pressing ESC
 * @param {boolean} showCloseButton - Show X button in header
 * @param {string} zIndexClass - Tailwind z-index class for backdrop (default: "z-[999]")
 * @param {string} boxZIndexClass - Tailwind z-index class for modal box (default: "z-[1000]")
 * @param {Object} zIndexStyle - Inline style for backdrop z-index (overrides zIndexClass)
 * @param {Object} boxZIndexStyle - Inline style for modal box z-index (overrides boxZIndexClass)
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = "center",
  size = "default",
  maxHeight = "max-h-[90vh]",
  minHeight = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  zIndexClass = "z-[999]",
  boxZIndexClass = "z-[1000]",
  zIndexStyle = null,
  boxZIndexStyle = null,
}) => {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const sizeClass =
    size === "small"
      ? "max-w-md"
      : size === "large" || size === "lg"
        ? "max-w-4xl"
        : "max-w-2xl"; // default

  const positionClass =
    position === "top" ? "items-start mt-10" : "items-center";

  // Determine whether to use inline styles or classes for z-index
  // Inline styles take precedence when provided
  const useInlineZIndex = zIndexStyle !== null;
  const useInlineBoxZIndex = boxZIndexStyle !== null;

  // Build backdrop className - exclude zIndexClass if using inline style
  const backdropClassName = `fixed inset-0 ${useInlineZIndex ? "" : zIndexClass} flex ${positionClass} justify-center`;

  // Build modal box className - exclude boxZIndexClass if using inline style
  const boxClassName = `
    relative ${useInlineBoxZIndex ? "" : boxZIndexClass}
    bg-base-100 rounded-xl shadow-soft
    w-full ${sizeClass} mx-4
    ${maxHeight} ${minHeight}
    overflow-y-auto overflow-x-hidden
  `;

  return createPortal(
    <div
      className={backdropClassName}
      style={useInlineZIndex ? zIndexStyle : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal box */}
      <div
        className={boxClassName}
        style={useInlineBoxZIndex ? boxZIndexStyle : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-4 border-b border-base-200">
            <div className="flex-1 min-w-0">
              {typeof title === "string" ? (
                <h2 className="text-lg font-semibold text-primary truncate">
                  {title}
                </h2>
              ) : (
                title
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                className="btn btn-sm btn-ghost ml-2"
                onClick={onClose}
                aria-label="Close modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <div className="p-4 border-t border-base-200 bg-base-100/80">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
