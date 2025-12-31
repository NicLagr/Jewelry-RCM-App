"use client";

import imageCompression from "browser-image-compression";

export interface ClientCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const DEFAULT_OPTIONS: ClientCompressionOptions = {
  maxSizeMB: 1, // Target 1MB max (server will compress further)
  maxWidthOrHeight: 2048, // Pre-resize large images
  useWebWorker: true, // Use web worker for better performance
};

/**
 * Client-side image compression for faster uploads
 * 
 * This provides a first pass of compression in the browser:
 * - Reduces 3-5MB phone photos to ~1MB
 * - Speeds up upload time significantly
 * - Server will do final optimization with Sharp
 * 
 * Benefits of hybrid approach:
 * - Faster uploads (less data to transfer)
 * - Better user experience (quicker feedback)
 * - Server ensures consistent quality output
 */
export async function compressImageClient(
  file: File,
  options: ClientCompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for already small files
  if (file.size < 500 * 1024) {
    console.log(`[Client Compression] Skipping small file: ${(file.size / 1024).toFixed(0)}KB`);
    return file;
  }

  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    console.log(`[Client Compression] Starting: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    
    const compressedFile = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB!,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      useWebWorker: opts.useWebWorker!,
      fileType: "image/jpeg", // Convert to JPEG for consistent handling
    });

    const ratio = file.size / compressedFile.size;
    console.log(
      `[Client Compression] Done: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB (${ratio.toFixed(1)}x reduction)`
    );

    return compressedFile;
  } catch (error) {
    console.warn("[Client Compression] Failed, using original:", error);
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

