import React, { useState, useRef } from "react";
import { Info } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * SearchHelp (Inline)
 * - Shows only info icon by default
 * - On hover: shows "Search Tips"
 * - Click icon/text to toggle popup
 * - Popup uses a portal so it always appears on top of everything
 */
const SearchHelp = ({ className = "", anchorRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({});

  const examples = [
    {
      query: "react AND node",
      description: 'Must contain both "react" AND "node"',
    },
    {
      query: "react OR vue",
      description: 'Must contain either "react" OR "vue"',
    },
    {
      query: "javascript NOT jquery",
      description: 'Must contain "javascript" but NOT "jquery"',
    },
    {
      query: "python -django",
      description: 'Same as NOT: contains "python" but not "django"',
    },
    { query: '"full stack developer"', description: "Exact phrase match" },
    {
      query: '"web development" OR backend',
      description: "Combine phrases with operators",
    },
  ];

  return (
    <>
      {/* Inline trigger inside the input */}
      <div className={`relative ${className}`}>
        <div className="group flex items-center">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              const anchorEl = anchorRef?.current;
              if (!anchorEl) return;

              const rect = anchorEl.getBoundingClientRect();

              setPopupStyle({
                top: rect.bottom + 16, // 1rem gap
                left: rect.right, // align to the input's right edge
              });

              setIsOpen(true);
            }}
            className="flex flex-row-reverse items-center gap-1"
          >
            <Info
              className="h-4 w-4"
              style={{ color: "var(--color-primary-focus)" }}
            />

            <span
              className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-primary-focus)" }}
            >
              Search Tips
            </span>
          </button>
        </div>
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

            {/* Popup box */}
            <div
              className="fixed w-80 p-4 bg-base-100 rounded-lg shadow-lg border border-base-300 -translate-x-full"
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
