export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

export const API_ORIGIN = API_URL.replace(/\/api\/v\d+\/?$/, "").replace(/\/$/, "");

export const WS_URL =
  import.meta.env.VITE_WS_URL || `${API_ORIGIN.replace(/^http/, "ws")}/ws`;

export const buildAssetUrl = (path) => {
  if (!path) return "";

  const rawPath = String(path).trim().replace(/\\/g, "/");
  if (!rawPath) return "";

  // If backend already returns a full absolute URL, keep it.
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  // Normalize leading dot segments and repeated slashes.
  const cleaned = rawPath.replace(/^\.\/?/, "").replace(/\/+/g, "/");
  const normalizedPath = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;

  return `${API_ORIGIN.replace(/\/$/, "")}${normalizedPath}`;
};

