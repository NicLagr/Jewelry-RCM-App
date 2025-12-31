import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Storage bucket name for job photos
export const STORAGE_BUCKET = "job-photos";

// Lazy-initialized Supabase client
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// For backwards compatibility - lazy getter
export const supabase = {
  get storage() {
    return getSupabaseClient().storage;
  },
};

// Generate a unique filename for uploaded photos
export function generatePhotoFilename(
  jobId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const extension = originalFilename.split(".").pop()?.toLowerCase() || "jpg";
  return `${jobId}/${timestamp}.${extension}`;
}

// Get public URL for a stored photo
export function getPhotoUrl(path: string): string {
  const { data } = getSupabaseClient().storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Extracts the storage path from a full Supabase public URL
 * Example: https://xxx.supabase.co/storage/v1/object/public/job-photos/abc123/1234567890.webp
 * Returns: abc123/1234567890.webp
 */
export function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const pathParts = url.pathname.split(`/object/public/${STORAGE_BUCKET}/`);
    if (pathParts.length === 2) {
      return pathParts[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deletes a file from Supabase storage
 */
export async function deleteStorageFile(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseClient().storage
      .from(STORAGE_BUCKET)
      .remove([path]);
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Downloads a file from Supabase storage
 */
export async function downloadStorageFile(path: string): Promise<{ data: ArrayBuffer | null; error?: string }> {
  try {
    const { data, error } = await getSupabaseClient().storage
      .from(STORAGE_BUCKET)
      .download(path);
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    if (!data) {
      return { data: null, error: "No data returned" };
    }
    
    return { data: await data.arrayBuffer() };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Uploads a file to Supabase storage, replacing if exists
 */
export async function uploadStorageFile(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseClient().storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

