import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const POLL_INTERVAL_MS = 100;
const MAX_WAIT_MS = 5000;

const TurnstileWidget = forwardRef(function TurnstileWidget(
  { onVerify, onExpire, onError },
  ref,
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
    }),
    [],
  );

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let intervalId = null;
    let waitedMs = 0;
    let isCancelled = false;

    const renderWidget = () => {
      if (
        isCancelled ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current !== null
      ) {
        return;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onVerifyRef.current?.(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onErrorRef.current?.(),
          theme: "light",
        });
      } catch (error) {
        onErrorRef.current?.(error);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      intervalId = window.setInterval(() => {
        waitedMs += POLL_INTERVAL_MS;

        if (window.turnstile) {
          window.clearInterval(intervalId);
          renderWidget();
          return;
        }

        if (waitedMs >= MAX_WAIT_MS) {
          window.clearInterval(intervalId);
          onErrorRef.current?.(
            new Error("Cloudflare Turnstile failed to load within 5 seconds."),
          );
        }
      }, POLL_INTERVAL_MS);
    }

    return () => {
      isCancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} />;
});

export default TurnstileWidget;
