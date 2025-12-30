import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import twilio from "twilio";

// Format phone number to E.164 format for Twilio
function formatPhoneToE164(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If it's 10 digits (US number without country code), add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 11 digits starting with 1 (US number with country code), add +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // Otherwise, assume it already has proper format or add + prefix
  return digits.startsWith("+") ? phone : `+${digits}`;
}

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

    // Check if SMS is enabled in store settings
    if (!settings?.smsEnabled) {
      // Log the attempt even if SMS is disabled
      await prisma.jobActivity.create({
        data: {
          jobId,
          type: "SMS_SENT",
          message: `SMS not sent (SMS disabled in settings): "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
          userId: user.id,
        },
      });

      return NextResponse.json(
        { error: "SMS is disabled in store settings. Enable it in Settings > Store Info." },
        { status: 400 }
      );
    }

    // Check for Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      // Log the attempt
      await prisma.jobActivity.create({
        data: {
          jobId,
          type: "SMS_SENT",
          message: `SMS not sent (Twilio not configured): "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}"`,
          userId: user.id,
        },
      });

      return NextResponse.json(
        { error: "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables." },
        { status: 500 }
      );
    }

    // Format phone number to E.164 format
    const formattedPhone = formatPhoneToE164(phone);

    // Initialize Twilio client and send SMS
    const client = twilio(accountSid, authToken);

    try {
      const twilioMessage = await client.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: formattedPhone,
      });

      // Log successful SMS send
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
        message: "SMS sent successfully",
        sid: twilioMessage.sid,
      });
    } catch (twilioError: unknown) {
      console.error("Twilio error:", twilioError);

      // Log failed SMS attempt
      const errorMessage = twilioError instanceof Error ? twilioError.message : "Unknown error";
      await prisma.jobActivity.create({
        data: {
          jobId,
          type: "SMS_SENT",
          message: `SMS failed to ${phone}: ${errorMessage}`,
          userId: user.id,
        },
      });

      return NextResponse.json(
        { error: `Failed to send SMS: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending SMS:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
