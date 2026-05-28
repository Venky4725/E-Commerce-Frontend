/**
 * Search Debug Logger
 * Centralized structured logging for search queries, AI chat, and product metadata.
 * Only active in development mode (import.meta.env.DEV).
 */

const IS_DEV = import.meta.env.DEV;

/**
 * Log a search query and its resolved metadata + products found.
 */
export const logSearchQuery = (rawQuery, resolvedMeta, products = []) => {
  if (!IS_DEV) return;
  console.group(`🔍 Search Query: "${rawQuery}"`);
  console.log("Resolved meta:", {
    normalized: resolvedMeta?.normalized,
    brand: resolvedMeta?.brand ?? null,
    category: resolvedMeta?.category ?? null,
    intent: resolvedMeta?.intent,
    maxPrice: resolvedMeta?.maxPrice ?? null,
    recommendationMode: resolvedMeta?.recommendationMode ?? false,
  });
  console.log(`Products found: ${products.length}`);
  if (products.length > 0) {
    console.table(
      products.slice(0, 10).map((p) => ({
        name: p.name,
        brand: p.brand ?? "—",
        category: p.category ?? "—",
        tags: Array.isArray(p.tags) ? p.tags.join(", ") : "—",
        score: p._score ?? 0,
        price: p.price,
      }))
    );
  }
  console.groupEnd();
};

/**
 * Log an outgoing AI chat request payload.
 */
export const logAIRequest = (rawText, meta, payload) => {
  if (!IS_DEV) return;
  console.group("🤖 AI Chat → Request");
  console.log("Raw input:", rawText);
  console.log("Preprocessed meta:", {
    normalized: meta?.normalized,
    intent: meta?.intent,
    brand: meta?.brand ?? null,
    category: meta?.category ?? null,
    maxPrice: meta?.maxPrice ?? null,
    recommendationMode: meta?.recommendationMode ?? false,
  });
  console.log("API Payload:", payload);
  console.groupEnd();
};

/**
 * Log a received AI chat response with its returned products.
 */
export const logAIResponse = (text, products = []) => {
  if (!IS_DEV) return;
  console.group("📦 AI Chat ← Response");
  console.log("Message:", text?.slice(0, 200));
  console.log(`Products returned: ${products.length}`);
  if (products.length > 0) {
    console.table(
      products.map((p) => ({
        name: p.name,
        brand: p.brand ?? "—",
        category: p.category ?? "—",
        tags: Array.isArray(p.tags) ? p.tags.join(", ") : "—",
        price: p.price,
      }))
    );
  }
  console.groupEnd();
};

/**
 * Log matched tags and categories for a specific product card render.
 */
export const logProductCard = (product, matchedQuery = "") => {
  if (!IS_DEV) return;
  console.debug("🃏 ProductCard render:", {
    name: product.name,
    brand: product.brand ?? "—",
    category: product.category ?? "—",
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "—",
    matchedQuery,
    score: product._score ?? 0,
  });
};
