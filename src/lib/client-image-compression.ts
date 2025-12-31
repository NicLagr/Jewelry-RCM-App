"use client";

import imageCompression from "browser-image-compression";

export interface ClientCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  initialQuality?: number;
}

// Vercel serverless functions have a 4.5MB body limit
// We target well under that to account for base64 encoding overhead
const DEFAULT_OPTIONS: ClientCompressionOptions = {
  maxSizeMB: 2, // Target 2MB max to stay under Vercel's 4.5MB limit
  maxWidthOrHeight: 1920, // Resize to final target size on client
  useWebWorker: true,
  initialQuality: 0.8,
};

/**
 * Client-side image compression for Vercel deployment
 * 
 * CRITICAL: Vercel serverless functions have a 4.5MB body size limit.
 * This compresses images on the client BEFORE upload to ensure they
 * fit within that limit.
 * 
 * For a 6MB phone photo:
 * - Client compresses to ~500KB-2MB
 * - Server does final optimization with Sharp to ~100-300KB
 * 
 * Benefits:
 * - Avoids 413 "Request Entity Too Large" errors
 * - Faster uploads (less data to transfer)
 * - Better user experience
 */
export async function compressImageClient(
  file: File,
  options: ClientCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip compression for already small files (under 500KB)
  if (file.size < 500 * 1024) {
    console.log(`[Client Compression] Skipping small file: ${formatFileSize(file.size)}`);
    return file;
  }

  try {
    const originalSize = file.size;
    console.log(`[Client Compression] Starting: ${formatFileSize(originalSize)}`);
    
    const compressedFile = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB!,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      useWebWorker: opts.useWebWorker!,
      initialQuality: opts.initialQuality,
      fileType: "image/jpeg",
    });

    const ratio = originalSize / compressedFile.size;
    console.log(
      `[Client Compression] Complete: ${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)} (${ratio.toFixed(1)}x reduction)`
    );

    // Verify we're under the limit
    if (compressedFile.size > 4 * 1024 * 1024) {
      console.warn("[Client Compression] Still too large, attempting more aggressive compression...");
      // Try again with more aggressive settings
      const moreCompressed = await imageCompression(compressedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.7,
        fileType: "image/jpeg",
      });
      console.log(`[Client Compression] Second pass: ${formatFileSize(moreCompressed.size)}`);
      return moreCompressed;
    }

    return compressedFile;
  } catch (error) {
    console.error("[Client Compression] Failed:", error);
    // If compression fails and file is too large, we can't proceed
    if (file.size > 4 * 1024 * 1024) {
      throw new Error(`Image too large (${formatFileSize(file.size)}). Please use a smaller image or try again.`);
    }
    return file;
  }
}

/**
 * Compresses multiple files in parallel
 */
export async function compressImagesClient(
  files: File[],
  options: ClientCompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImageClient(file, options)));
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
