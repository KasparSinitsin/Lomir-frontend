import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const Dropdown = ({
  trigger,
  children,
  className = "",
  dropdownClassName = "",
  position = "bottom-right", // 'bottom-left', 'bottom-right', 'top-left', 'top-right'
  disabled = false,
  closeOnClick = true,
  openOnHover = false,
  hoverDelay = 150,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);

  const computeMenuStyle = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const style = { position: "fixed", zIndex: 9999 };

    if (position.startsWith("bottom")) {
      style.top = rect.bottom + 4;
    } else {
      style.bottom = window.innerHeight - rect.top + 4;
    }

    if (position.endsWith("right")) {
      style.right = window.innerWidth - rect.right;
    } else {
      style.left = rect.left;
    }

    setMenuStyle(style);
  }, [position]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      window.addEventListener("scroll", () => setIsOpen(false), { passive: true });
      window.addEventListener("resize", () => setIsOpen(false), { passive: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Handle hover events
  const handleMouseEnter = () => {
    if (openOnHover && !disabled) {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      computeMenuStyle();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (openOnHover && !disabled) {
      const timeout = setTimeout(() => {
        setIsOpen(false);
      }, hoverDelay);
      setHoverTimeout(timeout);
    }
  };

  // Handle click events
  const handleClick = () => {
    if (!disabled && !openOnHover) {
      if (!isOpen) {
        computeMenuStyle();
      }
      setIsOpen(!isOpen);
    }
  };

  // Handle dropdown item click
  const handleItemClick = () => {
    if (closeOnClick) {
      setIsOpen(false);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Element */}
      <div
        onClick={handleClick}
        className={`${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        }`}
      >
        {trigger}
      </div>

      {/* Dropdown Menu — rendered in a portal to escape stacking contexts */}
      {isOpen && !disabled && createPortal(
        <>
          {/* Backdrop for mobile/touch devices */}
          <div
            className="fixed inset-0 z-[9998] lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div
            ref={menuRef}
            style={menuStyle}
            className={`bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-32 ${dropdownClassName}`}
            onClick={handleItemClick}
          >
            {children}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

// Optional: Dropdown Item component for consistent styling
export const DropdownItem = ({
  children,
  onClick,
  disabled = false,
  className = "",
  icon,
  variant = "default", // 'default', 'danger', 'success', 'warning'
}) => {
  const variantClasses = {
    default: "text-gray-700 hover:bg-gray-50",
    danger: "text-red-600 hover:bg-red-50",
    success: "text-green-600 hover:bg-green-50",
    warning: "text-yellow-600 hover:bg-yellow-50",
  };

  return (
    <button
      className={`
        w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors duration-150
        ${disabled ? "opacity-50 cursor-not-allowed" : variantClasses[variant]}
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};

// Optional: Dropdown Divider component
export const DropdownDivider = ({ className = "" }) => (
  <div className={`border-t border-gray-200 my-1 ${className}`} />
);

export default Dropdown;
