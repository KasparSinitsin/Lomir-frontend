import React from "react";
import { X } from "lucide-react";

/**
 * Enhanced Modal that preserves unique styling while centralizing scroll behavior
 * Supports multiple positioning modes and custom styling
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  
  // Size options
  size = "default", // "sm", "default", "lg", "xl"
  
  // Position options
  position = "center", // "center", "right", "left", "custom"
  customPosition = "", // For custom positioning classes
  
  // Z-index control
  zIndex = "z-50", // "z-50", "z-[60]", etc.
  
  // Container styling
  containerClassName = "",
  backdropClassName = "",
  modalClassName = "",
  headerClassName = "",
  contentClassName = "",
  footerClassName = "",
  
  // Behavior options
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  
  // Advanced options
  hideBackdrop = false,
  customBackdrop = null,
  maxHeight = "max-h-[90vh]",
  minHeight = "min-h-[300px]",
  
  ...props
}) => {
  if (!isOpen) return null;

  // Size configurations
  const sizeClasses = {
    sm: "max-w-md",
    default: "max-w-2xl", 
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  // Position configurations
  const positionClasses = {
    center: "fixed inset-0 flex items-center justify-center",
    right: "fixed top-1/2 right-8 transform -translate-y-1/2",
    left: "fixed top-1/2 left-8 transform -translate-y-1/2", 
    custom: customPosition,
  };

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && closeOnEscape && onClose) {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      if (closeOnEscape) {
        document.addEventListener('keydown', handleKeyDown);
      }
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, closeOnEscape]);

  return (
    <div 
      className={`${positionClasses[position]} ${zIndex} ${containerClassName}`}
      onClick={position === 'center' ? handleBackdropClick : undefined}
      role="dialog"
      aria-modal="true"
      {...props}
    >
      {/* Backdrop - only for center position, or custom backdrop */}
      {!hideBackdrop && (position === 'center' || customBackdrop) && (
        customBackdrop || (
          <div className={`absolute inset-0 bg-black bg-opacity-40 ${backdropClassName}`} />
        )
      )}
      
      {/* Modal Container with Flexible Styling */}
      <div className={`
        relative w-full ${sizeClasses[size]} 
        ${maxHeight} ${minHeight}
        rounded-xl bg-base-100 shadow-lg 
        flex flex-col
        ${position === 'right' || position === 'left' ? 'max-w-md' : ''}
        ${modalClassName}
      `}>
        
        {/* Fixed Header */}
        {(title || showCloseButton) && (
          <div className={`
            flex-none px-6 py-4 border-b border-base-300 
            flex justify-between items-center
            ${headerClassName}
          `}>
            {/* Title can be string or custom JSX */}
            {title && (
              typeof title === 'string' ? (
                <h2 className="text-xl font-medium text-primary">
                  {title}
                </h2>
              ) : (
                title
              )
            )}
            
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className={`
          flex-1 overflow-y-auto p-6
          ${contentClassName}
        `}>
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <div className={`
            flex-none px-6 py-4 border-t border-base-300
            ${footerClassName}
          `}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;