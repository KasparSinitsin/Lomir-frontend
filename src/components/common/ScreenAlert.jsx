import React from "react";
import { createPortal } from "react-dom";
import Alert from "./Alert";

const ScreenAlert = ({ alerts, type, message, onClose, autoCloseMs }) => {
  const alertItems = (
    alerts ?? (message ? [{ type, message, onClose, autoCloseMs }] : [])
  ).filter((alert) => alert?.type && alert?.message);

  if (alertItems.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed left-0 top-0 z-[9999] flex h-[100dvh] w-screen items-center justify-center px-4">
      <div className="flex w-[70vw] max-w-[70vw] flex-col items-center gap-3 sm:w-auto sm:max-w-[min(calc(100vw-2rem),32rem)]">
        {alertItems.map((alert, index) => (
          <Alert
            key={`${alert.type}-${index}-${alert.successId ?? ''}`}
            type={alert.type}
            message={alert.message}
            onClose={alert.onClose}
            autoCloseMs={alert.autoCloseMs}
            className="pointer-events-auto !w-full max-w-full shadow-[0_4px_10px_rgba(0,0,0,0.12),0_12px_30px_rgba(0,0,0,0.18),0_28px_56px_rgba(0,0,0,0.14)] sm:!w-fit"
          />
        ))}
      </div>
    </div>,
    document.body,
  );
};

export default ScreenAlert;
