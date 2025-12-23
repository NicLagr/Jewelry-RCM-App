import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const filter = searchParams.get("filter");

    const where: Record<string, unknown> = {};

    if (filter === "vip") {
      where.vip = true;
    } else if (filter === "recent") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.lastVisitAt = { gte: thirtyDaysAgo };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        jobs: {
          include: {
            services: true,
          },
        },
      },
      orderBy: { lastVisitAt: "desc" },
    });

    // Calculate stats for each customer
    const customersWithStats = customers.map((customer: typeof customers[number]) => {
      const totalJobs = customer.jobs.length;
      const activeJobs = customer.jobs.filter(
        (j: typeof customer.jobs[number]) => !["READY", "PICKED_UP"].includes(j.status)
      ).length;
      const lifetimeValueCents = customer.jobs.reduce((sum: number, job: typeof customer.jobs[number]) => {
        return (
          sum +
          job.services.reduce((s: number, svc: typeof job.services[number]) => s + svc.unitPriceCents * svc.qty, 0)
        );
      }, 0);

      return {
        ...customer,
        totalJobs,
        activeJobs,
        lifetimeValueCents,
        jobs: undefined, // Remove jobs from response to keep it clean
      };
    });

    return NextResponse.json(customersWithStats);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { firstName, lastName, phone, email, vip } = data;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        vip: vip || false,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

