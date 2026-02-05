import axios from "axios";
import { getToken } from "../utils/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  // This log is helpful during development if you forget to set the env var
  console.warn("VITE_API_BASE_URL is not set. API calls will fail.");
}

// Create a pre-configured Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT if available
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor: central place for logging / global handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can inspect error.response?.status here if you want to
    // add global handling for 401/403 later (e.g. auto-logout).
    console.error("API error:", error);
    return Promise.reject(error);
  },
);

export default api;
