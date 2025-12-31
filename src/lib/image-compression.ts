import sharp from "sharp";

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg";
}

export interface CompressionResult {
  buffer: Buffer;
  contentType: string;
  extension: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,
  format: "webp",
};

/**
 * Compresses an image buffer for optimal storage while maintaining visual clarity.
 * Designed for jewelry photography where detail preservation is critical.
 * 
 * Target: ~100-300KB per image from 3-5MB phone camera images
 * - Preserves aspect ratio
 * - Resizes to max 1920px on longest side
 * - Converts to WebP (with JPEG fallback)
 * - Quality set to 80% for good detail retention
 */
export async function compressImage(
  inputBuffer: Buffer,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = inputBuffer.length;

  // Get image metadata
  const metadata = await sharp(inputBuffer).metadata();
  
  // Calculate resize dimensions while preserving aspect ratio
  let resizeOptions: { width?: number; height?: number } = {};
  
  if (metadata.width && metadata.height) {
    const aspectRatio = metadata.width / metadata.height;
    
    if (metadata.width > metadata.height) {
      // Landscape: constrain by width
      if (metadata.width > opts.maxWidth!) {
        resizeOptions.width = opts.maxWidth;
      }
    } else {
      // Portrait or square: constrain by height
      if (metadata.height > opts.maxHeight!) {
        resizeOptions.height = opts.maxHeight;
      }
    }
  }

  // Process the image
  let sharpInstance = sharp(inputBuffer);
  
  // Resize if needed
  if (resizeOptions.width || resizeOptions.height) {
    sharpInstance = sharpInstance.resize({
      ...resizeOptions,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to target format
  let buffer: Buffer;
  let contentType: string;
  let extension: string;

  if (opts.format === "webp") {
    buffer = await sharpInstance
      .webp({ quality: opts.quality, effort: 4 })
      .toBuffer();
    contentType = "image/webp";
    extension = "webp";
  } else {
    buffer = await sharpInstance
      .jpeg({ quality: opts.quality, mozjpeg: true })
      .toBuffer();
    contentType = "image/jpeg";
    extension = "jpg";
  }

  const compressedSize = buffer.length;
  const compressionRatio = originalSize / compressedSize;

  return {
    buffer,
    contentType,
    extension,
    originalSize,
    compressedSize,
    compressionRatio,
  };
}

/**
 * Compresses an image more aggressively for archival storage.
 * Used for images older than 6 months where space savings take priority.
 * 
 * Target: ~30-50KB per image
 * - Reduces to 800px max dimension
 * - Quality reduced to 60%
 * - Always uses WebP for best compression
 */
export async function compressImageForArchive(
  inputBuffer: Buffer
): Promise<CompressionResult> {
  return compressImage(inputBuffer, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 60,
    format: "webp",
  });
}

/**
 * Creates a tiny thumbnail for minimal storage.
 * Used when keeping a visual reference but maximizing space savings.
 * 
 * Target: ~5-15KB per image
 */
export async function createThumbnail(
  inputBuffer: Buffer
): Promise<CompressionResult> {
  return compressImage(inputBuffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 50,
    format: "webp",
  });
}

/**
 * Validates if a file is an image that can be processed
 */
export function isProcessableImage(mimeType: string): boolean {
  const supportedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
  ];
  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * Formats file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

