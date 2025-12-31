import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  deleteStorageFile,
  extractStoragePath,
} from "@/lib/supabase";

// Vercel Cron authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Data Lifecycle Cleanup Endpoint
 * 
 * Runs on a schedule to manage storage and data retention:
 * 
 * 1. Jobs archived > 6 months with STANDARD retention:
 *    - Delete all associated photos from storage
 *    - Keep job record with minimal metadata for reference
 * 
 * 2. VIP_EXEMPT and PERMANENT retention jobs are preserved
 * 
 * This endpoint is called by Vercel Cron (configured in vercel.json)
 * 
 * GET /api/cron/cleanup
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get("authorization");
    
    // In development, allow without auth; in production require CRON_SECRET
    if (process.env.NODE_ENV === "production") {
      if (!CRON_SECRET) {
        console.error("[Cleanup] CRON_SECRET not configured");
        return NextResponse.json(
          { error: "Cron not configured" },
          { status: 500 }
        );
      }
      
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const startTime = Date.now();
    console.log("[Cleanup] Starting 6-month data lifecycle cleanup...");

    // Calculate 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Find archived jobs older than 6 months with STANDARD retention
    // that still have photos (media records with URLs)
    const jobsToCleanup = await prisma.job.findMany({
      where: {
        status: "ARCHIVED",
        archivedAt: {
          lt: sixMonthsAgo,
        },
        retentionPolicy: "STANDARD",
        media: {
          some: {}, // Has at least one media record
        },
      },
      include: {
        media: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            vip: true,
          },
        },
      },
    });

    console.log(`[Cleanup] Found ${jobsToCleanup.length} jobs eligible for cleanup`);

    let photosDeleted = 0;
    let photosFailedToDelete = 0;
    let storageFreed = 0;
    const jobsProcessed: string[] = [];

    for (const job of jobsToCleanup) {
      // Skip if customer is VIP (extra safety check)
      if (job.customer.vip) {
        console.log(`[Cleanup] Skipping job #${job.jobNumber} - VIP customer`);
        // Update retention policy to VIP_EXEMPT
        await prisma.job.update({
          where: { id: job.id },
          data: { retentionPolicy: "VIP_EXEMPT" },
        });
        continue;
      }

      console.log(`[Cleanup] Processing job #${job.jobNumber} (${job.media.length} photos)`);

      for (const media of job.media) {
        // Get storage path from URL or stored path
        const storagePath = media.storagePath || extractStoragePath(media.url);
        
        if (storagePath) {
          const { success, error } = await deleteStorageFile(storagePath);
          
          if (success) {
            photosDeleted++;
            storageFreed += media.compressedSizeBytes || media.originalSizeBytes || 0;
            console.log(`[Cleanup] Deleted: ${storagePath}`);
          } else {
            photosFailedToDelete++;
            console.error(`[Cleanup] Failed to delete ${storagePath}: ${error}`);
          }
        } else {
          console.warn(`[Cleanup] Could not extract storage path from: ${media.url}`);
          photosFailedToDelete++;
        }
      }

      // Delete media records from database
      await prisma.jobMedia.deleteMany({
        where: { jobId: job.id },
      });

      // Create activity log for cleanup
      await prisma.jobActivity.create({
        data: {
          jobId: job.id,
          type: "NOTE",
          message: `Automated cleanup: ${job.media.length} photos deleted (6-month retention policy)`,
        },
      });

      jobsProcessed.push(`#${job.jobNumber}`);
    }

    const duration = Date.now() - startTime;
    const storageFreedMB = (storageFreed / (1024 * 1024)).toFixed(2);

    const summary = {
      success: true,
      jobsProcessed: jobsProcessed.length,
      jobNumbers: jobsProcessed,
      photosDeleted,
      photosFailedToDelete,
      storageFreedMB: `${storageFreedMB} MB`,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    console.log("[Cleanup] Completed:", JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json(
      { 
        error: "Cleanup failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual cleanup with options
 * 
 * Body:
 * {
 *   "dryRun": boolean - If true, only reports what would be deleted
 *   "jobIds": string[] - Optional specific job IDs to clean up
 * }
 */
export async function POST(request: Request) {
  try {
    // Verify authentication - require CRON_SECRET for manual runs too
    const authHeader = request.headers.get("authorization");
    
    if (process.env.NODE_ENV === "production") {
      if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun = false, jobIds } = body as { dryRun?: boolean; jobIds?: string[] };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Build query
    const whereClause: {
      status: string;
      archivedAt?: { lt: Date };
      retentionPolicy: string;
      id?: { in: string[] };
      media: { some: object };
    } = {
      status: "ARCHIVED",
      retentionPolicy: "STANDARD",
      media: { some: {} },
    };

    if (jobIds && jobIds.length > 0) {
      whereClause.id = { in: jobIds };
    } else {
      whereClause.archivedAt = { lt: sixMonthsAgo };
    }

    const jobsToCleanup = await prisma.job.findMany({
      where: whereClause,
      include: {
        media: true,
        customer: {
          select: {
            firstName: true,
            lastName: true,
            vip: true,
          },
        },
      },
    });

    if (dryRun) {
      const totalPhotos = jobsToCleanup.reduce((sum, job) => sum + job.media.length, 0);
      const totalSize = jobsToCleanup.reduce((sum, job) => 
        sum + job.media.reduce((mediaSum, m) => 
          mediaSum + (m.compressedSizeBytes || m.originalSizeBytes || 0), 0
        ), 0
      );

      return NextResponse.json({
        dryRun: true,
        jobsToCleanup: jobsToCleanup.length,
        jobs: jobsToCleanup.map(j => ({
          jobNumber: j.jobNumber,
          customer: `${j.customer.firstName} ${j.customer.lastName}`,
          vip: j.customer.vip,
          archivedAt: j.archivedAt,
          photoCount: j.media.length,
        })),
        totalPhotos,
        estimatedStorageMB: (totalSize / (1024 * 1024)).toFixed(2),
      });
    }

    // Actual cleanup would go here (same logic as GET)
    // For safety, POST with dryRun=false redirects to GET behavior
    return NextResponse.json({
      message: "Use GET endpoint for actual cleanup, or POST with dryRun=true for preview",
    });

  } catch (error) {
    console.error("[Cleanup POST] Error:", error);
    return NextResponse.json(
      { 
        error: "Request failed", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

