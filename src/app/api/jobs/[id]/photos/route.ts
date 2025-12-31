import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import {
  compressImage,
  generateCompressedFilename,
  needsCompression,
  formatBytes,
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

// POST /api/jobs/[id]/photos - Upload a photo
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

    // Validate file size (max 10MB for raw upload, will be compressed)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let uploadBuffer: Buffer;
    let contentType: string;
    let filename: string;
    let compressionInfo = "";

    // Compress image if needed (skip for already small images)
    if (needsCompression(file.size)) {
      try {
        const result = await compressImage(inputBuffer, file.name);
        uploadBuffer = result.buffer;
        contentType = result.contentType;
        filename = generateCompressedFilename(id, result.extension);
        compressionInfo = ` (compressed: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)})`;
        
        console.log(
          `Image compressed: ${file.name} - ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${result.width}x${result.height})`
        );
      } catch (compressionError) {
        console.error("Compression failed, uploading original:", compressionError);
        // Fall back to original if compression fails
        uploadBuffer = inputBuffer;
        contentType = file.type;
        filename = generateCompressedFilename(id, file.name.split(".").pop() || "jpg");
      }
    } else {
      // Small file, upload as-is but still use consistent naming
      uploadBuffer = inputBuffer;
      contentType = file.type;
      filename = generateCompressedFilename(id, file.name.split(".").pop() || "jpg");
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, uploadBuffer, {
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

