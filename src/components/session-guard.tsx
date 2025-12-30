"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip on public routes
    if (pathname === "/login" || pathname === "/setup") {
      setChecked(true);
      return;
    }

    // Detect page reload using Navigation Timing API
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const nav = navEntries[0];

    if (nav?.type === "reload") {
      // Page was reloaded - force logout
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        router.replace("/login");
      });
      return;
    }

    // Not a reload - check if we have valid auth cookie
    // The middleware will handle redirecting if no cookie exists
    setChecked(true);
  }, [pathname, router]);

  // Show loading spinner while checking
  if (!checked && pathname !== "/login" && pathname !== "/setup") {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a4d3e]" />
      </div>
    );
  }

  return null;
}

