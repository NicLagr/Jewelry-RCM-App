import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const VALID_POLICIES = ["STANDARD", "VIP_EXEMPT", "PERMANENT"];

/**
 * GET /api/jobs/[id]/retention
 * 
 * Get the retention policy for a specific job
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        jobNumber: true,
        retentionPolicy: true,
        archivedAt: true,
        status: true,
        customer: {
          select: {
            vip: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Calculate when this job would be eligible for cleanup
    let cleanupEligibleAt = null;
    if (job.archivedAt && job.retentionPolicy === "STANDARD") {
      const eligibleDate = new Date(job.archivedAt);
      eligibleDate.setMonth(eligibleDate.getMonth() + 6);
      cleanupEligibleAt = eligibleDate.toISOString();
    }

    return NextResponse.json({
      jobId: job.id,
      jobNumber: job.jobNumber,
      retentionPolicy: job.retentionPolicy,
      status: job.status,
      archivedAt: job.archivedAt,
      cleanupEligibleAt,
      customerIsVip: job.customer.vip,
      policyOptions: VALID_POLICIES,
    });
  } catch (error) {
    console.error("Error fetching retention policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/[id]/retention
 * 
 * Update the retention policy for a specific job
 * 
 * Body: { "retentionPolicy": "STANDARD" | "VIP_EXEMPT" | "PERMANENT" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can change retention policies
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can modify retention policies" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { retentionPolicy } = body;

    if (!retentionPolicy || !VALID_POLICIES.includes(retentionPolicy)) {
      return NextResponse.json(
        { error: `Invalid retention policy. Must be one of: ${VALID_POLICIES.join(", ")}` },
        { status: 400 }
      );
    }

    const existingJob = await prisma.job.findUnique({
      where: { id },
      select: { id: true, jobNumber: true, retentionPolicy: true },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = await prisma.job.update({
      where: { id },
      data: { retentionPolicy },
      select: {
        id: true,
        jobNumber: true,
        retentionPolicy: true,
      },
    });

    // Log the change
    await prisma.jobActivity.create({
      data: {
        jobId: id,
        type: "NOTE",
        message: `Retention policy changed from ${existingJob.retentionPolicy} to ${retentionPolicy} by ${user.name}`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("Error updating retention policy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

