
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // Check if window is defined (for SSR)
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia(query);
      const updateMatches = (e: MediaQueryListEvent) => setMatches(e.matches);
      
      // Set initial value
      setMatches(mediaQuery.matches);
      
      // Listen for changes
      mediaQuery.addEventListener('change', updateMatches);
      
      // Clean up
      return () => mediaQuery.removeEventListener('change', updateMatches);
    }
  }, [query]);

  return matches;
}

// Add a simple hook for mobile detection
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
