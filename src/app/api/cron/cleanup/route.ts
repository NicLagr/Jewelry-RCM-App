import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

/**
 * Data Lifecycle Configuration
 * 
 * This cron job handles automatic cleanup of old archived jobs and their photos
 * to keep storage usage within Supabase free tier limits (1GB storage, 2GB bandwidth/month)
 */
const LIFECYCLE_CONFIG = {
  // Number of months after archival before cleanup
  archiveRetentionMonths: 6,
  // Whether to keep a minimal record of deleted jobs
  keepMinimalRecord: true,
  // Whether VIP customer jobs should be exempt from auto-deletion
  exemptVipCustomers: true,
  // Maximum jobs to process per run (to avoid timeout)
  batchSize: 50,
} as const;

/**
 * Cron job authorization
 * Vercel cron jobs include an authorization header
 */
function isAuthorizedCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  
  // Check for Vercel cron secret
  if (process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }
  
  // In development, allow requests without auth
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  return false;
}

/**
 * GET /api/cron/cleanup
 * 
 * Scheduled cleanup job for 6-month data lifecycle
 * - Finds archived jobs older than 6 months
 * - Deletes associated photos from Supabase storage
 * - Either deletes job records or strips to minimal data
 * - Optionally exempts VIP customer jobs
 */
export async function GET(request: Request) {
  // Verify this is an authorized cron request
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results = {
    processed: 0,
    photosDeleted: 0,
    jobsDeleted: 0,
    jobsMinimized: 0,
    errors: [] as string[],
    skippedVip: 0,
  };

  try {
    // Calculate cutoff date (6 months ago)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - LIFECYCLE_CONFIG.archiveRetentionMonths);

    console.log(`[Cleanup] Starting cleanup for jobs archived before ${cutoffDate.toISOString()}`);

    // Find archived jobs older than retention period
    // Status "ARCHIVED" indicates completed/archived jobs
    const oldArchivedJobs = await prisma.job.findMany({
      where: {
        status: "ARCHIVED",
        updatedAt: {
          lt: cutoffDate,
        },
      },
      include: {
        media: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            vip: true,
          },
        },
        services: true,
      },
      take: LIFECYCLE_CONFIG.batchSize,
      orderBy: {
        updatedAt: "asc",
      },
    });

    console.log(`[Cleanup] Found ${oldArchivedJobs.length} jobs to process`);

    for (const job of oldArchivedJobs) {
      try {
        // Skip VIP customer jobs if configured
        if (LIFECYCLE_CONFIG.exemptVipCustomers && job.customer.vip) {
          console.log(`[Cleanup] Skipping VIP customer job: ${job.jobNumber}`);
          results.skippedVip++;
          continue;
        }

        results.processed++;

        // Delete photos from Supabase storage
        if (job.media.length > 0) {
          const photoUrls = job.media.map((m) => m.url);
          
          for (const url of photoUrls) {
            try {
              // Extract path from URL
              const path = extractStoragePath(url);
              if (path) {
                const { error } = await supabase.storage
                  .from(STORAGE_BUCKET)
                  .remove([path]);
                
                if (error) {
                  console.error(`[Cleanup] Failed to delete photo: ${path}`, error);
                  results.errors.push(`Photo delete failed: ${path}`);
                } else {
                  results.photosDeleted++;
                }
              }
            } catch (photoError) {
              console.error(`[Cleanup] Error deleting photo:`, photoError);
              results.errors.push(`Photo error: ${url}`);
            }
          }

          // Delete JobMedia records
          await prisma.jobMedia.deleteMany({
            where: { jobId: job.id },
          });
        }

        if (LIFECYCLE_CONFIG.keepMinimalRecord) {
          // Keep minimal record: update job to stripped version
          // Delete services and activities but keep job summary
          await prisma.jobServiceLine.deleteMany({
            where: { jobId: job.id },
          });
          
          await prisma.jobActivity.deleteMany({
            where: { jobId: job.id },
          });

          // Calculate total from services before deleting them
          const totalCents = job.services.reduce(
            (sum, s) => sum + s.unitPriceCents * s.qty,
            0
          );

          // Update job to indicate it's been cleaned, keep minimal info
          await prisma.job.update({
            where: { id: job.id },
            data: {
              description: `[Data cleaned ${new Date().toISOString().split("T")[0]}] Original total: $${(totalCents / 100).toFixed(2)}. ${job.description || ""}`.trim(),
              issue: `[Archived ${LIFECYCLE_CONFIG.archiveRetentionMonths}+ months]`,
            },
          });

          results.jobsMinimized++;
          console.log(`[Cleanup] Minimized job: ${job.jobNumber}`);
        } else {
          // Delete the entire job record
          await prisma.job.delete({
            where: { id: job.id },
          });
          
          results.jobsDeleted++;
          console.log(`[Cleanup] Deleted job: ${job.jobNumber}`);
        }
      } catch (jobError) {
        console.error(`[Cleanup] Error processing job ${job.jobNumber}:`, jobError);
        results.errors.push(`Job ${job.jobNumber}: ${jobError instanceof Error ? jobError.message : "Unknown error"}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cleanup] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    });
  } catch (error) {
    console.error("[Cleanup] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      },
      { status: 500 }
    );
  }
}

/**
 * Extract storage path from Supabase public URL
 * URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
 */
function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    
    // Find the bucket name in the path and get everything after it
    const bucketIndex = pathParts.indexOf(STORAGE_BUCKET);
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join("/");
    }
    
    // Fallback: try to extract jobId/filename pattern
    const match = url.match(/([a-z0-9-]+\/\d+\.\w+)$/i);
    if (match) {
      return match[1];
    }
    
    return null;
  } catch {
    return null;
  }
}

