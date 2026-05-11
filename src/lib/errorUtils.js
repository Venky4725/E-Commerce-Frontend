/**
 * Safely extract error message from API error response
 * Handles FastAPI validation errors, string errors, and object errors
 * 
 * @param {Error} error - Axios error object
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} - Safe error message string
 */
export function extractErrorMessage(error, fallback = "An error occurred") {
  // No error object
  if (!error) return fallback;
  
  // Check for response data detail (FastAPI format)
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    
    // Handle FastAPI validation error array: [{ msg: "...", type: "...", loc: [...] }]
    if (Array.isArray(detail) && detail.length > 0) {
      const firstError = detail[0];
      
      // Try to extract message
      if (firstError.msg) return firstError.msg;
      if (firstError.type) return firstError.type;
      
      // If has location, format it nicely
      if (firstError.loc && Array.isArray(firstError.loc)) {
        const field = firstError.loc[firstError.loc.length - 1];
        return `Invalid field: ${field}`;
      }
      
      return "Validation error";
    }
    
    // Handle simple string detail
    if (typeof detail === "string") {
      return detail;
    }
    
    // Handle object detail (shouldn't happen, but be safe)
    if (typeof detail === "object") {
      console.warn("⚠️ Error detail is object:", detail);
      return JSON.stringify(detail);
    }
  }
  
  // Check for error message
  if (error.message && typeof error.message === "string") {
    return error.message;
  }
  
  // Fallback
  return fallback;
}

/**
 * Log error details for debugging
 * 
 * @param {string} context - Context where error occurred (e.g., "ORDER CREATION")
 * @param {Error} error - Error object
 */
export function logError(context, error) {
  console.error(`❌ ${context} ERROR:`, error);
  
  if (error.response) {
    console.error(`❌ ${context} RESPONSE:`, error.response.data);
    console.error(`❌ ${context} STATUS:`, error.response.status);
  }
  
  if (error.config) {
    console.error(`❌ ${context} REQUEST:`, {
      url: error.config.url,
      method: error.config.method,
      data: error.config.data,
    });
  }
}
