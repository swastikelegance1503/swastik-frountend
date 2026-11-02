/**
 * Swastik Art Backend API Configuration
 * Supports Vercel Cloud Live API as primary, with localhost fallback
 */

export const JWT_HOST_API =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : "https://swastikart-backend.vercel.app/api");
