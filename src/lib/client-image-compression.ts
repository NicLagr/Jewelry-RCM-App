"use client";

import imageCompression from "browser-image-compression";

/**
 * Client-side image compression options
 * Pre-compresses images before upload to reduce bandwidth and upload time
 */
const CLIENT_COMPRESSION_OPTIONS = {
  // Maximum file size in MB (will be further compressed server-side)
  maxSizeMB: 1,
  // Maximum dimension for longest side
  maxWidthOrHeight: 2048,
  // Use web worker for compression (doesn't block UI)
  useWebWorker: true,
  // Preserve EXIF orientation data
  preserveExif: true,
  // File type (keep original or convert)
  fileType: "image/jpeg" as const,
  // Initial quality
  initialQuality: 0.85,
};

/**
 * Compress an image file before upload
 * This provides initial compression to reduce upload time
 * Server will apply final optimization
 *
 * @param file - Original image file from input or camera
 * @returns Compressed file ready for upload
 */
export async function compressImageForUpload(file: File): Promise<File> {
  // Skip compression for small files (under 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  // Skip compression for non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const compressedFile = await imageCompression(file, CLIENT_COMPRESSION_OPTIONS);

    const originalSize = formatFileSize(file.size);
    const newSize = formatFileSize(compressedFile.size);
    const reduction = Math.round((1 - compressedFile.size / file.size) * 100);
    console.log("Client compression: " + originalSize + " -> " + newSize + " (" + reduction + "% reduction)");

    return compressedFile;
  } catch (error) {
    console.warn("Client-side compression failed, using original:", error);
    return file;
  }
}

/**
 * Compress multiple images in parallel
 *
 * @param files - Array of image files
 * @returns Array of compressed files
 */
export async function compressImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImageForUpload));
}

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

/**
 * Check if browser supports image compression
 */
export function isCompressionSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof Blob !== "undefined"
  );
}

