import sharp from "sharp";

/**
 * Image compression configuration
 * Optimized for jewelry photography - needs to preserve detail for prongs, stones, damage
 */
export const COMPRESSION_CONFIG: {
  maxDimension: number;
  webpQuality: number;
  jpegQuality: number;
  maxFileSizeBytes: number;
  minQuality: number;
} = {
  // Maximum dimension for the longest side
  maxDimension: 1920,
  // Target quality for WebP (0-100)
  webpQuality: 80,
  // Target quality for JPEG fallback (0-100)
  jpegQuality: 82,
  // Maximum file size target in bytes (~300KB)
  maxFileSizeBytes: 300 * 1024,
  // Minimum quality to maintain visual clarity
  minQuality: 60,
};

/**
 * Compression result with metadata
 */
export interface CompressionResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Compress an image buffer using Sharp
 * Optimized for jewelry photos - maintains clarity for detail identification
 * 
 * @param inputBuffer - Original image buffer
 * @param originalFilename - Original filename for format detection
 * @returns Compressed image data with metadata
 */
export async function compressImage(
  inputBuffer: Buffer,
  originalFilename: string
): Promise<CompressionResult> {
  const originalSize = inputBuffer.length;
  
  // Get image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const { width: origWidth, height: origHeight, format } = metadata;
  
  if (!origWidth || !origHeight) {
    throw new Error("Could not read image dimensions");
  }
  
  // Calculate new dimensions maintaining aspect ratio
  let newWidth = origWidth;
  let newHeight = origHeight;
  
  if (origWidth > COMPRESSION_CONFIG.maxDimension || origHeight > COMPRESSION_CONFIG.maxDimension) {
    if (origWidth > origHeight) {
      newWidth = COMPRESSION_CONFIG.maxDimension;
      newHeight = Math.round((origHeight / origWidth) * COMPRESSION_CONFIG.maxDimension);
    } else {
      newHeight = COMPRESSION_CONFIG.maxDimension;
      newWidth = Math.round((origWidth / origHeight) * COMPRESSION_CONFIG.maxDimension);
    }
  }
  
  // Try WebP first (best compression with quality)
  let result = await compressToFormat(inputBuffer, newWidth, newHeight, "webp", COMPRESSION_CONFIG.webpQuality);
  
  // If still too large, progressively reduce quality
  let quality = COMPRESSION_CONFIG.webpQuality;
  while (result.length > COMPRESSION_CONFIG.maxFileSizeBytes && quality > COMPRESSION_CONFIG.minQuality) {
    quality -= 5;
    result = await compressToFormat(inputBuffer, newWidth, newHeight, "webp", quality);
  }
  
  // If WebP still too large or not supported, try JPEG
  if (result.length > COMPRESSION_CONFIG.maxFileSizeBytes) {
    quality = COMPRESSION_CONFIG.jpegQuality;
    result = await compressToFormat(inputBuffer, newWidth, newHeight, "jpeg", quality);
    
    while (result.length > COMPRESSION_CONFIG.maxFileSizeBytes && quality > COMPRESSION_CONFIG.minQuality) {
      quality -= 5;
      result = await compressToFormat(inputBuffer, newWidth, newHeight, "jpeg", quality);
    }
    
    // Final check - if JPEG is smaller, use it
    const webpResult = await compressToFormat(inputBuffer, newWidth, newHeight, "webp", COMPRESSION_CONFIG.minQuality);
    if (webpResult.length < result.length) {
      return {
        buffer: webpResult,
        contentType: "image/webp",
        extension: "webp",
        originalSize,
        compressedSize: webpResult.length,
        width: newWidth,
        height: newHeight,
      };
    }
    
    return {
      buffer: result,
      contentType: "image/jpeg",
      extension: "jpg",
      originalSize,
      compressedSize: result.length,
      width: newWidth,
      height: newHeight,
    };
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
    return pipeline.webp({ quality, effort: 4 }).toBuffer();
  } else {
    return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  }
}

/**
 * Generate a compressed filename with new extension
 */
export function generateCompressedFilename(
  jobId: string,
  extension: string
): string {
  const timestamp = Date.now();
  return `${jobId}/${timestamp}.${extension}`;
}

/**
 * Check if image needs compression based on size
 * Skip compression for already small images
 */
export function needsCompression(fileSize: number): boolean {
  // If already under 200KB, skip compression
  return fileSize > 200 * 1024;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

