import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const CATEGORY_COLORS = {
  Electronics: "#2563eb",
  Furniture: "#8b5cf6",
  Beauty: "#ec4899",
  Groceries: "#22c55e",
  Toys: "#f59e0b",
};

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getCategoryPlaceholder(category = "General", productName = "Product") {
  const label = category || "General";
  const color = CATEGORY_COLORS[label] || "#1f2937";
  const safeName = String(productName || label).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.18"/>
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="url(#g)"/>
      <rect x="18" y="18" width="284" height="284" rx="32" fill="white" fill-opacity="0.92"/>
      <circle cx="112" cy="112" r="44" fill="${color}" fill-opacity="0.12"/>
      <path d="M78 228c36-54 74-82 122-82 20 0 39 6 53 14" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/>
      <text x="50%" y="78%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#111827">${safeName}</text>
      <text x="50%" y="88%" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="600" fill="${color}">${label}</text>
    </svg>
  `)}`;
}
