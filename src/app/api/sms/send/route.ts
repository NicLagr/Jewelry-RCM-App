import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { jobId, phone, message } = data;

    if (!jobId || !phone || !message) {
      return NextResponse.json(
        { error: "Job ID, phone, and message are required" },
        { status: 400 }
      );
    }

    // Get store settings to check if SMS is enabled
    const settings = await prisma.storeSettings.findUnique({
      where: { id: "default" },
    });

    // Log the SMS (stub - would actually send via Twilio in production)
    console.log("=== SMS SEND STUB ===");
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`SMS Enabled: ${settings?.smsEnabled ?? false}`);
    console.log(`Provider: ${settings?.smsProvider ?? "twilio"}`);
    console.log(`From Number: ${settings?.smsFromNumber ?? "not configured"}`);
    console.log("=====================");

    // Create activity record
    await prisma.jobActivity.create({
      data: {
        jobId,
        type: "SMS_SENT",
        message: `SMS sent to ${phone}: "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "SMS logged (stub - would send via Twilio in production)",
    });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

