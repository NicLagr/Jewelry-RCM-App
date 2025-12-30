import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { generateJobNumber } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const filter = searchParams.get("filter");
    const assigneeId = searchParams.get("assigneeId");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    } else if (search) {
      // When searching, include all jobs (including archived)
      // No status filter applied
    } else {
      // By default, exclude archived jobs from the main board
      where.status = { not: "ARCHIVED" };
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (filter === "overdue") {
      where.promisedAt = { lt: new Date() };
      where.status = { notIn: ["READY", "PICKED_UP"] };
    } else if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.promisedAt = { gte: today, lt: tomorrow };
    } else if (filter === "my-jobs") {
      where.assigneeId = user.id;
    }

    if (search) {
      where.OR = [
        { jobNumber: { equals: parseInt(search) || -1 } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { itemType: { contains: search } },
        { issue: { contains: search } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        customer: true,
        assignee: {
          select: { id: true, name: true },
        },
        services: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      customerId,
      newCustomer,
      itemType,
      itemMetal,
      itemStone,
      description,
      issue,
      promisedAt,
      assigneeId,
      depositCents,
      services,
    } = data;

    let finalCustomerId = customerId;

    // Create new customer if needed
    if (newCustomer) {
      const customer = await prisma.customer.create({
        data: {
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          phone: newCustomer.phone,
          email: newCustomer.email,
        },
      });
      finalCustomerId = customer.id;
    }

    if (!finalCustomerId) {
      return NextResponse.json(
        { error: "Customer is required" },
        { status: 400 }
      );
    }

    // Generate unique job number
    let jobNumber = generateJobNumber();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.job.findUnique({ where: { jobNumber } });
      if (!existing) break;
      jobNumber = generateJobNumber();
      attempts++;
    }

    const job = await prisma.job.create({
      data: {
        jobNumber,
        customerId: finalCustomerId,
        itemType,
        itemMetal,
        itemStone,
        description,
        issue,
        promisedAt: new Date(promisedAt),
        assigneeId: assigneeId || null,
        depositCents: depositCents || 0,
        services: {
          create: services?.map((s: { serviceCatalogId?: string; name: string; qty: number; unitPriceCents: number }) => ({
            serviceCatalogId: s.serviceCatalogId || null,
            name: s.name,
            qty: s.qty,
            unitPriceCents: s.unitPriceCents,
          })) || [],
        },
        activities: {
          create: {
            type: "CREATED",
            message: `Job created by ${user.name}`,
            userId: user.id,
          },
        },
      },
      include: {
        customer: true,
        services: true,
      },
    });

    // Update customer's last visit
    await prisma.customer.update({
      where: { id: finalCustomerId },
      data: { lastVisitAt: new Date() },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

