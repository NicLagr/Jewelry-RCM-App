import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Check if setup is already complete
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 400 }
      );
    }

    const data = await request.json();
    const {
      storeName,
      storePhone,
      storeEmail,
      adminName,
      adminEmail,
      adminPassword,
    } = data;

    // Validate required fields
    if (!storeName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create store settings and admin user in a transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create or update store settings
      await tx.storeSettings.upsert({
        where: { id: "default" },
        update: {
          storeName,
          phone: storePhone || null,
          email: storeEmail || null,
        },
        create: {
          id: "default",
          storeName,
          phone: storePhone || null,
          email: storeEmail || null,
        },
      });

      // Create admin user
      const newUser = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: "OWNER",
          active: true,
        },
      });

      return newUser;
    });

    // Create auth token - client will store in sessionStorage
    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Set setup-complete cookie (this one persists - just tracks if setup was done)
    const cookieStore = await cookies();
    cookieStore.set("setup-complete", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    // Return token for client to store in sessionStorage
    return NextResponse.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("Setup error:", error);
    
    // Check for unique constraint violation (email already exists)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Setup failed. Please try again." },
      { status: 500 }
    );
  }
}

