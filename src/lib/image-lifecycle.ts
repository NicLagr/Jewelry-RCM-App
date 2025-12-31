import sharp from "sharp";
import { supabase, STORAGE_BUCKET } from "./supabase";

/**
 * Aggressive compression configuration for archived photos (1-6 months)
 * Target: ~20-50KB while keeping jewelry details recognizable
 */
export const AGGRESSIVE_COMPRESSION_CONFIG = {
  // Maximum dimension for the longest side (smaller than upload)
  maxDimension: 800,
  // Target quality for WebP (much lower than upload)
  webpQuality: 20,
  // Target quality for JPEG (much lower than upload)
  jpegQuality: 25,
  // Maximum file size target in bytes (~50KB)
  maxFileSizeBytes: 50 * 1024,
  // Minimum quality to maintain recognizability
  minQuality: 15,
} as const;

/**
 * Photo lifecycle tiers based on archive age
 */
export enum PhotoLifecycleTier {
  FRESH = "FRESH",           // 0-1 month: Full quality (~300KB)
  COMPRESSED = "COMPRESSED", // 1-6 months: Aggressive compression (~20-50KB)
  DELETED = "DELETED",       // 6+ months: Deleted from storage
}

/**
 * Compression result with metadata
 */
export interface AggressiveCompressionResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Aggressively compress an image for long-term storage
 * Optimized for small file size while maintaining recognizability
 * 
 * @param inputBuffer - Original image buffer
 * @returns Compressed image data with metadata
 */
export async function aggressivelyCompressImage(
  inputBuffer: Buffer
): Promise<AggressiveCompressionResult> {
  const originalSize = inputBuffer.length;

  // Get image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const { width: origWidth, height: origHeight } = metadata;

  if (!origWidth || !origHeight) {
    throw new Error("Could not read image dimensions");
  }

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = origWidth;
  let newHeight = origHeight;

  if (origWidth > AGGRESSIVE_COMPRESSION_CONFIG.maxDimension || 
      origHeight > AGGRESSIVE_COMPRESSION_CONFIG.maxDimension) {
    if (origWidth > origHeight) {
      newWidth = AGGRESSIVE_COMPRESSION_CONFIG.maxDimension;
      newHeight = Math.round((origHeight / origWidth) * AGGRESSIVE_COMPRESSION_CONFIG.maxDimension);
    } else {
      newHeight = AGGRESSIVE_COMPRESSION_CONFIG.maxDimension;
      newWidth = Math.round((origWidth / origHeight) * AGGRESSIVE_COMPRESSION_CONFIG.maxDimension);
    }
  }

  // Try WebP first (best compression)
  let result = await compressToFormat(inputBuffer, newWidth, newHeight, "webp", AGGRESSIVE_COMPRESSION_CONFIG.webpQuality);

  // If still too large, progressively reduce quality
  let quality = AGGRESSIVE_COMPRESSION_CONFIG.webpQuality;
  while (result.length > AGGRESSIVE_COMPRESSION_CONFIG.maxFileSizeBytes && 
         quality > AGGRESSIVE_COMPRESSION_CONFIG.minQuality) {
    quality -= 3;
    result = await compressToFormat(inputBuffer, newWidth, newHeight, "webp", quality);
  }

  // If WebP still too large, try JPEG
  if (result.length > AGGRESSIVE_COMPRESSION_CONFIG.maxFileSizeBytes) {
    quality = AGGRESSIVE_COMPRESSION_CONFIG.jpegQuality;
    let jpegResult = await compressToFormat(inputBuffer, newWidth, newHeight, "jpeg", quality);

    while (jpegResult.length > AGGRESSIVE_COMPRESSION_CONFIG.maxFileSizeBytes && 
           quality > AGGRESSIVE_COMPRESSION_CONFIG.minQuality) {
      quality -= 3;
      jpegResult = await compressToFormat(inputBuffer, newWidth, newHeight, "jpeg", quality);
    }

    // Use whichever format produced smaller file
    if (jpegResult.length < result.length) {
      return {
        buffer: jpegResult,
        contentType: "image/jpeg",
        extension: "jpg",
        originalSize,
        compressedSize: jpegResult.length,
        width: newWidth,
        height: newHeight,
      };
    }
  }

  return {
    buffer: result,
    contentType: "image/webp",
    extension: "webp",
    originalSize,
    compressedSize: result.length,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Compress image to specific format with given quality
 */
async function compressToFormat(
  inputBuffer: Buffer,
  width: number,
  height: number,
  format: "webp" | "jpeg",
  quality: number
): Promise<Buffer> {
  const pipeline = sharp(inputBuffer)
    .resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .rotate(); // Auto-rotate based on EXIF orientation

  if (format === "webp") {
    return pipeline.webp({ quality, effort: 6 }).toBuffer();
  } else {
    return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  }
}

/**
 * Extract storage path from Supabase public URL
 * URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
 */
export function extractStoragePath(url: string): string | null {
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

/**
 * Download an image from Supabase storage
 */
export async function downloadImageFromStorage(path: string): Promise<Buffer | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(path);

    if (error || !data) {
      console.error(`[ImageLifecycle] Failed to download: ${path}`, error);
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`[ImageLifecycle] Download error: ${path}`, error);
    return null;
  }
}

/**
 * Replace an image in Supabase storage with a compressed version
 */
export async function replaceImageInStorage(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<boolean> {
  try {
    // First, delete the old file
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (deleteError) {
      console.error(`[ImageLifecycle] Failed to delete old file: ${path}`, deleteError);
      // Continue anyway - try to upload
    }

    // Upload the new compressed file with the same path
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[ImageLifecycle] Failed to upload compressed file: ${path}`, uploadError);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[ImageLifecycle] Replace error: ${path}`, error);
    return false;
  }
}

/**
 * Delete an image from Supabase storage
 */
export async function deleteImageFromStorage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      console.error(`[ImageLifecycle] Failed to delete: ${path}`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[ImageLifecycle] Delete error: ${path}`, error);
    return false;
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

