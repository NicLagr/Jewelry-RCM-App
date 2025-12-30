"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip validation on public routes
    if (pathname === "/login" || pathname === "/setup" || pathname.startsWith("/api/")) {
      return;
    }

    const validateSession = async () => {
      const sessionId = sessionStorage.getItem("sessionId");

      // If no session ID in sessionStorage, user needs to log in
      if (!sessionId) {
        // Clear any stale cookies by calling logout
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        return;
      }

      // Validate session with server
      try {
        const res = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!data.valid) {
          sessionStorage.removeItem("sessionId");
          router.push("/login");
        }
      } catch (error) {
        console.error("Session validation failed:", error);
        sessionStorage.removeItem("sessionId");
        router.push("/login");
      }
    };

    validateSession();
  }, [pathname, router]);

  return null;
}

