"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function LogoutOnReload() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip on login and setup pages
    if (pathname === "/login" || pathname === "/setup") {
      return;
    }

    // Check if we already handled this reload to prevent infinite loops
    if (sessionStorage.getItem("didReloadLogout") === "true") {
      return;
    }

    // Use Navigation Timing API to detect page reload
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      
      if (navEntry.type === "reload") {
        // Set flag to prevent infinite loop
        sessionStorage.setItem("didReloadLogout", "true");
        
        // Call logout endpoint and redirect
        fetch("/api/auth/logout", { 
          method: "POST", 
          credentials: "include" 
        }).finally(() => {
          window.location.replace("/login");
        });
      }
    }
  }, [pathname]);

  return null;
}

