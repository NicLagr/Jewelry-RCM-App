import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

/**
 * GET /api/storage/stats
 * 
 * Returns storage usage statistics and cleanup eligibility info.
 * Useful for monitoring storage usage against Supabase free tier limits.
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get all media with size info
    const allMedia = await prisma.jobMedia.findMany({
      select: {
        originalSizeBytes: true,
        compressedSizeBytes: true,
        createdAt: true,
        job: {
          select: {
            status: true,
            archivedAt: true,
            retentionPolicy: true,
          },
        },
      },
    });

    // Calculate totals
    let totalOriginalBytes = 0;
    let totalCompressedBytes = 0;
    let totalPhotos = 0;
    let photosEligibleForCleanup = 0;
    let bytesEligibleForCleanup = 0;

    for (const media of allMedia) {
      totalPhotos++;
      totalOriginalBytes += media.originalSizeBytes || 0;
      totalCompressedBytes += media.compressedSizeBytes || media.originalSizeBytes || 0;

      // Check if eligible for cleanup
      if (
        media.job.status === "ARCHIVED" &&
        media.job.archivedAt &&
        new Date(media.job.archivedAt) < sixMonthsAgo &&
        media.job.retentionPolicy === "STANDARD"
      ) {
        photosEligibleForCleanup++;
        bytesEligibleForCleanup += media.compressedSizeBytes || media.originalSizeBytes || 0;
      }
    }

    // Get job counts by retention policy
    const jobsByRetention = await prisma.job.groupBy({
      by: ["retentionPolicy"],
      _count: { id: true },
    });

    // Get archived jobs count
    const archivedJobsCount = await prisma.job.count({
      where: { status: "ARCHIVED" },
    });

    // Get archived jobs older than 6 months
    const oldArchivedJobsCount = await prisma.job.count({
      where: {
        status: "ARCHIVED",
        archivedAt: { lt: sixMonthsAgo },
        retentionPolicy: "STANDARD",
      },
    });

    // Calculate compression savings
    const compressionSavings = totalOriginalBytes - totalCompressedBytes;
    const compressionRatio = totalOriginalBytes > 0 
      ? (totalOriginalBytes / totalCompressedBytes).toFixed(2) 
      : "N/A";

    // Supabase free tier limit
    const SUPABASE_FREE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB
    const usagePercentage = ((totalCompressedBytes / SUPABASE_FREE_LIMIT_BYTES) * 100).toFixed(1);

    return NextResponse.json({
      storage: {
        totalPhotos,
        totalOriginalMB: (totalOriginalBytes / (1024 * 1024)).toFixed(2),
        totalCompressedMB: (totalCompressedBytes / (1024 * 1024)).toFixed(2),
        compressionSavingsMB: (compressionSavings / (1024 * 1024)).toFixed(2),
        compressionRatio,
        usagePercentage: `${usagePercentage}%`,
        freeSpaceRemainingMB: ((SUPABASE_FREE_LIMIT_BYTES - totalCompressedBytes) / (1024 * 1024)).toFixed(2),
      },
      cleanup: {
        photosEligibleForCleanup,
        bytesEligibleForCleanupMB: (bytesEligibleForCleanup / (1024 * 1024)).toFixed(2),
        oldArchivedJobsCount,
      },
      jobs: {
        totalArchived: archivedJobsCount,
        byRetentionPolicy: jobsByRetention.reduce((acc, item) => {
          acc[item.retentionPolicy] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      limits: {
        supabaseFreeStorageGB: 1,
        supabaseFreeBandwidthGB: 2,
        retentionMonths: 6,
      },
    });
  } catch (error) {
    console.error("Error fetching storage stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

