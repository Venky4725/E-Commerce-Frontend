/**
 * AI Query Utilities — Semantic Intelligence Layer
 *
 * Pipeline (in order):
 *  1. Intent detection (greeting / farewell / follow-up / product_search)
 *  2. Shopping alias resolution  ← NEW: brand/synonym/intent expansion
 *  3. Recommendation keyword detection
 *  4. Price filter extraction
 *  5. Phrase-level typo correction
 *  6. Token-level typo + plural normalization
 */

// ---------------------------------------------------------------------------
// Typo Dictionary
// ---------------------------------------------------------------------------
const TYPO_DICTIONARY = {
  labtop: "laptop",
  labtops: "laptop",
  leptop: "laptop",
  phn: "phone",
  phns: "phone",
  fone: "phone",
  fones: "phone",
  smartwach: "smartwatch",
  "smart wach": "smartwatch",
  hedphone: "headphone",
  hedphones: "headphone",
  headfones: "headphone",
  earfones: "earphone",
  frniture: "furniture",
  furnitur: "furniture",
  furnitue: "furniture",
  farniture: "furniture",
  shos: "shoe",
  shue: "shoe",
  botle: "bottle",
  botls: "bottle",
};

// ---------------------------------------------------------------------------
// Shopping Alias Map
// Structured brand/synonym/intent expansion that avoids 1:1 hardcoding.
// Each entry can expand the query AND inject brand/category/priceSort metadata.
// ---------------------------------------------------------------------------
const SHOPPING_ALIAS_MAP = [
  // ── Brand aliases ────────────────────────────────────────────────────────
  {
    triggers: ["iphone", "i phone", "iphones"],
    expand: "apple smartphone",
    brand: "Apple",
    category: "Electronics",
  },
  {
    triggers: ["macbook", "mac book", "macbooks"],
    expand: "apple laptop",
    brand: "Apple",
    category: "Electronics",
  },
  {
    triggers: ["ipad", "i pad"],
    expand: "apple tablet",
    brand: "Apple",
    category: "Electronics",
  },
  {
    triggers: ["moto", "motorola"],
    expand: "motorola smartphone",
    brand: "Motorola",
    category: "Electronics",
  },
  {
    triggers: ["oneplus", "one plus"],
    expand: "oneplus smartphone",
    brand: "OnePlus",
    category: "Electronics",
  },
  {
    triggers: ["redmi", "xiaomi", "mi phone"],
    expand: "xiaomi redmi smartphone",
    brand: "Xiaomi",
    category: "Electronics",
  },
  {
    triggers: ["realme"],
    expand: "realme smartphone",
    brand: "Realme",
    category: "Electronics",
  },
  {
    triggers: ["samsung phone", "samsung mobile"],
    expand: "samsung smartphone",
    brand: "Samsung",
    category: "Electronics",
  },
  {
    triggers: ["boat", "boat audio"],
    expand: "boat earphone headphone",
    brand: "boAt",
    category: "Electronics",
  },
  {
    triggers: ["jbl"],
    expand: "jbl speaker headphone",
    brand: "JBL",
    category: "Electronics",
  },
  {
    triggers: ["sony"],
    expand: "sony electronics",
    brand: "Sony",
    category: "Electronics",
  },
  {
    triggers: ["hp laptop", "hp"],
    expand: "hp laptop computer",
    brand: "HP",
    category: "Electronics",
  },
  {
    triggers: ["dell"],
    expand: "dell laptop computer",
    brand: "Dell",
    category: "Electronics",
  },
  {
    triggers: ["lenovo"],
    expand: "lenovo laptop",
    brand: "Lenovo",
    category: "Electronics",
  },
  {
    triggers: ["asus"],
    expand: "asus laptop",
    brand: "Asus",
    category: "Electronics",
  },
  {
    triggers: ["nike"],
    expand: "nike sports shoes apparel",
    brand: "Nike",
    category: "Fashion",
  },
  {
    triggers: ["adidas"],
    expand: "adidas shoes sports",
    brand: "Adidas",
    category: "Fashion",
  },
  {
    triggers: ["redtape", "red tape"],
    expand: "shoes footwear",
    brand: "RedTape",
    category: "Fashion",
    unavailable: true,
  },

  // ── Synonym/vocabulary expansion ─────────────────────────────────────────
  {
    triggers: ["ear phones", "earphones", "ear phone"],
    expand: "earphone headphone earbuds wireless audio",
    category: "Electronics",
  },
  {
    triggers: ["headset", "head set"],
    expand: "headphone headset earphone",
    category: "Electronics",
  },
  {
    triggers: ["buds", "wireless buds", "tws"],
    expand: "earbuds true wireless earphone",
    category: "Electronics",
  },
  {
    triggers: ["mobile", "mobiles", "cell phone", "cell phones"],
    expand: "smartphone phone mobile",
    category: "Electronics",
  },
  {
    triggers: ["tab", "tablet", "tabs"],
    expand: "tablet ipad android tablet",
    category: "Electronics",
  },
  {
    triggers: ["tv", "television", "smart tv"],
    expand: "television smart tv led",
    category: "Electronics",
  },
  {
    triggers: ["cam", "dslr", "camera"],
    expand: "camera dslr mirrorless",
    category: "Electronics",
  },
  {
    triggers: ["ac", "air conditioner", "air conditioners"],
    expand: "air conditioner cooling",
    category: "Home Appliances",
  },
  {
    triggers: ["fridge", "refrigerator"],
    expand: "refrigerator fridge",
    category: "Home Appliances",
  },
  {
    triggers: ["washing machine", "washer"],
    expand: "washing machine laundry",
    category: "Home Appliances",
  },
  {
    triggers: ["sofa", "couch"],
    expand: "sofa couch seating furniture",
    category: "Furniture",
  },
  {
    triggers: ["sneakers", "sneekers", "trainer", "trainers"],
    expand: "sneakers sports shoes running",
    category: "Fashion",
  },
  {
    triggers: ["tshirt", "t-shirt", "t shirt", "tee"],
    expand: "t-shirt tshirt top clothing",
    category: "Fashion",
  },
  {
    triggers: ["perfume", "cologne", "deo", "deodorant"],
    expand: "perfume deodorant fragrance",
    category: "Beauty",
  },

  // ── Price / intent expansion ─────────────────────────────────────────────
  {
    triggers: ["expensive", "expensive products", "expensive items"],
    expand: "",
    priceSort: "desc",
    label: "Premium Products",
  },
  {
    triggers: ["premium", "premium products", "high end", "luxury"],
    expand: "",
    priceSort: "desc",
    label: "Premium Products",
  },
  {
    triggers: ["cheap", "cheap products", "cheapest"],
    expand: "",
    priceSort: "asc",
    label: "Budget Products",
  },
  {
    triggers: ["budget", "budget products", "affordable", "value for money"],
    expand: "",
    priceSort: "asc",
    label: "Budget Products",
  },
  {
    triggers: ["trending", "trending products", "popular products", "best sellers"],
    expand: "popular",
    recommendationMode: "best",
  },
  {
    triggers: ["new arrivals", "latest products", "new products", "just arrived"],
    expand: "latest new",
    recommendationMode: false,
  },
];

// ---------------------------------------------------------------------------
// Conversational routing
// ---------------------------------------------------------------------------
const CONVERSATIONAL_MAP = {
  greeting: {
    patterns: [
      "hi",
      "hello",
      "hey",
      "hola",
      "greetings",
      "good morning",
      "good evening",
      "good afternoon",
    ],
    response: "Hello! How can I help you find products today?",
  },
  gratitude: {
    patterns: ["thanks", "thank you", "thx", "appreciate it"],
    response:
      "You're welcome! Let me know if you need help finding anything else.",
  },
  farewell: {
    patterns: ["bye", "goodbye", "see ya", "talk later"],
    response: "Thanks for visiting ShopKart! Have a great day.",
  },
  acknowledgement: {
    patterns: ["ok", "okay", "cool", "nice", "got it"],
    response:
      "Great! Let me know if you have any questions about our products.",
  },
};

const FOLLOW_UP_KEYWORDS = [
  "yes",
  "no",
  "show more",
  "details",
  "price",
  "availability",
  "features",
  "stock",
  "tell me more",
];

const RECOMMENDATION_KEYWORDS = [
  "best",
  "recommended",
  "top",
  "budget",
  "popular",
  "trending",
  "suggest",
  "compare",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const normalizePlural = (token) => {
  const plurals = {
    laptops: "laptop",
    phones: "phone",
    smartwatches: "smartwatch",
    watches: "watch",
    shoes: "shoe",
    bottles: "bottle",
    chairs: "chair",
    tables: "table",
    desks: "desk",
    furnitures: "furniture",
    earphones: "earphone",
    headphones: "headphone",
    smartphones: "smartphone",
    tablets: "tablet",
    televisions: "television",
    cameras: "camera",
  };
  return plurals[token] || token;
};

const correctTypo = (token) => TYPO_DICTIONARY[token] || token;

const detectIntent = (text) => {
  const raw = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "");

  for (const [intent, data] of Object.entries(CONVERSATIONAL_MAP)) {
    if (
      data.patterns.some(
        (pattern) => raw === pattern || raw.startsWith(pattern + " ")
      )
    ) {
      return { intent, response: data.response };
    }
  }

  if (
    FOLLOW_UP_KEYWORDS.some((kw) => raw === kw || raw.startsWith(kw + " "))
  ) {
    return { intent: "follow_up", response: null };
  }

  return { intent: "product_search", response: null };
};

// ---------------------------------------------------------------------------
// Shopping Alias Resolver
// Checks multi-word triggers first, then single-word, preserving order.
// Returns alias match or null.
// ---------------------------------------------------------------------------
export const resolveShoppingAlias = (rawText) => {
  const lower = rawText.toLowerCase().trim();

  // Sort by trigger length descending so longer (more specific) phrases match first
  const sorted = [...SHOPPING_ALIAS_MAP].sort(
    (a, b) =>
      Math.max(...b.triggers.map((t) => t.length)) -
      Math.max(...a.triggers.map((t) => t.length))
  );

  for (const alias of sorted) {
    for (const trigger of alias.triggers) {
      // Full match OR the query starts/ends with this trigger as a phrase
      const regex = new RegExp(`(?:^|\\s)${trigger.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(?:\\s|$)`, "i");
      if (lower === trigger || regex.test(lower)) {
        return alias;
      }
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Main preprocessQuery export
// ---------------------------------------------------------------------------
export const preprocessQuery = (text) => {
  const raw = (text || "").toLowerCase().trim();

  // 1. Detect Intent first
  const { intent, response } = detectIntent(raw);

  if (intent !== "product_search" && intent !== "follow_up") {
    return {
      original: text,
      normalized: raw,
      maxPrice: null,
      intent,
      localResponse: response,
      recommendationMode: false,
      brand: null,
      category: null,
      priceSort: null,
      aliasLabel: null,
    };
  }

  // 1b. Detect Brand Exclusions (e.g. "not nike", "except apple", "no samsung")
  const exclusionPatterns = [
    /\b(?:not|except|no|without|other than|another option than)\s+([a-z0-9]+)\b/i,
    /\b([a-z0-9]+)\s+is\s+not\s+what\s+i\s+want\b/i,
  ];
  
  let excludedBrand = null;
  for (const pattern of exclusionPatterns) {
    const match = raw.match(pattern);
    if (match) {
      excludedBrand = match[1];
      break;
    }
  }

  // Generic exclusion intent
  const needsExclusion = /\b(?:other brand|another option|something else|different brand)\b/i.test(raw);

  if (intent === "follow_up") {
    return {
      original: text,
      normalized: raw,
      maxPrice: null,
      intent: "follow_up",
      localResponse: null,
      recommendationMode: false,
      brand: null,
      category: null,
      priceSort: null,
      aliasLabel: null,
      excludedBrand,
      needsExclusion,
    };
  }

  // 2. Shopping Alias Resolution
  const alias = resolveShoppingAlias(raw);
  let queryAfterAlias = raw;
  let brand = null;
  let category = null;
  let priceSort = null;
  let aliasLabel = null;
  let resolvedRecommendationMode = false;
  let unavailableBrand = null;

  if (alias) {
    if (alias.unavailable) {
      unavailableBrand = alias.brand;
    }

    // Replace the trigger in the raw query with the expanded form
    if (alias.expand !== undefined && alias.expand !== "") {
      const triggerPattern = alias.triggers
        .map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
        .join("|");
      const triggerRegex = new RegExp(`(${triggerPattern})`, "gi");
      queryAfterAlias = raw.replace(triggerRegex, alias.expand).replace(/\s+/g, " ").trim();
    } else if (alias.expand === "") {
      const triggerPattern = alias.triggers
        .map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
        .join("|");
      const triggerRegex = new RegExp(`(${triggerPattern})`, "gi");
      queryAfterAlias = raw.replace(triggerRegex, "").replace(/\s+/g, " ").trim();
    }

    brand = alias.brand || null;
    category = alias.category || null;
    priceSort = alias.priceSort || null;
    aliasLabel = alias.label || null;

    if (alias.recommendationMode !== undefined) {
      resolvedRecommendationMode = alias.recommendationMode;
    }
  }

  // 3. Recommendation Detection
  let recommendationMode = resolvedRecommendationMode;
  let queryAfterRec = queryAfterAlias;

  RECOMMENDATION_KEYWORDS.forEach((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    if (regex.test(queryAfterRec)) {
      recommendationMode = true;
      queryAfterRec = queryAfterRec
        .replace(regex, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  });

  // 4. Price Filter Extraction
  const priceRegex =
    /(?:under|below|less than|underneath|max|maximum|budget of|within)\s*(?:rs\.?|inr|₹|usd|\$)?\s*(\d+(?:\.\d+)?)/i;
  const match = queryAfterRec.match(priceRegex);

  let maxPrice = null;
  let queryWithPriceRemoved = queryAfterRec;

  if (match) {
    maxPrice = parseFloat(match[1]);
    queryWithPriceRemoved = queryAfterRec.replace(match[0], "").trim();
  }

  // 5. Phrase-level typo correction
  let processedQuery = queryWithPriceRemoved;
  Object.keys(TYPO_DICTIONARY).forEach((typo) => {
    if (typo.includes(" ")) {
      const regex = new RegExp(`\\b${typo}\\b`, "gi");
      processedQuery = processedQuery.replace(regex, TYPO_DICTIONARY[typo]);
    }
  });

  // 6. Token-level normalization
  const tokens = processedQuery.split(/\s+/).map((token) => {
    const corrected = correctTypo(token);
    return normalizePlural(corrected);
  });

  const finalQuery =
    tokens.join(" ").trim() || queryWithPriceRemoved || raw;

  return {
    original: text,
    normalized: finalQuery,
    maxPrice,
    intent: "product_search",
    localResponse: null,
    recommendationMode,
    brand,
    category,
    priceSort,
    aliasLabel,
    excludedBrand,
    unavailableBrand,
    needsExclusion,
  };
};

// ---------------------------------------------------------------------------
// Contextual Suggestion Chips
// ---------------------------------------------------------------------------
export const getDynamicSuggestions = (normalizedQuery, intent) => {
  // Empty / greeting state
  if (intent === "greeting" || !normalizedQuery) {
    return [
      {
        label: "Best Laptops",
        query: "best laptop",
        type: "recommendation",
        suggestion_type: "best_laptops",
      },
      {
        label: "Budget Phones",
        query: "phone under 20000",
        type: "budget_search",
        suggestion_type: "budget_phones",
      },
      {
        label: "Trending Watches",
        query: "popular smartwatch",
        type: "recommendation",
        suggestion_type: "trending_watches",
      },
      {
        label: "Modern Furniture",
        query: "best furniture",
        type: "recommendation",
        suggestion_type: "modern_furniture",
      },
    ];
  }

  const query = normalizedQuery.toLowerCase();

  if (query.includes("apple") || query.includes("iphone") || query.includes("macbook")) {
    return [
      { label: "iPhones", query: "iphone", type: "brand_search", suggestion_type: "iphones" },
      { label: "MacBooks", query: "macbook", type: "brand_search", suggestion_type: "macbooks" },
      { label: "Apple Accessories", query: "apple accessories", type: "brand_search", suggestion_type: "apple_accessories" },
      { label: "Under ₹50,000", query: "apple under 50000", type: "budget_search", suggestion_type: "apple_budget" },
    ];
  }

  if (query.includes("laptop") || query.includes("macbook")) {
    return [
      {
        label: "Gaming Laptops",
        query: "best gaming laptop",
        type: "recommendation",
        suggestion_type: "gaming_laptops",
      },
      {
        label: "Budget Laptops",
        query: "laptop under 40000",
        type: "budget_search",
        suggestion_type: "budget_laptops",
      },
      {
        label: "MacBooks",
        query: "apple macbook",
        type: "brand_search",
        suggestion_type: "macbooks",
      },
      {
        label: "Accessories",
        query: "laptop accessories",
        type: "category_search",
        suggestion_type: "laptop_accessories",
      },
    ];
  }

  if (query.includes("phone") || query.includes("mobile") || query.includes("smartphone")) {
    return [
      {
        label: "Top Smartphones",
        query: "best smartphone",
        type: "recommendation",
        suggestion_type: "top_smartphones",
      },
      {
        label: "Under ₹15,000",
        query: "phone under 15000",
        type: "budget_search",
        suggestion_type: "budget_phones",
      },
      {
        label: "5G Phones",
        query: "5g smartphone",
        type: "feature_search",
        suggestion_type: "5g_phones",
      },
      {
        label: "Samsung",
        query: "samsung phones",
        type: "brand_search",
        suggestion_type: "samsung_phones",
      },
    ];
  }

  if (query.includes("earphone") || query.includes("headphone") || query.includes("earbuds") || query.includes("audio")) {
    return [
      { label: "Wireless Earbuds", query: "wireless earbuds", type: "feature_search", suggestion_type: "wireless_earbuds" },
      { label: "boAt Audio", query: "boat earphone", type: "brand_search", suggestion_type: "boat_audio" },
      { label: "JBL", query: "jbl headphone", type: "brand_search", suggestion_type: "jbl_audio" },
      { label: "Under ₹2,000", query: "earphone under 2000", type: "budget_search", suggestion_type: "budget_audio" },
    ];
  }

  if (query.includes("watch") || query.includes("smartwatch")) {
    return [
      {
        label: "Smart Watches",
        query: "best smartwatch",
        type: "recommendation",
        suggestion_type: "smart_watches",
      },
      {
        label: "Analog Watches",
        query: "analog watch",
        type: "category_search",
        suggestion_type: "analog_watches",
      },
      {
        label: "Fitness Bands",
        query: "fitness tracker",
        type: "category_search",
        suggestion_type: "fitness_bands",
      },
    ];
  }

  if (
    query.includes("furniture") ||
    query.includes("chair") ||
    query.includes("table") ||
    query.includes("sofa")
  ) {
    return [
      {
        label: "Office Chairs",
        query: "best office chair",
        type: "recommendation",
        suggestion_type: "office_chairs",
      },
      {
        label: "Study Tables",
        query: "study table",
        type: "category_search",
        suggestion_type: "study_tables",
      },
      {
        label: "Sofa Sets",
        query: "modern sofa set",
        type: "category_search",
        suggestion_type: "sofa_sets",
      },
    ];
  }

  if (query.includes("shoe") || query.includes("sneaker") || query.includes("sport")) {
    return [
      { label: "Nike", query: "nike shoes", type: "brand_search", suggestion_type: "nike" },
      { label: "Adidas", query: "adidas shoes", type: "brand_search", suggestion_type: "adidas" },
      { label: "Running Shoes", query: "running shoes", type: "category_search", suggestion_type: "running_shoes" },
      { label: "Under ₹3,000", query: "shoes under 3000", type: "budget_search", suggestion_type: "budget_shoes" },
    ];
  }

  return [
    {
      label: "Show All Products",
      query: "all products",
      type: "general_search",
      suggestion_type: "show_all",
    },
    {
      label: "Best Sellers",
      query: "popular items",
      type: "recommendation",
      suggestion_type: "best_sellers",
    },
    {
      label: "New Arrivals",
      query: "latest products",
      type: "general_search",
      suggestion_type: "new_arrivals",
    },
    {
      label: "Premium Picks",
      query: "premium products",
      type: "recommendation",
      suggestion_type: "premium_picks",
    },
  ];
};
