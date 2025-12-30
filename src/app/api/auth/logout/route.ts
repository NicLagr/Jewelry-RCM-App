import { NextResponse } from "next/server";

export async function POST() {
  // Logout is now handled client-side by clearing sessionStorage
  // This endpoint exists for compatibility but doesn't need to do anything
  return NextResponse.json({ success: true });
}

