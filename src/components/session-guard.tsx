"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip validation on public routes
    if (pathname === "/login" || pathname === "/setup") {
      setChecked(true);
      return;
    }

    // Check sessionStorage immediately on mount
    // sessionStorage is cleared on page refresh - this is the key to logout-on-refresh
    const authToken = sessionStorage.getItem("authToken");

    // If no auth token in sessionStorage, user needs to log in
    if (!authToken) {
      router.replace("/login");
      return;
    }

    // Auth token exists, mark as checked
    setChecked(true);
  }, [pathname, router]);

  // Show loading spinner while checking - prevents flash of content
  if (!checked && pathname !== "/login" && pathname !== "/setup") {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a4d3e]" />
      </div>
    );
  }

  return null;
}

