import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import {
  compressImage,
  isProcessableImage,
  formatFileSize,
} from "@/lib/image-compression";

// GET /api/jobs/[id]/photos - List photos for a job
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
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const media = await prisma.jobMedia.findMany({
      where: { jobId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generates a unique filename for uploaded photos
 * Now uses .webp extension for compressed images
 */
function generateCompressedFilename(jobId: string, extension: string): string {
  const timestamp = Date.now();
  return `${jobId}/${timestamp}.${extension}`;
}

// POST /api/jobs/[id]/photos - Upload a photo with compression
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id },
      select: { id: true, jobNumber: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type - allow any image type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for original upload)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    const originalSize = originalBuffer.length;

    let finalBuffer: Buffer;
    let contentType: string;
    let extension: string;
    let compressionInfo = "";

    // Compress the image if it's a processable format
    if (isProcessableImage(file.type)) {
      try {
        const result = await compressImage(originalBuffer, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 80,
          format: "webp",
        });

        finalBuffer = result.buffer;
        contentType = result.contentType;
        extension = result.extension;
        compressionInfo = ` (compressed from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)}, ${result.compressionRatio.toFixed(1)}x reduction)`;

        console.log(
          `[Photo Upload] Job #${job.jobNumber}: ${formatFileSize(originalSize)} → ${formatFileSize(result.compressedSize)} (${result.compressionRatio.toFixed(1)}x)`
        );
      } catch (compressionError) {
        // If compression fails, fall back to original
        console.warn("Image compression failed, using original:", compressionError);
        finalBuffer = originalBuffer;
        contentType = file.type;
        extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      }
    } else {
      // Non-processable format, use original
      finalBuffer = originalBuffer;
      contentType = file.type;
      extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    }

    // Generate unique filename with new extension
    const filename = generateCompressedFilename(id, extension);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, finalBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    // Create JobMedia record in database
    const media = await prisma.jobMedia.create({
      data: {
        jobId: id,
        url: urlData.publicUrl,
        filename: file.name,
        storagePath: uploadData.path,
        originalSizeBytes: originalSize,
        compressedSizeBytes: finalBuffer.length,
      },
    });

    // Create activity log
    await prisma.jobActivity.create({
      data: {
        jobId: id,
        type: "NOTE",
        message: `Photo uploaded: ${file.name}${compressionInfo}`,
        userId: user.id,
      },
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    console.error("Error uploading photo:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
