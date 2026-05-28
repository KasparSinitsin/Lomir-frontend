import { useEffect } from "react";
import socketService from "../services/socketService";

const useSocketEvents = (eventHandlers, deps = []) => {
  useEffect(() => {
    const isSetupFunction = typeof eventHandlers === "function";
    const entries = Object.entries(eventHandlers || {}).filter(
      ([, handler]) => typeof handler === "function",
    );

    if (!isSetupFunction && entries.length === 0) return undefined;

    let detachListeners = null;

    const attachListeners = (socket) => {
      if (!socket) return;

      if (detachListeners) {
        detachListeners();
      }

      if (isSetupFunction) {
        const cleanup = eventHandlers(socket);
        detachListeners = typeof cleanup === "function" ? cleanup : null;
        return;
      }

      entries.forEach(([eventName, handler]) => {
        socket.on(eventName, handler);
      });

      detachListeners = () => {
        entries.forEach(([eventName, handler]) => {
          socket.off(eventName, handler);
        });
        detachListeners = null;
      };
    };

    const unsubscribeSocketReady = socketService.onSocketReady(attachListeners);

    return () => {
      unsubscribeSocketReady();
      if (detachListeners) {
        detachListeners();
      }
    };
  }, deps);
};

export default useSocketEvents;
