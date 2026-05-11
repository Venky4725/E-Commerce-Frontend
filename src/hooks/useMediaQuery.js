import { useState, useEffect } from "react";

/**
 * Custom hook for responsive design with media queries
 * Demonstrates: Custom hooks, useState, useEffect, window API
 * Use case: Responsive behavior, mobile detection
 * 
 * @param {string} query - Media query string (e.g., "(min-width: 768px)")
 * @returns {boolean} Whether the media query matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Update state when media query changes
    const handleChange = (event) => {
      setMatches(event.matches);
    };

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 1024px)");
}
