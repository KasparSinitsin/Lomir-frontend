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

    if (
      config.data &&
      typeof config.data === "object" &&
      !(config.data instanceof FormData)
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
    if (response.data) {
      response.data = snakeToCamel(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data);
      const skipAuthRedirect = error.config?.skipAuthRedirect === true;

      if (
        !skipAuthRedirect &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
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

export default api;