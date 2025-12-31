import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  aggressivelyCompressImage,
  extractStoragePath,
  downloadImageFromStorage,
  replaceImageInStorage,
  deleteImageFromStorage,
  formatBytes,
} from "@/lib/image-lifecycle";

/**
 * Photo Lifecycle Configuration
 * 
 * Manages storage efficiently for high-volume jewelry CRM:
 * - 0-1 month archived: Full quality (~300KB)
 * - 1-6 months archived: Aggressively compressed (~20-50KB)
 * - 6+ months archived: Photos deleted, ticket text preserved
 */
const LIFECYCLE_CONFIG = {
  // Maximum photos to process per run (avoid Vercel timeout)
  // Hobby: 10s timeout, Pro: 60s timeout
  batchSize: 25,
  // Delay between operations to avoid rate limits (ms)
  operationDelay: 100,
  // Skip photos smaller than this (already compressed enough)
  skipIfSmallerThan: 60 * 1024, // 60KB
} as const;

/**
 * Processing results for logging and monitoring
 */
interface ProcessingResults {
  photosCompressed: number;
  photosDeleted: number;
  photosSkipped: number;
  bytesFreed: number;
  errors: string[];
  jobsProcessed: number;
}

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
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET /api/cron/photo-cleanup
 * 
 * Scheduled photo lifecycle management:
 * 1. Find archived jobs with photos needing compression (1-6 months)
 * 2. Find archived jobs with photos needing deletion (6+ months)
 * 3. Process in batches to avoid timeouts
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
  const results: ProcessingResults = {
    photosCompressed: 0,
    photosDeleted: 0,
    photosSkipped: 0,
    bytesFreed: 0,
    errors: [],
    jobsProcessed: 0,
  };

  try {
    console.log("[PhotoCleanup] Starting photo lifecycle processing...");

    // Calculate date thresholds
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // PHASE 1: Compress photos from jobs archived 1-6 months ago
    await processCompressionPhase(oneMonthAgo, sixMonthsAgo, results);

    // PHASE 2: Delete photos from jobs archived 6+ months ago
    await processDeletionPhase(sixMonthsAgo, results);

    const duration = Date.now() - startTime;
    console.log(`[PhotoCleanup] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        ...results,
        bytesFreed: formatBytes(results.bytesFreed),
      },
    });
  } catch (error) {
    console.error("[PhotoCleanup] Fatal error:", error);
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
 * Phase 1: Compress photos from jobs archived 1-6 months ago
 */
async function processCompressionPhase(
  oneMonthAgo: Date,
  sixMonthsAgo: Date,
  results: ProcessingResults
): Promise<void> {
  console.log("[PhotoCleanup] Phase 1: Processing photos for compression...");

  // Find archived jobs in the 1-6 month window with uncompressed photos
  const jobsToCompress = await prisma.job.findMany({
    where: {
      status: "ARCHIVED",
      archivedAt: {
        gte: sixMonthsAgo,
        lt: oneMonthAgo,
      },
      media: {
        some: {
          compressedAt: null,
          deletedAt: null,
        },
      },
    },
    include: {
      media: {
        where: {
          compressedAt: null,
          deletedAt: null,
        },
      },
    },
    take: LIFECYCLE_CONFIG.batchSize,
    orderBy: {
      archivedAt: "asc", // Process oldest first
    },
  });

  console.log(`[PhotoCleanup] Found ${jobsToCompress.length} jobs with photos to compress`);

  for (const job of jobsToCompress) {
    results.jobsProcessed++;

    for (const media of job.media) {
      try {
        // Extract storage path from URL
        const storagePath = extractStoragePath(media.url);
        if (!storagePath) {
          console.error(`[PhotoCleanup] Could not extract path from URL: ${media.url}`);
          results.errors.push(`Invalid URL: ${media.id}`);
          continue;
        }

        // Download the current image
        const imageBuffer = await downloadImageFromStorage(storagePath);
        if (!imageBuffer) {
          console.error(`[PhotoCleanup] Could not download: ${storagePath}`);
          results.errors.push(`Download failed: ${media.id}`);
          continue;
        }

        const originalSize = imageBuffer.length;

        // Skip if already small enough
        if (originalSize < LIFECYCLE_CONFIG.skipIfSmallerThan) {
          console.log(`[PhotoCleanup] Skipping already small photo: ${storagePath} (${formatBytes(originalSize)})`);
          
          // Mark as compressed anyway to avoid reprocessing
          await prisma.jobMedia.update({
            where: { id: media.id },
            data: {
              compressedAt: new Date(),
              sizeBytes: originalSize,
            },
          });
          
          results.photosSkipped++;
          continue;
        }

        // Aggressively compress the image
        const compressed = await aggressivelyCompressImage(imageBuffer);

        // Replace in storage
        const success = await replaceImageInStorage(
          storagePath,
          compressed.buffer,
          compressed.contentType
        );

        if (!success) {
          results.errors.push(`Replace failed: ${media.id}`);
          continue;
        }

        // Update database record
        await prisma.jobMedia.update({
          where: { id: media.id },
          data: {
            compressedAt: new Date(),
            sizeBytes: compressed.compressedSize,
          },
        });

        const bytesFreed = originalSize - compressed.compressedSize;
        results.bytesFreed += bytesFreed;
        results.photosCompressed++;

        console.log(
          `[PhotoCleanup] Compressed: ${storagePath} (${formatBytes(originalSize)} → ${formatBytes(compressed.compressedSize)}, freed ${formatBytes(bytesFreed)})`
        );

        // Rate limiting
        await sleep(LIFECYCLE_CONFIG.operationDelay);
      } catch (error) {
        console.error(`[PhotoCleanup] Error compressing photo ${media.id}:`, error);
        results.errors.push(`Compress error: ${media.id} - ${error instanceof Error ? error.message : "Unknown"}`);
      }
    }
  }
}

/**
 * Phase 2: Delete photos from jobs archived 6+ months ago
 */
async function processDeletionPhase(
  sixMonthsAgo: Date,
  results: ProcessingResults
): Promise<void> {
  console.log("[PhotoCleanup] Phase 2: Processing photos for deletion...");

  // Find archived jobs older than 6 months with photos still in storage
  const jobsToDelete = await prisma.job.findMany({
    where: {
      status: "ARCHIVED",
      archivedAt: {
        lt: sixMonthsAgo,
      },
      media: {
        some: {
          deletedAt: null,
        },
      },
    },
    include: {
      media: {
        where: {
          deletedAt: null,
        },
      },
      customer: {
        select: {
          vip: true,
        },
      },
    },
    take: LIFECYCLE_CONFIG.batchSize,
    orderBy: {
      archivedAt: "asc",
    },
  });

  console.log(`[PhotoCleanup] Found ${jobsToDelete.length} jobs with photos to delete`);

  for (const job of jobsToDelete) {
    // Skip VIP customer jobs (preserve their photos)
    if (job.customer.vip) {
      console.log(`[PhotoCleanup] Skipping VIP customer job: ${job.jobNumber}`);
      continue;
    }

    results.jobsProcessed++;
    let photosDeletedForJob = 0;

    for (const media of job.media) {
      try {
        // Extract storage path from URL
        const storagePath = extractStoragePath(media.url);
        if (!storagePath) {
          console.error(`[PhotoCleanup] Could not extract path from URL: ${media.url}`);
          results.errors.push(`Invalid URL: ${media.id}`);
          continue;
        }

        // Delete from storage
        const success = await deleteImageFromStorage(storagePath);

        if (!success) {
          results.errors.push(`Delete failed: ${media.id}`);
          continue;
        }

        // Soft delete in database (preserve record for reference)
        await prisma.jobMedia.update({
          where: { id: media.id },
          data: {
            deletedAt: new Date(),
          },
        });

        // Track bytes freed (use stored size or estimate)
        const estimatedSize = media.sizeBytes || 50 * 1024; // Default 50KB if unknown
        results.bytesFreed += estimatedSize;
        results.photosDeleted++;
        photosDeletedForJob++;

        console.log(`[PhotoCleanup] Deleted: ${storagePath}`);

        // Rate limiting
        await sleep(LIFECYCLE_CONFIG.operationDelay);
      } catch (error) {
        console.error(`[PhotoCleanup] Error deleting photo ${media.id}:`, error);
        results.errors.push(`Delete error: ${media.id} - ${error instanceof Error ? error.message : "Unknown"}`);
      }
    }

    // Add activity log for the job
    if (photosDeletedForJob > 0) {
      try {
        await prisma.jobActivity.create({
          data: {
            jobId: job.id,
            type: "NOTE",
            message: `Photos removed (6-month retention policy): ${photosDeletedForJob} photo(s) deleted from storage`,
          },
        });
      } catch (error) {
        console.error(`[PhotoCleanup] Failed to create activity log for job ${job.id}:`, error);
      }
    }
  }
}

