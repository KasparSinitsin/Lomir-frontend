import axios from "axios";
import { snakeToCamel, camelToSnake } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

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
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

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
      const skipErrorLog = error.config?.skipErrorLog === true;

      if (!skipErrorLog) {
        console.error("API Error:", error.response.data);
      }

      // 401 = invalid/expired token → log out. 403 = forbidden resource → stay logged in.
      if (!skipAuthRedirect && error.response.status === 401) {
        localStorage.removeItem("token");
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
    console.error(`Error ${label}:`, error);
    throw error;
  }
};

export default api;
