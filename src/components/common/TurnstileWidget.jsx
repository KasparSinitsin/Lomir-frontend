import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const POLL_INTERVAL_MS = 100;
const MAX_WAIT_MS = 5000;
const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileLoadPromise = null;

const loadTurnstileScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile can only load in a browser."));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileLoadPromise) {
    return turnstileLoadPromise;
  }

  turnstileLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Cloudflare Turnstile failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Cloudflare Turnstile failed to load."));

    document.head.appendChild(script);
  });

  return turnstileLoadPromise;
};

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
    let timeoutId = null;
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

    const waitForTurnstile = () => {
      if (isCancelled) return;

      if (window.turnstile) {
        renderWidget();
        return;
      }

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
    };

    loadTurnstileScript()
      .then(() => {
        timeoutId = window.setTimeout(waitForTurnstile, 0);
      })
      .catch((error) => onErrorRef.current?.(error));

    return () => {
      isCancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
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
