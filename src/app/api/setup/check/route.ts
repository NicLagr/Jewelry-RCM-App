import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Check if any users exist in the database
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      setupNeeded: userCount === 0,
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    return NextResponse.json(
      { error: "Failed to check setup status", setupNeeded: true },
      { status: 500 }
    );
  }
}

