import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const cookieStore = await cookies();
    const serverSessionId = cookieStore.get("session-id")?.value;

    // If session IDs don't match, the session is invalid
    if (!serverSessionId || serverSessionId !== sessionId) {
      // Clear cookies
      cookieStore.delete("auth-token");
      cookieStore.delete("session-id");
      
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json({ valid: false });
  }
}

