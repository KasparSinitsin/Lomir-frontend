import React, {
  useState,
  useRef,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
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
const SearchHelp = forwardRef(({ className = "", anchorRef, hideButton = false }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const activeTriggerRef = useRef(null);
  const popupRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});

  const POPUP_MAX_WIDTH = 320;
  const GAP = 8;
  const ARROW_H = 20;
  const ARROW_W = 10;
  const ARROW_MASK = `url("data:image/svg+xml,%3Csvg width='10' height='20' viewBox='0 0 10 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H10C7.8 0 6.8 2.2 6.2 7.3L5.2 19.2C5.1 19.8 4.9 19.8 4.8 19.2L3.8 7.3C3.2 2.2 2.2 0 0 0Z' fill='white'/%3E%3C/svg%3E")`;
  const VIEWPORT_MARGIN = 8;
  const TRIGGER_SIDE_OFFSET = 40;
  const ARROW_X_OFFSET = -14;

  const positionPopup = (triggerEl, measuredWidth = POPUP_MAX_WIDTH) => {
    const anchorEl = anchorRef?.current;
    if (!anchorEl || !triggerEl) return;
    const barRect = anchorEl.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();
    const popupWidth = Math.min(
      measuredWidth,
      window.innerWidth - VIEWPORT_MARGIN * 2,
    );
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const viewportMaxLeft = window.innerWidth - popupWidth - VIEWPORT_MARGIN;
    const preferredLeft = triggerCenter - popupWidth + TRIGGER_SIDE_OFFSET;
    const popupLeft = Math.max(
      VIEWPORT_MARGIN,
      Math.min(preferredLeft, viewportMaxLeft),
    );

    setPopupStyle({
      top: barRect.bottom + GAP,
      left: popupLeft,
      maxWidth: popupWidth,
      width: "max-content",
    });
    setArrowStyle({
      top: barRect.bottom + GAP - ARROW_H + 1,
      left: triggerCenter + ARROW_X_OFFSET,
    });
  };

  const openFromEl = (triggerEl) => {
    activeTriggerRef.current = triggerEl;
    positionPopup(triggerEl);
    setIsOpen(true);
  };

  useImperativeHandle(ref, () => ({ open: openFromEl }));

  useLayoutEffect(() => {
    if (!isOpen || !popupRef.current || !activeTriggerRef.current) return;
    positionPopup(
      activeTriggerRef.current,
      popupRef.current.getBoundingClientRect().width,
    );
  }, [isOpen]);

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
      {!hideButton && (
        <div className={`relative flex h-[1.125rem] items-center ${className}`}>
          <Tooltip content="Search tips" position="top">
            <button
              ref={triggerRef}
              type="button"
              onClick={(e) => openFromEl(e.currentTarget)}
              className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-transparent p-0 text-[var(--color-primary-focus)] transition-colors hover:text-[var(--color-primary)] focus:outline-none"
              aria-label="Search tips"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Portal popup on top of everything */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            {/* Backdrop: click to close */}
            <button
              type="button"
              className="absolute inset-0 z-0 cursor-default"
              onClick={() => setIsOpen(false)}
              aria-label="Close search tips"
            />

            {/* Arrow pointing up toward the visible search tips trigger */}
            <div
              style={{
                position: "fixed",
                top: `${arrowStyle.top}px`,
                left: `${arrowStyle.left}px`,
                transform: "translateX(-50%) rotate(180deg)",
                width: `${ARROW_W}px`,
                height: `${ARROW_H}px`,
                backgroundColor: "#ffffff",
                zIndex: 2,
                pointerEvents: "none",
                WebkitMaskImage: ARROW_MASK,
                maskImage: ARROW_MASK,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
              }}
            />

            {/* Popup box */}
            <div
              ref={popupRef}
              className="fixed z-[1] p-4 bg-base-100 rounded-lg shadow-lg"
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
                    <code
                      className="px-1.5 py-0.5 rounded font-mono text-xs"
                      style={{ backgroundColor: "rgba(0, 146, 19, 0.05)" }}
                    >
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
                  Operators are case-insensitive
                  <br />
                  (AND, and, And all work)
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
});

export default SearchHelp;
