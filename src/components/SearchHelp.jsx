import React, { useState, useRef } from "react";
import { Info } from "lucide-react";
import { createPortal } from "react-dom";
import Tooltip from "./common/Tooltip";

/**
 * SearchHelp (Inline)
 * - Shows only info icon by default (no layout text)
 * - Tooltip on hover/focus: "Search Tips"
 * - Click icon to toggle popup
 * - Popup uses a portal so it always appears on top of everything
 */
const SearchHelp = ({ className = "", anchorRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});

  const POPUP_WIDTH = 320;
  const GAP = 8;
  const ARROW_H = 12;

  const examples = [
    { query: "react AND node", description: 'Must contain both "react" AND "node"' },
    { query: "react OR vue", description: 'Must contain either "react" OR "vue"' },
    { query: "javascript NOT jquery", description: 'Must contain "javascript" but NOT "jquery"' },
    { query: "python -django", description: 'Same as NOT: contains "python" but not "django"' },
    { query: '"full stack developer"', description: "Exact phrase match" },
    { query: '"web development" OR backend', description: "Combine phrases with operators" },
  ];

  return (
    <>
      {/* Inline trigger inside the input */}
      <div className={`relative ${className}`}>
        <Tooltip content="Search tips" position="top">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              const anchorEl = anchorRef?.current;
              const triggerEl = triggerRef.current;
              if (!anchorEl || !triggerEl) return;

              const barRect = anchorEl.getBoundingClientRect();
              const triggerRect = triggerEl.getBoundingClientRect();

              const popupLeft = Math.max(
                8,
                Math.min(barRect.right - POPUP_WIDTH, window.innerWidth - POPUP_WIDTH - 8),
              );
              const popupTop = barRect.bottom + GAP;

              setPopupStyle({ top: popupTop, left: popupLeft });
              setArrowStyle({
                top: barRect.bottom + GAP - ARROW_H,
                left: triggerRect.left + triggerRect.width / 2,
              });

              setIsOpen(true);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent p-0 text-[var(--color-primary-focus)] transition-colors hover:text-[var(--color-primary)] focus:outline-none"
            aria-label="Search tips"
          >
            <Info className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      {/* Portal popup on top of everything */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            {/* Backdrop: click to close */}
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsOpen(false)}
              aria-label="Close search tips"
            />

            {/* Arrow pointing up toward the "i" icon */}
            <div
              style={{
                position: "fixed",
                top: `${arrowStyle.top}px`,
                left: `${arrowStyle.left}px`,
                transform: "translateX(-50%) rotate(180deg)",
                width: "48px",
                height: `${ARROW_H}px`,
                backgroundColor: "#ffffff",
                zIndex: 10000,
                pointerEvents: "none",
                WebkitMaskImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.500009 1C3.5 1 3.00001 7 6.00001 7C9 7 8.5 1 11.5 1C12 1 12 0.5 12 0H0C0 0.5 0 1 0.500009 1Z' fill='white'/%3E%3C/svg%3E")`,
                maskImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0.500009 1C3.5 1 3.00001 7 6.00001 7C9 7 8.5 1 11.5 1C12 1 12 0.5 12 0H0C0 0.5 0 1 0.500009 1Z' fill='white'/%3E%3C/svg%3E")`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                filter: "drop-shadow(0 2px 6px rgba(4, 80, 20, 0.12))",
              }}
            />

            {/* Popup box */}
            <div
              className="fixed w-80 p-4 bg-base-100 rounded-lg shadow-lg border border-base-300"
              style={popupStyle}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-base-content">
                  Advanced Search
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-base-content/60 hover:text-base-content"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-base-content/70 mb-3">
                Use operators to refine your search:
              </p>

              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div key={index} className="text-sm">
                    <code className="bg-base-200 px-1.5 py-0.5 rounded font-mono text-xs">
                      {example.query}
                    </code>
                    <p className="text-base-content/60 text-xs mt-0.5">
                      {example.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-base-300">
                <p className="text-xs text-base-content/50">
                  Operators are case-insensitive (AND, and, And all work)
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchHelp;
