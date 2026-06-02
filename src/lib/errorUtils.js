const TECHNICAL_ERROR_PATTERN =
  /(connectionerror|rediserror|cacheerror|redis|cache backend|traceback|stack trace|componentstack|internal server error|exception|errno|econnrefused|etimedout|timeout error|failed to fetch|networkerror|sqlalchemy|psycopg|postgres|postgresql|aioredis|redis-py|call stack|\bat\s+.+:\d+:\d+)/i;

const STACK_LINE_PATTERN = /(^|\n)\s*(at\s+\S+\s+\(|File\s+"[^"]+",\s+line\s+\d+|Traceback\s+\(most recent call last\))/i;

const toMessageCandidate = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    const first = value[0];
    if (!first) return "";
    return toMessageCandidate(first.msg || first.message || first.type || first.detail || first);
  }

  if (typeof value === "object") {
    if (value.msg || value.message || value.detail || value.error) {
      return toMessageCandidate(value.msg || value.message || value.detail || value.error);
    }
    if (Array.isArray(value.loc) && value.loc.length > 0) {
      return `Invalid field: ${value.loc[value.loc.length - 1]}`;
    }
    return "";
  }

  return String(value);
};

export function isTechnicalErrorMessage(message) {
  if (!message || typeof message !== "string") return false;
  return TECHNICAL_ERROR_PATTERN.test(message) || STACK_LINE_PATTERN.test(message) || message.length > 280;
}

export function sanitizeErrorMessage(message, fallback = "Something went wrong. Please try again.") {
  const candidate = toMessageCandidate(message).trim();
  if (!candidate || isTechnicalErrorMessage(candidate)) return fallback;
  return candidate;
}

/**
 * Safely extract error message from API error responses without leaking
 * infrastructure errors such as Redis/cache failures or stack traces.
 */
export function extractErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  const data = error.response?.data;
  return sanitizeErrorMessage(
    data?.detail || data?.message || data?.error || error.message,
    fallback
  );
}

/**
 * Log error details for debugging.
 *
 * @param {string} context - Context where error occurred.
 * @param {Error} error - Error object.
 */
export function logError(context, error) {
  console.error(`${context} ERROR:`, error);

  if (error.response) {
    console.error(`${context} RESPONSE:`, error.response.data);
    console.error(`${context} STATUS:`, error.response.status);
  }

  if (error.config) {
    console.error(`${context} REQUEST:`, {
      url: error.config.url,
      method: error.config.method,
      data: error.config.data,
    });
  }
}
