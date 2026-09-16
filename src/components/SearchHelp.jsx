import React, {
  useState,
  useRef,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Info } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Tooltip from "./common/Tooltip";

/**
 * SearchHelp (Inline)
 * - Shows only info icon by default (no layout text)
 * - Tooltip on hover/focus: "Search Tips"
 * - Click icon to toggle popup
 * - Popup uses a portal so it always appears on top of everything
 */
const SearchHelp = forwardRef(({ className = "", anchorRef, hideButton = false }, ref) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const activeTriggerRef = useRef(null);
  const popupRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});

  const POPUP_MAX_WIDTH = 320;
  const GAP = 8;
  const ARROW_H = 20;
  const ARROW_W = 20;
  const ARROW_MASK = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0H20C15.6 0 13.6 2.2 12.4 7.3L10.4 19.2C10.2 19.8 9.8 19.8 9.6 19.2L7.6 7.3C6.4 2.2 4.4 0 0 0Z' fill='white'/%3E%3C/svg%3E")`;
  const VIEWPORT_MARGIN = 8;
  const TRIGGER_SIDE_OFFSET = 54;
  const ARROW_X_OFFSET = 0;

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

  // The queries are syntax and stay as they are in every language: the
  // operators are English (decision E1), and the terms match the English tag
  // and badge names stored in the database. Only the explanations translate.
  const examples = [
    { query: "react AND node", description: t("searchHelp.examples.and") },
    { query: "react OR vue", description: t("searchHelp.examples.or") },
    { query: "javascript NOT jquery", description: t("searchHelp.examples.not") },
    { query: "python -django", description: t("searchHelp.examples.minus") },
    { query: '"full stack developer"', description: t("searchHelp.examples.phrase") },
    { query: '"web development" OR backend', description: t("searchHelp.examples.combine") },
  ];

  return (
    <>
      {/* Inline trigger inside the input */}
      {!hideButton && (
        <div className={`relative flex h-[1.125rem] items-center ${className}`}>
          <Tooltip content={t("searchInput.tips")} position="top">
            <button
              ref={triggerRef}
              type="button"
              onClick={(e) => openFromEl(e.currentTarget)}
              className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-transparent p-0 text-[var(--color-primary-focus)] transition-colors hover:text-[var(--color-primary)] focus:outline-none"
              aria-label={t("searchInput.tips")}
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
              aria-label={t("searchHelp.closeTips")}
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
              className="fixed z-[1] p-4 bg-base-100 rounded-lg"
              style={{
                ...popupStyle,
                boxShadow: "0 8px 18px rgba(4, 80, 20, 0.22), 0 18px 42px rgba(4, 80, 20, 0.18)",
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-base-content">
                  {t("searchHelp.title")}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-base-content/60 hover:text-base-content"
                  aria-label={t("mapPopup.close")}
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-base-content/70 mb-3">
                {t("searchHelp.intro")}
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
                  {t("searchHelp.caseInsensitive")}
                  <br />
                  {t("searchHelp.caseInsensitiveExample")}
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
