import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * Portal-based Tooltip Component
 * 
 * Renders tooltips via React portal to escape overflow:hidden containers.
 * Supports multi-line content and automatic edge detection.
 * Includes arrow/tail matching the tooltip-lomir style.
 * 
 * @param {React.ReactNode} children - The trigger element
 * @param {string|React.ReactNode} content - Tooltip content (supports \n for line breaks)
 * @param {string} position - Preferred position: "top" | "bottom" | "left" | "right"
 * @param {string} className - Additional classes for the trigger wrapper
 */
const Tooltip = ({ 
  children, 
  content, 
  position = "bottom",
  className = "" 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [arrowCoords, setArrowCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const padding = 12; // Minimum distance from viewport edge
    const arrowSize = 8; // Arrow height

    let top, left;
    let finalPosition = position;

    // Calculate initial position
    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - gap,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      },
      bottom: {
        top: triggerRect.bottom + gap,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      },
      left: {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.left - tooltipRect.width - gap,
      },
      right: {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.right + gap,
      },
    };

    // Start with preferred position
    top = positions[position].top;
    left = positions[position].left;

    // Check if tooltip would go off-screen and flip if needed
    if (position === "bottom" && top + tooltipRect.height > viewportHeight - padding) {
      finalPosition = "top";
      top = positions.top.top;
    } else if (position === "top" && top < padding) {
      finalPosition = "bottom";
      top = positions.bottom.top;
    } else if (position === "right" && left + tooltipRect.width > viewportWidth - padding) {
      finalPosition = "left";
      left = positions.left.left;
    } else if (position === "left" && left < padding) {
      finalPosition = "right";
      left = positions.right.left;
    }

    // Clamp horizontal position to stay within viewport
    if (finalPosition === "top" || finalPosition === "bottom") {
      left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
    }

    // Clamp vertical position to stay within viewport
    if (finalPosition === "left" || finalPosition === "right") {
      top = Math.max(padding, Math.min(top, viewportHeight - tooltipRect.height - padding));
    }

    // Calculate arrow position (centered on trigger element)
    const arrowLeft = triggerRect.left + triggerRect.width / 2;
    const arrowTop = finalPosition === "bottom" 
      ? triggerRect.bottom + (gap - arrowSize) / 2
      : triggerRect.top - (gap + arrowSize) / 2;

    setCoords({ top, left });
    setArrowCoords({ top: arrowTop, left: arrowLeft });
    setActualPosition(finalPosition);
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure tooltip is rendered before calculating position
      requestAnimationFrame(calculatePosition);
    }
  }, [isVisible, calculatePosition]);

  // Don't render tooltip if no content
  if (!content) {
    return <span className={`inline-flex items-center ${className}`}>{children}</span>;
  }

  // Arrow styles based on position
  const getArrowStyle = () => {
    const baseStyle = {
      position: "fixed",
      width: "12px",
      height: "8px",
      backgroundColor: "#ffffff",
      zIndex: 10000,
      pointerEvents: "none",
      left: `${arrowCoords.left}px`,
      transform: "translateX(-50%)",
      // Using the same wavy SVG mask from tooltip-lomir
      WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.500009 1C3.5 1 3.00001 7 6.00001 7C9 7 8.5 1 11.5 1C12 1 12 0.5 12 0H0C0 0.5 0 1 0.500009 1Z' fill='white'/%3E%3C/svg%3E")`,
      maskImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.500009 1C3.5 1 3.00001 7 6.00001 7C9 7 8.5 1 11.5 1C12 1 12 0.5 12 0H0C0 0.5 0 1 0.500009 1Z' fill='white'/%3E%3C/svg%3E")`,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskSize: "contain",
      maskSize: "contain",
      filter: "drop-shadow(0 2px 6px rgba(4, 80, 20, 0.12))",
    };

    if (actualPosition === "bottom") {
      return {
        ...baseStyle,
        top: `${arrowCoords.top}px`,
        transform: "translateX(-50%) rotate(180deg)",
      };
    } else if (actualPosition === "top") {
      return {
        ...baseStyle,
        top: `${arrowCoords.top}px`,
        transform: "translateX(-50%)",
      };
    }
    
    // For left/right positions, hide arrow (or implement horizontal arrows if needed)
    return { ...baseStyle, display: "none" };
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </span>

      {isVisible &&
        createPortal(
          <>
            {/* Tooltip bubble */}
            <div
              ref={tooltipRef}
              role="tooltip"
              className={`
                fixed z-[9999]
                bg-white
                text-[var(--color-primary-focus)]
                rounded-lg
                whitespace-pre-line text-left
                max-w-[280px]
                pointer-events-none
                transition-opacity duration-150
              `}
              style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                padding: "0.5rem 0.75rem",
                fontSize: "0.775rem",
                fontWeight: 450,
                boxShadow: "0 2px 8px rgba(4, 80, 20, 0.15)",
              }}
            >
              {content}
            </div>
            
            {/* Arrow/tail */}
            <div style={getArrowStyle()} />
          </>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
