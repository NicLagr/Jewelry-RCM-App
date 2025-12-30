"use client";

import { useEffect } from "react";

// This component sets up a global fetch interceptor that adds auth headers
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Store the original fetch
    const originalFetch = window.fetch;

    // Override fetch to add auth header
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      
      // Only add auth header for our API routes
      if (url.startsWith("/api/") && !url.includes("/api/auth/") && !url.includes("/api/setup/")) {
        const authToken = sessionStorage.getItem("authToken");
        
        if (authToken) {
          const headers = new Headers(init?.headers);
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${authToken}`);
          }
          
          return originalFetch(input, {
            ...init,
            headers,
          });
        }
      }
      
      return originalFetch(input, init);
    };

    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}

