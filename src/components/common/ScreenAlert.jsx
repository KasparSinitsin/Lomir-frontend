import React from "react";
import { createPortal } from "react-dom";
import Alert from "./Alert";

const ScreenAlert = ({ alerts, type, message, onClose }) => {
  const alertItems = (
    alerts ?? (message ? [{ type, message, onClose }] : [])
  ).filter((alert) => alert?.type && alert?.message);

  if (alertItems.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="flex max-w-[min(calc(100vw-2rem),32rem)] flex-col items-center gap-3">
        {alertItems.map((alert, index) => (
          <Alert
            key={`${alert.type}-${index}`}
            type={alert.type}
            message={alert.message}
            onClose={alert.onClose}
            className="pointer-events-auto max-w-full shadow-[0_4px_10px_rgba(0,0,0,0.12),0_12px_30px_rgba(0,0,0,0.18),0_28px_56px_rgba(0,0,0,0.14)] ring-1 ring-white/20"
          />
        ))}
      </div>
    </div>,
    document.body,
  );
};

export default ScreenAlert;
