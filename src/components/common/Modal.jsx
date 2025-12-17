// src/components/common/Modal.jsx
import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = "center",          // "center" | "top"
  size = "default",             // "small" | "default" | "large"
  maxHeight = "max-h-[90vh]",
  minHeight = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
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
      : size === "large"
      ? "max-w-4xl"
      : "max-w-2xl"; // default

  const positionClass =
    position === "top" ? "items-start mt-10" : "items-center";

  return createPortal(
    <div className={`fixed inset-0 z-[999] flex ${positionClass} justify-center`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal box */}
      <div
        className={`
          relative z-[1000]
          bg-base-100 rounded-xl shadow-soft
          w-full ${sizeClass} mx-4
          ${maxHeight} ${minHeight}
          overflow-y-auto
        `}
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
