import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { services } = await request.json();

    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id },
      include: { services: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get existing service IDs
    const existingIds = job.services.map((s) => s.id);
    
    // Separate services into updates and creates
    const toUpdate = services.filter(
      (s: { id: string; isNew?: boolean }) => !s.isNew && existingIds.includes(s.id)
    );
    const toCreate = services.filter(
      (s: { isNew?: boolean }) => s.isNew
    );
    
    // Find services to delete (existing ones not in the new list)
    const newIds = services.filter((s: { isNew?: boolean }) => !s.isNew).map((s: { id: string }) => s.id);
    const toDelete = existingIds.filter((id) => !newIds.includes(id));

    // Perform updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete removed services
      if (toDelete.length > 0) {
        await tx.jobServiceLine.deleteMany({
          where: {
            id: { in: toDelete },
            jobId: id,
          },
        });
      }

      // Update existing services
      for (const service of toUpdate) {
        await tx.jobServiceLine.update({
          where: { id: service.id },
          data: {
            name: service.name,
            qty: service.qty,
            unitPriceCents: service.unitPriceCents,
          },
        });
      }

      // Create new services
      for (const service of toCreate) {
        await tx.jobServiceLine.create({
          data: {
            jobId: id,
            name: service.name,
            qty: service.qty,
            unitPriceCents: service.unitPriceCents,
          },
        });
      }

      // Log activity
      await tx.jobActivity.create({
        data: {
          jobId: id,
          type: "NOTE",
          message: `Services updated by ${user.name}`,
          userId: user.id,
        },
      });
    });

    // Fetch and return updated job
    const updatedJob = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        assignee: {
          select: { id: true, name: true, email: true },
        },
        services: true,
        media: true,
        activities: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error updating services:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

