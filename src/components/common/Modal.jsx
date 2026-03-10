import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  useModalLayer,
  ModalLayerProvider,
  MODAL_Z_STEP,
} from "../../contexts/ModalLayerContext";

/**
 * Modal Component
 *
 * A flexible modal component that renders via portal to document.body.
 * Integrates with ModalLayerContext for automatic z-index management.
 *
 * Z-Index Priority (highest to lowest):
 * 1. Explicit zIndexStyle prop (inline style)
 * 2. ModalLayerContext value (if > default)
 * 3. Explicit zIndexClass prop (Tailwind class)
 *
 * Child modals automatically get a higher z-index via ModalLayerProvider.
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
 * @param {string} zIndexClass - Tailwind z-index class for backdrop (fallback)
 * @param {string} boxZIndexClass - Tailwind z-index class for modal box (fallback)
 * @param {Object} zIndexStyle - Inline style for backdrop z-index (highest priority)
 * @param {Object} boxZIndexStyle - Inline style for modal box z-index (highest priority)
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
  zIndexClass = "z-[50]",
  boxZIndexClass = "z-[51]",
  zIndexStyle = null,
  boxZIndexStyle = null,
}) => {
  // Get z-index from context (will be default 50 if no provider above)
  const layerZIndex = useModalLayer();

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

  // Determine effective z-index
  // Priority: explicit style > layer context (if elevated) > class
  const hasExplicitStyle = zIndexStyle !== null;
  const hasElevatedLayer = layerZIndex > 50;

  let effectiveZIndex = null;
  let effectiveBoxZIndex = null;
  let useInlineStyle = false;

  if (hasExplicitStyle) {
    // Explicit style takes highest priority
    effectiveZIndex = zIndexStyle.zIndex;
    effectiveBoxZIndex = boxZIndexStyle?.zIndex ?? effectiveZIndex + 1;
    useInlineStyle = true;
  } else if (hasElevatedLayer) {
    // Use layer context if elevated above default
    effectiveZIndex = layerZIndex;
    effectiveBoxZIndex = layerZIndex + 1;
    useInlineStyle = true;
  }
  // Otherwise, fall back to zIndexClass (no inline style)

  // Build class names
  const backdropClassName = `fixed inset-0 ${useInlineStyle ? "" : zIndexClass} flex ${positionClass} justify-center`;
  const boxClassName = `
    relative ${useInlineStyle ? "" : boxZIndexClass}
    bg-base-100 rounded-xl shadow-soft
    w-full ${sizeClass} mx-4
    ${maxHeight} ${minHeight}
    overflow-y-auto overflow-x-hidden
  `;

  // Z-index for child modals (this modal's z + step)
  const childLayerZIndex = (effectiveZIndex ?? 50) + MODAL_Z_STEP;

  return createPortal(
    <div
      className={backdropClassName}
      style={useInlineStyle ? { zIndex: effectiveZIndex } : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal box */}
      <div
        className={boxClassName}
        style={useInlineStyle ? { zIndex: effectiveBoxZIndex } : undefined}
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

        {/* Body - wrapped in ModalLayerProvider for child modals */}
        <div className="p-6">
          <ModalLayerProvider zIndex={childLayerZIndex}>
            {children}
          </ModalLayerProvider>
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="p-4 border-t border-base-200 bg-base-100/80">
            <ModalLayerProvider zIndex={childLayerZIndex}>
              {footer}
            </ModalLayerProvider>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
