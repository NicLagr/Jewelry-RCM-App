import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  // Setup routes - always accessible
  const setupRoutes = ["/setup", "/api/setup"];
  const isSetupRoute = setupRoutes.some((route) => pathname.startsWith(route));

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API routes
  const isApiRoute = pathname.startsWith("/api");

  // Check if setup is needed
  const setupComplete = request.cookies.get("setup-complete")?.value;

  if (!setupComplete && !isSetupRoute && !isPublicRoute) {
    try {
      const checkUrl = new URL("/api/setup/check", request.url);
      const checkRes = await fetch(checkUrl.toString());
      const checkData = await checkRes.json();

      if (checkData.setupNeeded) {
        if (isApiRoute) {
          return NextResponse.json({ error: "Setup required" }, { status: 503 });
        }
        return NextResponse.redirect(new URL("/setup", request.url));
      } else {
        const response = NextResponse.next();
        response.cookies.set("setup-complete", "true", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
        });
        
        // Check auth after setup check
        if (!token && !isPublicRoute) {
          if (isApiRoute) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          return NextResponse.redirect(new URL("/login", request.url));
        }
        
        return response;
      }
    } catch (error) {
      console.error("Setup check failed:", error);
    }
  }

  // If on setup page but setup is complete, redirect to login
  if (isSetupRoute && setupComplete && pathname === "/setup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Auth check for protected routes
  if (!token && !isPublicRoute && !isSetupRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect logged-in users away from login page
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
