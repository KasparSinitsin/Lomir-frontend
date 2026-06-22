import axios from "axios";
import { snakeToCamel, camelToSnake } from "../utils/formatters";

// In production the frontend and backend are served same-origin: REST calls go
// to /api/* on the Vercel deployment, which rewrites them to the Render backend
// (see vercel.json). A relative baseURL keeps the session cookie first-party, so
// mobile browsers with strict tracking protection don't drop it. Locally we hit
// the backend dev server directly.
const API_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add request interceptor to convert request data to snake_case
api.interceptors.request.use(
  (config) => {
    // Auth travels in an httpOnly session cookie sent automatically via
    // withCredentials; there is no JS-readable token to attach here.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (
      config.skipRequestCaseTransform !== true &&
      config.data &&
      typeof config.data === "object"
    ) {
      config.data = camelToSnake(config.data);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Whether an error response should be kept out of the console. True when the
 * caller opted out entirely (`skipErrorLog`) or the status is an expected,
 * already-handled one declared via `quietErrorStatuses` (e.g. a 404 for a
 * resource that may have been deleted — graceful UX, not red console noise).
 * The error still propagates; this only governs logging.
 */
export const isQuietError = (error) => {
  if (error?.config?.skipErrorLog === true) return true;
  const quiet = error?.config?.quietErrorStatuses;
  const status = error?.response?.status;
  return Array.isArray(quiet) && status != null && quiet.includes(status);
};

// Add response interceptor to convert response data to camelCase
api.interceptors.response.use(
  (response) => {
    if (response.config?.skipResponseCaseTransform !== true && response.data) {
      response.data = snakeToCamel(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const skipAuthRedirect = error.config?.skipAuthRedirect === true;

      if (!isQuietError(error)) {
        console.error("API Error:", error.response.data);
      }

      // 401 = invalid/expired session → send to login. 403 = forbidden
      // resource → stay logged in. The cookie is cleared server-side on logout.
      if (!skipAuthRedirect && error.response.status === 401) {
        window.location.href = "/login";
      }
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Thin wrapper that collapses the repetitive
 *   try { (await api.X(...)).data } catch (e) { console.error(...); throw e }
 * pattern used across service modules. Use this for the standard "fetch and
 * unwrap response.data" case. For catch handlers that need additional logic
 * (custom error wrapping, conditional logging, etc.), keep an explicit
 * try/catch instead.
 *
 * @param {string} label - Short action description for the error log
 *   (e.g. "fetching user details for ID 42"). Prefixed with "Error " on log.
 * @param {() => Promise} requestFn - Function returning an axios Promise.
 * @returns {Promise<*>} Resolves with response.data.
 */
export const call = async (label, requestFn) => {
  try {
    const response = await requestFn();
    return response.data;
  } catch (error) {
    if (!isQuietError(error)) {
      console.error(`Error ${label}:`, error);
    }
    throw error;
  }
};

export default api;
