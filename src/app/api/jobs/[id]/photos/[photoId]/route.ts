import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

// DELETE /api/jobs/[id]/photos/[photoId] - Delete a photo
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, photoId } = await params;

    // Find the media record
    const media = await prisma.jobMedia.findFirst({
      where: {
        id: photoId,
        jobId: id,
      },
    });

    if (!media) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Extract the storage path from the URL
    // URL format: https://xxx.supabase.co/storage/v1/object/public/job-photos/jobId/timestamp.ext
    const url = new URL(media.url);
    const pathParts = url.pathname.split(`/${STORAGE_BUCKET}/`);
    const storagePath = pathParts[1];

    if (storagePath) {
      // Delete from Supabase Storage
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (deleteError) {
        console.error("Supabase delete error:", deleteError);
        // Continue with database deletion even if storage delete fails
      }
    }

    // Delete the database record
    await prisma.jobMedia.delete({
      where: { id: photoId },
    });

    // Create activity log
    await prisma.jobActivity.create({
      data: {
        jobId: id,
        type: "NOTE",
        message: `Photo deleted: ${media.filename || "Unknown"}`,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

