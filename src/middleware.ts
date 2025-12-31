import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  // Setup routes - always accessible
  const setupRoutes = ["/setup", "/api/setup"];
  const isSetupRoute = setupRoutes.some((route) => pathname.startsWith(route));

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/auth/login", "/api/cron"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes that need auth check
  const isApiRoute = pathname.startsWith("/api");

  // Check if setup is needed (no users in database)
  // We use a cookie to cache this check to avoid hitting the DB on every request
  const setupComplete = request.cookies.get("setup-complete")?.value;

  if (!setupComplete && !isSetupRoute) {
    // Check if setup is needed by calling our API
    try {
      const checkUrl = new URL("/api/setup/check", request.url);
      const checkRes = await fetch(checkUrl.toString());
      const checkData = await checkRes.json();

      if (checkData.setupNeeded) {
        // Redirect to setup page
        if (isApiRoute) {
          return NextResponse.json({ error: "Setup required" }, { status: 503 });
        }
        return NextResponse.redirect(new URL("/setup", request.url));
      } else {
        // Setup is complete, set a cookie to avoid checking again
        const response = NextResponse.next();
        response.cookies.set("setup-complete", "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        
        // Continue with normal auth flow
        if (!token && !isPublicRoute) {
          if (isApiRoute) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          return NextResponse.redirect(new URL("/login", request.url));
        }

        if (token && pathname === "/login") {
          return NextResponse.redirect(new URL("/jobs", request.url));
        }

        return response;
      }
    } catch (error) {
      // If check fails, continue normally
      console.error("Setup check failed:", error);
    }
  }

  // If on setup page but setup is complete, redirect to login
  if (isSetupRoute && setupComplete) {
    if (pathname === "/setup") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Normal auth flow
  if (!token && !isPublicRoute && !isSetupRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/jobs", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
